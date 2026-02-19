"""
Google & Microsoft OAuth 2.0 login routes.
Restricted to allowlisted emails only.
"""
import os
import json
import secrets
import requests as http_requests
from flask import Blueprint, redirect, request, current_app, session, url_for, jsonify
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash
from models import db, User, ActivityLog
from urllib.parse import urlencode

oauth_bp = Blueprint('oauth', __name__)

# ── Allowed emails → role mapping ─────────────────────────────────────
# This is loaded from ALLOWED_OAUTH_EMAILS env var or defaults to empty
# Format in .env: email1:role1,email2:role2,...
def get_allowed_emails():
    """Load allowed OAuth emails from env. Returns dict {email: role}."""
    raw = os.getenv('ALLOWED_OAUTH_EMAILS', '')
    if not raw:
        return {}
    mapping = {}
    for entry in raw.split(','):
        entry = entry.strip()
        if ':' in entry:
            email, role = entry.split(':', 1)
            mapping[email.strip().lower()] = role.strip().lower()
    return mapping

# ══════════════════════════════════════════════════════════════════════
#  GOOGLE OAUTH
# ══════════════════════════════════════════════════════════════════════

def get_google_provider_cfg():
    """Fetch Google's OpenID Connect discovery document."""
    try:
        r = http_requests.get(current_app.config['GOOGLE_DISCOVERY_URL'], timeout=10)
        return r.json()
    except Exception:
        return None

@oauth_bp.route('/google', methods=['GET'])
def google_login():
    """Step 1: Redirect user to Google consent screen."""
    client_id = current_app.config['GOOGLE_CLIENT_ID']
    if not client_id:
        return jsonify({'error': 'Google OAuth not configured'}), 503

    # Generate state token for CSRF protection
    state = secrets.token_urlsafe(32)
    session['oauth_state'] = state

    google_cfg = get_google_provider_cfg()
    if not google_cfg:
        return jsonify({'error': 'Could not fetch Google configuration'}), 503

    authorization_endpoint = google_cfg['authorization_endpoint']

    params = {
        'client_id': client_id,
        'redirect_uri': request.host_url.rstrip('/') + '/api/auth/google/callback',
        'response_type': 'code',
        'scope': 'openid email profile',
        'state': state,
        'prompt': 'select_account',
    }

    return redirect(f"{authorization_endpoint}?{urlencode(params)}")


@oauth_bp.route('/google/callback', methods=['GET'])
def google_callback():
    """Step 2: Handle Google's redirect with auth code."""
    code = request.args.get('code')
    state = request.args.get('state')
    frontend_url = current_app.config['FRONTEND_URL']

    # Verify state
    if not state or state != session.pop('oauth_state', None):
        return redirect(f"{frontend_url}/login?error=invalid_state")

    if not code:
        return redirect(f"{frontend_url}/login?error=no_code")

    google_cfg = get_google_provider_cfg()
    if not google_cfg:
        return redirect(f"{frontend_url}/login?error=google_config_failed")

    # Exchange code for tokens
    token_endpoint = google_cfg['token_endpoint']
    token_response = http_requests.post(
        token_endpoint,
        data={
            'code': code,
            'client_id': current_app.config['GOOGLE_CLIENT_ID'],
            'client_secret': current_app.config['GOOGLE_CLIENT_SECRET'],
            'redirect_uri': request.host_url.rstrip('/') + '/api/auth/google/callback',
            'grant_type': 'authorization_code',
        },
        timeout=10,
    )

    if not token_response.ok:
        return redirect(f"{frontend_url}/login?error=token_exchange_failed")

    tokens = token_response.json()

    # Get user info
    userinfo_endpoint = google_cfg['userinfo_endpoint']
    userinfo_response = http_requests.get(
        userinfo_endpoint,
        headers={'Authorization': f"Bearer {tokens['access_token']}"},
        timeout=10,
    )

    if not userinfo_response.ok:
        return redirect(f"{frontend_url}/login?error=userinfo_failed")

    userinfo = userinfo_response.json()
    email = userinfo.get('email', '').lower()
    name = userinfo.get('name', email.split('@')[0])

    if not userinfo.get('email_verified', False):
        return redirect(f"{frontend_url}/login?error=email_not_verified")

    # Process the OAuth user
    return _process_oauth_user(email, name, 'google', frontend_url)


# ══════════════════════════════════════════════════════════════════════
#  MICROSOFT OAUTH
# ══════════════════════════════════════════════════════════════════════

MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
MICROSOFT_USERINFO_URL = 'https://graph.microsoft.com/v1.0/me'

@oauth_bp.route('/microsoft', methods=['GET'])
def microsoft_login():
    """Step 1: Redirect user to Microsoft consent screen."""
    client_id = current_app.config['MICROSOFT_CLIENT_ID']
    if not client_id:
        return jsonify({'error': 'Microsoft OAuth not configured'}), 503

    state = secrets.token_urlsafe(32)
    session['oauth_state_ms'] = state

    params = {
        'client_id': client_id,
        'redirect_uri': request.host_url.rstrip('/') + '/api/auth/microsoft/callback',
        'response_type': 'code',
        'scope': 'openid email profile User.Read',
        'state': state,
        'prompt': 'select_account',
    }

    return redirect(f"{MICROSOFT_AUTH_URL}?{urlencode(params)}")


@oauth_bp.route('/microsoft/callback', methods=['GET'])
def microsoft_callback():
    """Step 2: Handle Microsoft's redirect with auth code."""
    code = request.args.get('code')
    state = request.args.get('state')
    frontend_url = current_app.config['FRONTEND_URL']

    if not state or state != session.pop('oauth_state_ms', None):
        return redirect(f"{frontend_url}/login?error=invalid_state")

    if not code:
        return redirect(f"{frontend_url}/login?error=no_code")

    # Exchange code for tokens
    token_response = http_requests.post(
        MICROSOFT_TOKEN_URL,
        data={
            'code': code,
            'client_id': current_app.config['MICROSOFT_CLIENT_ID'],
            'client_secret': current_app.config['MICROSOFT_CLIENT_SECRET'],
            'redirect_uri': request.host_url.rstrip('/') + '/api/auth/microsoft/callback',
            'grant_type': 'authorization_code',
            'scope': 'openid email profile User.Read',
        },
        timeout=10,
    )

    if not token_response.ok:
        return redirect(f"{frontend_url}/login?error=token_exchange_failed")

    tokens = token_response.json()

    # Get user info from Microsoft Graph
    userinfo_response = http_requests.get(
        MICROSOFT_USERINFO_URL,
        headers={'Authorization': f"Bearer {tokens['access_token']}"},
        timeout=10,
    )

    if not userinfo_response.ok:
        return redirect(f"{frontend_url}/login?error=userinfo_failed")

    userinfo = userinfo_response.json()
    email = (userinfo.get('mail') or userinfo.get('userPrincipalName', '')).lower()
    name = userinfo.get('displayName', email.split('@')[0])

    if not email:
        return redirect(f"{frontend_url}/login?error=no_email")

    return _process_oauth_user(email, name, 'microsoft', frontend_url)


# ══════════════════════════════════════════════════════════════════════
#  SHARED: Process OAuth user (allowlist check, create/find, JWT)
# ══════════════════════════════════════════════════════════════════════

def _process_oauth_user(email: str, name: str, provider: str, frontend_url: str):
    """
    Check if email is allowed, create user if needed, issue JWT,
    redirect to frontend with token.
    """
    allowed = get_allowed_emails()

    # Check allowlist
    if allowed and email not in allowed:
        return redirect(f"{frontend_url}/login?error=email_not_allowed")

    role = allowed.get(email, 'faculty')  # default to faculty if no mapping

    # Find or create user
    user = User.query.filter_by(email=email).first()
    if not user:
        user = User(
            name=name,
            email=email,
            password_hash=generate_password_hash(secrets.token_urlsafe(32)),  # random pw for OAuth users
            role=role,
            department=None,
            is_active=True,
        )
        db.session.add(user)
        db.session.flush()

        log = ActivityLog(
            user_id=user.id, action='oauth_signup', entity_type='user',
            entity_id=user.id, details=f'{name} signed up via {provider}'
        )
        db.session.add(log)
    else:
        # Update name if changed
        if user.name != name:
            user.name = name

    if not user.is_active:
        return redirect(f"{frontend_url}/login?error=account_disabled")

    # Log the login
    log = ActivityLog(
        user_id=user.id, action='oauth_login', entity_type='user',
        entity_id=user.id, details=f'{user.name} logged in via {provider}'
    )
    db.session.add(log)
    db.session.commit()

    # Create JWT
    token = create_access_token(identity=str(user.id))

    # Redirect to frontend with token
    return redirect(f"{frontend_url}/oauth-callback?token={token}")

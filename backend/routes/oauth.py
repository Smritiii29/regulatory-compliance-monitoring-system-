import os
import secrets
import requests as http_requests
from flask import Blueprint, redirect, request, current_app, session
from flask_jwt_extended import create_access_token
from models import db, User
from urllib.parse import urlencode

oauth_bp = Blueprint('oauth', __name__)

# ─────────────────────────────────────────────────────────────
# GOOGLE OAUTH
# ─────────────────────────────────────────────────────────────

def get_google_provider_cfg():
    try:
        r = http_requests.get(current_app.config['GOOGLE_DISCOVERY_URL'], timeout=10)
        return r.json()
    except Exception:
        return None


@oauth_bp.route('/google', methods=['GET'])
def google_login():
    client_id = current_app.config['GOOGLE_CLIENT_ID']

    state = secrets.token_urlsafe(32)
    session['oauth_state'] = state

    google_cfg = get_google_provider_cfg()
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
    code = request.args.get('code')
    state = request.args.get('state')
    frontend_url = current_app.config['FRONTEND_URL']

    # CSRF protection
    if not state or state != session.pop('oauth_state', None):
        return redirect(f"{frontend_url}/login?error=invalid_state")

    google_cfg = get_google_provider_cfg()

    # Exchange code for token
    token_response = http_requests.post(
        google_cfg['token_endpoint'],
        data={
            'code': code,
            'client_id': current_app.config['GOOGLE_CLIENT_ID'],
            'client_secret': current_app.config['GOOGLE_CLIENT_SECRET'],
            'redirect_uri': request.host_url.rstrip('/') + '/api/auth/google/callback',
            'grant_type': 'authorization_code',
        },
        timeout=10,
    )

    tokens = token_response.json()

    # Get user info
    userinfo_response = http_requests.get(
        google_cfg['userinfo_endpoint'],
        headers={'Authorization': f"Bearer {tokens['access_token']}"},
        timeout=10,
    )

    userinfo = userinfo_response.json()

    email = userinfo.get('email', '').lower()
    name = userinfo.get('name', email.split('@')[0])

    if not userinfo.get('email_verified', False):
        return redirect(f"{frontend_url}/login?error=email_not_verified")

    return process_user(email, name, frontend_url)


# ─────────────────────────────────────────────────────────────
# CORE USER PROCESSING
# ─────────────────────────────────────────────────────────────

def process_user(email, name, frontend_url):

    # 🔥 ONLY allow existing users
    user = User.query.filter_by(email=email).first()

    if not user:
        return redirect(f"{frontend_url}/login?error=not_registered")

    if not user.is_active:
        return redirect(f"{frontend_url}/login?error=account_disabled")

    # Optional: update name
    if user.name != name:
        user.name = name
        db.session.commit()

    # Create JWT token
    token = create_access_token(identity=str(user.id))

    return redirect(f"{frontend_url}/oauth-callback?token={token}")
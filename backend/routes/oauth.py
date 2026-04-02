import secrets
from urllib.parse import urlencode

import requests as http_requests
from flask import Blueprint, current_app, redirect, request, session
from flask_jwt_extended import create_access_token

from models import User, db

oauth_bp = Blueprint('oauth', __name__)

GOOGLE_STATE_KEY = 'google_oauth_state'
MICROSOFT_STATE_KEY = 'microsoft_oauth_state'
MICROSOFT_AUTHORITY = 'https://login.microsoftonline.com/common/oauth2/v2.0'
MICROSOFT_AUTHORIZATION_URL = f'{MICROSOFT_AUTHORITY}/authorize'
MICROSOFT_TOKEN_URL = f'{MICROSOFT_AUTHORITY}/token'
MICROSOFT_PROFILE_URL = 'https://graph.microsoft.com/v1.0/me'
VALID_ROLES = {'admin', 'principal', 'hod', 'faculty'}


def frontend_login_redirect(error: str):
    frontend_url = current_app.config['FRONTEND_URL']
    return redirect(f'{frontend_url}/login?error={error}')


def get_google_provider_cfg():
    try:
        response = http_requests.get(current_app.config['GOOGLE_DISCOVERY_URL'], timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception:
        return None


def get_redirect_uri(provider: str) -> str:
    return request.host_url.rstrip('/') + f'/api/auth/{provider}/callback'


def get_allowed_oauth_entry(email: str) -> dict | None:
    email = (email or '').lower()
    authorized_accounts = current_app.config.get('AUTHORIZED_LOGIN_USER_MAP', {})
    if email in authorized_accounts:
        account = authorized_accounts[email]
        return {
            'role': account.get('role'),
            'department': account.get('department'),
        }

    mapping = current_app.config.get('ALLOWED_OAUTH_EMAIL_MAP', {})
    return mapping.get(email)


def process_user(email: str, name: str, frontend_url: str):
    email = (email or '').strip().lower()
    if not email:
        return redirect(f'{frontend_url}/login?error=no_email')

    allowed_entry = get_allowed_oauth_entry(email)
    if not allowed_entry:
        return redirect(f'{frontend_url}/login?error=email_not_allowed')

    role = allowed_entry.get('role')
    department = allowed_entry.get('department')

    if role not in VALID_ROLES:
        return redirect(f'{frontend_url}/login?error=email_not_allowed')

    user = User.query.filter_by(email=email).first()
    if user:
        if not user.is_active:
            return redirect(f'{frontend_url}/login?error=account_disabled')

        user.name = name or user.name or email.split('@')[0]
        user.role = role
        if department or not user.department:
            user.department = department
        user.is_verified = True
    else:
        user = User(
            name=name or email.split('@')[0],
            email=email,
            role=role,
            department=department,
            is_active=True,
            is_verified=True,
        )
        db.session.add(user)

    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return redirect(f'{frontend_url}/oauth-callback?token={token}')


@oauth_bp.route('/google', methods=['GET'])
def google_login():
    client_id = current_app.config['GOOGLE_CLIENT_ID']
    google_cfg = get_google_provider_cfg()

    if not client_id or not google_cfg or 'authorization_endpoint' not in google_cfg:
        return frontend_login_redirect('google_config_failed')

    state = secrets.token_urlsafe(32)
    session[GOOGLE_STATE_KEY] = state

    params = {
        'client_id': client_id,
        'redirect_uri': get_redirect_uri('google'),
        'response_type': 'code',
        'scope': 'openid email profile',
        'state': state,
        'prompt': 'select_account',
    }

    return redirect(f"{google_cfg['authorization_endpoint']}?{urlencode(params)}")


@oauth_bp.route('/google/callback', methods=['GET'])
def google_callback():
    code = request.args.get('code')
    state = request.args.get('state')
    frontend_url = current_app.config['FRONTEND_URL']

    if not code:
        return redirect(f'{frontend_url}/login?error=no_code')

    if not state or state != session.pop(GOOGLE_STATE_KEY, None):
        return redirect(f'{frontend_url}/login?error=invalid_state')

    google_cfg = get_google_provider_cfg()
    if not google_cfg:
        return redirect(f'{frontend_url}/login?error=google_config_failed')

    try:
        token_response = http_requests.post(
            google_cfg['token_endpoint'],
            data={
                'code': code,
                'client_id': current_app.config['GOOGLE_CLIENT_ID'],
                'client_secret': current_app.config['GOOGLE_CLIENT_SECRET'],
                'redirect_uri': get_redirect_uri('google'),
                'grant_type': 'authorization_code',
            },
            timeout=10,
        )
        token_response.raise_for_status()
        tokens = token_response.json()
    except Exception:
        return redirect(f'{frontend_url}/login?error=token_exchange_failed')

    access_token = tokens.get('access_token')
    if not access_token:
        return redirect(f'{frontend_url}/login?error=token_exchange_failed')

    try:
        userinfo_response = http_requests.get(
            google_cfg['userinfo_endpoint'],
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=10,
        )
        userinfo_response.raise_for_status()
        userinfo = userinfo_response.json()
    except Exception:
        return redirect(f'{frontend_url}/login?error=userinfo_failed')

    email = userinfo.get('email', '').lower()
    name = userinfo.get('name', email.split('@')[0] if email else '')

    if not userinfo.get('email_verified', False):
        return redirect(f'{frontend_url}/login?error=email_not_verified')

    return process_user(email, name, frontend_url)


@oauth_bp.route('/microsoft', methods=['GET'])
def microsoft_login():
    client_id = current_app.config['MICROSOFT_CLIENT_ID']
    if not client_id:
        return frontend_login_redirect('microsoft_config_failed')

    state = secrets.token_urlsafe(32)
    session[MICROSOFT_STATE_KEY] = state

    params = {
        'client_id': client_id,
        'redirect_uri': get_redirect_uri('microsoft'),
        'response_type': 'code',
        'response_mode': 'query',
        'scope': 'openid profile email User.Read',
        'state': state,
        'prompt': 'select_account',
    }

    return redirect(f'{MICROSOFT_AUTHORIZATION_URL}?{urlencode(params)}')


@oauth_bp.route('/microsoft/callback', methods=['GET'])
def microsoft_callback():
    code = request.args.get('code')
    state = request.args.get('state')
    frontend_url = current_app.config['FRONTEND_URL']

    if request.args.get('error'):
        return redirect(f'{frontend_url}/login?error=no_code')

    if not code:
        return redirect(f'{frontend_url}/login?error=no_code')

    if not state or state != session.pop(MICROSOFT_STATE_KEY, None):
        return redirect(f'{frontend_url}/login?error=invalid_state')

    try:
        token_response = http_requests.post(
            MICROSOFT_TOKEN_URL,
            data={
                'client_id': current_app.config['MICROSOFT_CLIENT_ID'],
                'client_secret': current_app.config['MICROSOFT_CLIENT_SECRET'],
                'code': code,
                'redirect_uri': get_redirect_uri('microsoft'),
                'grant_type': 'authorization_code',
                'scope': 'openid profile email User.Read',
            },
            timeout=10,
        )
        token_response.raise_for_status()
        tokens = token_response.json()
    except Exception:
        return redirect(f'{frontend_url}/login?error=token_exchange_failed')

    access_token = tokens.get('access_token')
    if not access_token:
        return redirect(f'{frontend_url}/login?error=token_exchange_failed')

    try:
        profile_response = http_requests.get(
            MICROSOFT_PROFILE_URL,
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=10,
        )
        profile_response.raise_for_status()
        profile = profile_response.json()
    except Exception:
        return redirect(f'{frontend_url}/login?error=userinfo_failed')

    email = (profile.get('mail') or profile.get('userPrincipalName') or '').lower()
    name = profile.get('displayName') or (email.split('@')[0] if email else '')

    return process_user(email, name, frontend_url)

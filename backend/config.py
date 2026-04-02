import os
from dotenv import load_dotenv

# Load .env from backend directory
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


def parse_allowed_oauth_emails(raw_value: str) -> dict[str, dict[str, str | None]]:
    mapping: dict[str, dict[str, str | None]] = {}

    for item in raw_value.split(','):
        item = item.strip()
        if not item:
            continue

        parts = [part.strip() for part in item.split(':')]
        if len(parts) < 2:
            continue

        email = parts[0].lower()
        role = parts[1].lower()
        department = parts[2] if len(parts) > 2 and parts[2] else None

        mapping[email] = {
            'role': role,
            'department': department,
        }

    return mapping


def parse_authorized_login_users(raw_value: str) -> dict[str, dict[str, str | None]]:
    mapping: dict[str, dict[str, str | None]] = {}

    for item in raw_value.split(','):
        item = item.strip()
        if not item:
            continue

        parts = [part.strip() for part in item.split(':')]
        if len(parts) < 3:
            continue

        email = parts[0].lower()
        role = parts[1].lower()
        password = parts[2]
        department = parts[3] if len(parts) > 3 and parts[3] else None

        mapping[email] = {
            'role': role,
            'password': password,
            'department': department,
        }

    return mapping

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'rcms-secret-key-change-in-production')
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        f"sqlite:///{os.path.join(BASE_DIR, 'rcms.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB
    ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg'}

    # Google OAuth 2.0
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')
    GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '')
    GOOGLE_DISCOVERY_URL = 'https://accounts.google.com/.well-known/openid-configuration'

    # Microsoft OAuth 2.0
    MICROSOFT_CLIENT_ID = os.getenv('MICROSOFT_CLIENT_ID', '')
    MICROSOFT_CLIENT_SECRET = os.getenv('MICROSOFT_CLIENT_SECRET', '')

    # Email / SMTP
    MAIL_SENDER_EMAIL = os.getenv('MAIL_SENDER_EMAIL', '')
    MAIL_SENDER_PASSWORD = os.getenv('MAIL_SENDER_PASSWORD', '')

    # Frontend URL (for OAuth redirect)
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:8080')

    # Allowed OAuth emails
    ALLOWED_OAUTH_EMAILS = os.getenv('ALLOWED_OAUTH_EMAILS', '')
    ALLOWED_OAUTH_EMAIL_MAP = parse_allowed_oauth_emails(ALLOWED_OAUTH_EMAILS)

    # Password-authenticated accounts allowed to sign in
    AUTHORIZED_LOGIN_USERS = os.getenv('AUTHORIZED_LOGIN_USERS', '')
    AUTHORIZED_LOGIN_USER_MAP = parse_authorized_login_users(AUTHORIZED_LOGIN_USERS)

    # Gemini AI Configuration
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
    GEMINI_MODEL = 'gemini-2.5-flash'  # Latest stable model with good free tier support
    GEMINI_MAX_TOKENS = 8192
    GEMINI_TEMPERATURE = 0.1

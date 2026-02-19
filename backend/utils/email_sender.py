"""
Email utilities – SMTP via Gmail + OTP generation / verification.
Uses MAIL_SENDER_EMAIL + MAIL_SENDER_PASSWORD from environment.
"""
import os
import random
import smtplib
import threading
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta

# In-memory OTP store: { email: { 'otp': '123456', 'expires': datetime } }
_otp_store: dict = {}

# ── OTP helpers ───────────────────────────────────────────────────────

def generate_otp(email: str, length: int = 6) -> str:
    """Generate a numeric OTP and store it for 10 minutes."""
    otp = ''.join([str(random.randint(0, 9)) for _ in range(length)])
    _otp_store[email.lower()] = {
        'otp': otp,
        'expires': datetime.utcnow() + timedelta(minutes=10),
    }
    return otp


def verify_otp(email: str, otp: str) -> bool:
    """Check if OTP is valid and not expired. Consumes it on success."""
    entry = _otp_store.get(email.lower())
    if not entry:
        return False
    if datetime.utcnow() > entry['expires']:
        _otp_store.pop(email.lower(), None)
        return False
    if entry['otp'] != otp:
        return False
    _otp_store.pop(email.lower(), None)
    return True


# ── Email sending ────────────────────────────────────────────────────

def _get_smtp_credentials():
    sender = os.getenv('MAIL_SENDER_EMAIL', '')
    password = os.getenv('MAIL_SENDER_PASSWORD', '')
    return sender, password


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an email via Gmail SMTP. Returns True on success."""
    sender, password = _get_smtp_credentials()
    if not sender or not password:
        print(f"[EMAIL] SMTP not configured – skipping email to {to_email}")
        return False

    msg = MIMEMultipart('alternative')
    msg['From'] = f'RCMS <{sender}>'
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(html_body, 'html'))

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465, timeout=10) as server:
            server.login(sender, password)
            server.sendmail(sender, to_email, msg.as_string())
        print(f"[EMAIL] Sent to {to_email}: {subject}")
        return True
    except Exception as e:
        print(f"[EMAIL] Failed to send to {to_email}: {e}")
        return False


def send_email_async(to_email: str, subject: str, html_body: str):
    """Fire-and-forget email in background thread (non-blocking)."""
    t = threading.Thread(target=send_email, args=(to_email, subject, html_body), daemon=True)
    t.start()


# ── Pre-built email templates ────────────────────────────────────────

def send_otp_email(to_email: str, otp: str, name: str = ''):
    """Send OTP verification email."""
    subject = f'RCMS – Your Verification Code: {otp}'
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px;">
        <h2 style="color:#1e3a5f;margin-bottom:8px;">RCMS Email Verification</h2>
        <p>Hello{' ' + name if name else ''},</p>
        <p>Your one-time password (OTP) is:</p>
        <div style="text-align:center;margin:24px 0;">
            <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1e3a5f;background:#f1f5f9;padding:12px 24px;border-radius:8px;">{otp}</span>
        </div>
        <p style="color:#64748b;font-size:14px;">This code expires in <strong>10 minutes</strong>.</p>
        <p style="color:#64748b;font-size:14px;">If you didn't request this, please ignore this email.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
        <p style="color:#94a3b8;font-size:12px;text-align:center;">Regulatory Compliance Monitoring System – SSN College of Engineering</p>
    </div>
    """
    send_email_async(to_email, subject, html)


def send_notification_email(to_email: str, name: str, title: str, message: str):
    """Send a platform notification as email."""
    subject = f'RCMS – {title}'
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px;">
        <h2 style="color:#1e3a5f;margin-bottom:8px;">{title}</h2>
        <p>Hello {name},</p>
        <p>{message}</p>
        <div style="margin:24px 0;text-align:center;">
            <a href="{os.getenv('FRONTEND_URL', 'http://localhost:8080')}/dashboard"
               style="background:#1e3a5f;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
                Open RCMS Dashboard
            </a>
        </div>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
        <p style="color:#94a3b8;font-size:12px;text-align:center;">Regulatory Compliance Monitoring System – SSN College of Engineering</p>
    </div>
    """
    send_email_async(to_email, subject, html)

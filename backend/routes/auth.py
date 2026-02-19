import os
import requests as http_requests
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, ActivityLog, Notification, Submission, ChatMessage
from utils.email_sender import generate_otp, verify_otp, send_otp_email, send_notification_email
from datetime import datetime

auth_bp = Blueprint('auth', __name__)

VALID_ROLES = ['admin', 'principal', 'hod', 'faculty']
DEPARTMENTS = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'BIOMEDICAL', 'MTECH CSE']

# ── Send OTP (before signup) ─────────────────────────────────────────

@auth_bp.route('/send-otp', methods=['POST'])
def send_otp():
    """Send a 6-digit OTP to the given email for verification."""
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    name = data.get('name', '').strip()

    if not email:
        return jsonify({'error': 'Email is required'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409

    otp = generate_otp(email)
    send_otp_email(email, otp, name)

    return jsonify({'message': 'OTP sent to your email. Valid for 10 minutes.'}), 200

# ── Verify OTP ────────────────────────────────────────────────────────

@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp_route():
    """Verify the OTP sent to email."""
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    otp = data.get('otp', '').strip()

    if not email or not otp:
        return jsonify({'error': 'Email and OTP are required'}), 400

    if verify_otp(email, otp):
        return jsonify({'verified': True, 'message': 'OTP verified successfully'}), 200
    else:
        return jsonify({'verified': False, 'error': 'Invalid or expired OTP'}), 400

# ── Verify Google ID Token (for signup flow) ─────────────────────────

@auth_bp.route('/google/verify-token', methods=['POST'])
def google_verify_token():
    """Verify a Google ID token and return email + name (signup step 1)."""
    data = request.get_json()
    id_token = data.get('token', '')

    if not id_token:
        return jsonify({'error': 'Token is required'}), 400

    try:
        resp = http_requests.get(
            f'https://oauth2.googleapis.com/tokeninfo?id_token={id_token}',
            timeout=10,
        )
        if resp.status_code != 200:
            return jsonify({'error': 'Invalid Google token'}), 400

        info = resp.json()
        email = info.get('email', '')
        name = info.get('name', '')
        email_verified = info.get('email_verified', 'false')

        if not email:
            return jsonify({'error': 'No email found in Google account'}), 400

        if email_verified != 'true':
            return jsonify({'error': 'Google email is not verified'}), 400

        # Ensure the token was issued for our own client ID
        aud = info.get('aud', '')
        expected_client_id = current_app.config.get('GOOGLE_CLIENT_ID', '')
        if expected_client_id and aud != expected_client_id:
            return jsonify({'error': 'Token was not issued for this application'}), 400

        # Check if email already exists
        existing = User.query.filter_by(email=email.lower()).first()
        if existing:
            return jsonify({'error': 'Email already registered. Please sign in instead.'}), 409

        return jsonify({'email': email.lower(), 'name': name}), 200
    except Exception as e:
        return jsonify({'error': f'Token verification failed: {str(e)}'}), 400

# ── Signup ────────────────────────────────────────────────────────────

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role = data.get('role', 'faculty').strip().lower()
    department = data.get('department', '').strip()

    if not name or not email or not password:
        return jsonify({'error': 'Name, email and password are required'}), 400
    if role not in VALID_ROLES:
        return jsonify({'error': f'Invalid role. Must be one of: {VALID_ROLES}'}), 400
    if role in ('hod', 'faculty') and not department:
        return jsonify({'error': 'Department is required for HOD and Faculty roles'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409

    user = User(
        name=name,
        email=email,
        password_hash=generate_password_hash(password),
        role=role,
        department=department if department else None,
        is_active=True,
    )
    db.session.add(user)
    db.session.flush()

    log = ActivityLog(user_id=user.id, action='signup', entity_type='user', entity_id=user.id,
                      details=f'{name} registered as {role}')
    db.session.add(log)

    # Notify admins of new registration
    admins = User.query.filter_by(role='admin').all()
    for a in admins:
        n = Notification(user_id=a.id, title='New User Registered',
                         message=f'{name} ({email}) registered as {role}',
                         type='system')
        db.session.add(n)

    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'user': user.to_dict()}), 201

# ── Login ─────────────────────────────────────────────────────────────

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid email or password'}), 401
    if not user.is_verified:
        return jsonify({'error': 'This is a demo account. Please sign up to access the system.'}), 403
    if not user.is_active:
        return jsonify({'error': 'Account is disabled. Contact admin.'}), 403

    log = ActivityLog(user_id=user.id, action='login', entity_type='user',
                      entity_id=user.id, details=f'{user.name} logged in')
    db.session.add(log)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'user': user.to_dict()})

# ── Current user (profile) ───────────────────────────────────────────

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)
    return jsonify(user.to_dict())

# ── Update profile ───────────────────────────────────────────────────

@auth_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_profile():
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)
    data = request.get_json()
    if 'name' in data:
        user.name = data['name'].strip()
    if 'password' in data and data['password']:
        user.password_hash = generate_password_hash(data['password'])
    db.session.commit()
    return jsonify(user.to_dict())

# ── List users (admin/principal/hod) ─────────────────────────────────

@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def list_users():
    uid = int(get_jwt_identity())
    current_user = User.query.get_or_404(uid)

    query = User.query
    role_filter = request.args.get('role')
    dept_filter = request.args.get('department')
    search = request.args.get('search', '').strip()

    if role_filter and role_filter not in ('all_roles', 'all'):
        query = query.filter(User.role == role_filter)
    if dept_filter and dept_filter not in ('all_departments', 'all'):
        query = query.filter(User.department == dept_filter)
    if search:
        pattern = f'%{search}%'
        query = query.filter(
            db.or_(User.name.ilike(pattern), User.email.ilike(pattern),
                   User.department.ilike(pattern), User.role.ilike(pattern))
        )

    # Role-based visibility
    if current_user.role == 'hod':
        query = query.filter(User.department == current_user.department)
    elif current_user.role == 'faculty':
        return jsonify({'error': 'Access denied'}), 403

    users = query.order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users])

# ── Toggle user active status ────────────────────────────────────────

@auth_bp.route('/users/<int:user_id>/toggle', methods=['PUT'])
@jwt_required()
def toggle_user(user_id):
    uid = int(get_jwt_identity())
    current_user = User.query.get_or_404(uid)
    if current_user.role not in ('admin', 'principal'):
        return jsonify({'error': 'Access denied'}), 403

    target = User.query.get_or_404(user_id)
    target.is_active = not target.is_active
    db.session.commit()

    log = ActivityLog(user_id=uid, action='toggle_user', entity_type='user',
                      entity_id=user_id,
                      details=f'{"Enabled" if target.is_active else "Disabled"} {target.name}')
    db.session.add(log)
    db.session.commit()
    return jsonify(target.to_dict())

# ── Delete user ──────────────────────────────────────────────────────

@auth_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    uid = int(get_jwt_identity())
    current_user = User.query.get_or_404(uid)
    if current_user.role not in ('admin', 'principal'):
        return jsonify({'error': 'Access denied'}), 403

    target = User.query.get_or_404(user_id)
    target_name = target.name

    # Clean up related records before deleting user
    Notification.query.filter_by(user_id=user_id).delete()
    ChatMessage.query.filter_by(sender_id=user_id).delete()
    Submission.query.filter(Submission.reviewed_by == user_id).update({Submission.reviewed_by: None})
    Submission.query.filter_by(user_id=user_id).delete()
    ActivityLog.query.filter_by(user_id=user_id).delete()

    db.session.delete(target)
    log = ActivityLog(user_id=uid, action='delete_user', entity_type='user',
                      entity_id=user_id, details=f'Deleted user {target_name}')
    db.session.add(log)
    db.session.commit()
    return jsonify({'message': 'User deleted'})

# ── Create user (admin) ─────────────────────────────────────────────

@auth_bp.route('/users', methods=['POST'])
@jwt_required()
def create_user():
    uid = int(get_jwt_identity())
    current_user = User.query.get_or_404(uid)
    if current_user.role not in ('admin', 'principal', 'hod'):
        return jsonify({'error': 'Access denied'}), 403

    data = request.get_json()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role = data.get('role', 'faculty')
    department = data.get('department', '').strip()

    if not name or not email or not password:
        return jsonify({'error': 'Name, email and password are required'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already exists'}), 409

    user = User(
        name=name, email=email, password_hash=generate_password_hash(password),
        role=role, department=department if department else None, is_active=True,
    )
    db.session.add(user)
    db.session.flush()
    log = ActivityLog(user_id=uid, action='create_user', entity_type='user',
                      entity_id=user.id, details=f'Created user {name} as {role}')
    db.session.add(log)
    db.session.commit()
    return jsonify(user.to_dict()), 201

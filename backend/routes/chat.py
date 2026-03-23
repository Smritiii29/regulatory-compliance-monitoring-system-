import os
import uuid
from flask import Blueprint, request, jsonify, send_from_directory, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from models import db, ChatMessage, User, Notification

chat_bp = Blueprint('chat', __name__)

# Allowed file extensions for chat attachments
CHAT_ALLOWED_EXTENSIONS = {
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv',
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg',
    'mp4', 'avi', 'mkv', 'mov', 'wmv', 'webm',
    'mp3', 'wav', 'ogg', 'flac',
    'zip', 'rar', '7z', 'tar', 'gz',
}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in CHAT_ALLOWED_EXTENSIONS

# ── Chat access rules ────────────────────────────────────────────────
# faculty  → can chat with hod, principal only (NOT admin)
# admin    → can chat with hod, principal only (NOT faculty directly)
# hod      → can chat with everyone
# principal→ can chat with everyone

def can_chat(sender_role: str, receiver_role: str) -> bool:
    """Check if sender_role is allowed to DM receiver_role."""
    if sender_role in ('hod', 'principal'):
        return True  # HOD and Principal can chat with anyone
    if sender_role == 'faculty':
        return receiver_role in ('hod', 'principal')  # faculty → hod/principal only
    if sender_role == 'admin':
        return receiver_role in ('hod', 'principal')  # admin → hod/principal only
    return False

# ── Send message (text or file) ─────────────────────────────────────

@chat_bp.route('', methods=['POST'])
@jwt_required()
def send_message():
    uid = int(get_jwt_identity())
    sender = User.query.get_or_404(uid)

    # Support both JSON and multipart/form-data (for file uploads)
    if request.content_type and 'multipart/form-data' in request.content_type:
        receiver_id = request.form.get('receiver_id', type=int)
        group_name = request.form.get('group_name')
        message = (request.form.get('message') or '').strip()
        file = request.files.get('file')
    else:
        data = request.get_json()
        receiver_id = data.get('receiver_id')
        group_name = data.get('group_name')
        message = data.get('message', '').strip()
        file = None

    if not message and not file:
        return jsonify({'error': 'Message or file is required'}), 400
    if not receiver_id and not group_name:
        return jsonify({'error': 'Specify receiver_id or group_name'}), 400

    # Enforce chat restrictions for direct messages
    if receiver_id:
        receiver = User.query.get_or_404(receiver_id)
        if not can_chat(sender.role, receiver.role):
            return jsonify({'error': f'You cannot directly message a {receiver.role}'}), 403

    message_type = 'text'
    file_path = None
    file_name = None

    # Handle file upload
    if file and file.filename:
        if not allowed_file(file.filename):
            return jsonify({'error': f'File type not allowed. Supported: {", ".join(sorted(CHAT_ALLOWED_EXTENSIONS))}'}), 400
        file_name = secure_filename(file.filename)
        unique_name = f"{uuid.uuid4().hex}_{file_name}"
        upload_dir = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'chat')
        os.makedirs(upload_dir, exist_ok=True)
        file.save(os.path.join(upload_dir, unique_name))
        file_path = f"chat/{unique_name}"
        message_type = 'file'
        if not message:
            message = f"📎 {file_name}"

    msg = ChatMessage(
        sender_id=uid, receiver_id=receiver_id, group_name=group_name,
        message=message, message_type=message_type,
        file_path=file_path, file_name=file_name,
    )
    db.session.add(msg)

    # Create notification for the recipient
    if receiver_id:
        notif = Notification(
            user_id=receiver_id,
            title=f'New message from {sender.name}',
            message=message[:200] if message else f'{sender.name} sent a file',
            type='chat',
        )
        db.session.add(notif)

    db.session.commit()
    return jsonify(msg.to_dict()), 201

# ── Download chat attachment ─────────────────────────────────────────

@chat_bp.route('/download/<int:message_id>', methods=['GET'])
@jwt_required()
def download_attachment(message_id):
    msg = ChatMessage.query.get_or_404(message_id)
    if not msg.file_path:
        return jsonify({'error': 'No file attached'}), 404
    upload_dir = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    # file_path is like "chat/uuid_filename.ext"
    directory = os.path.join(upload_dir, os.path.dirname(msg.file_path))
    filename = os.path.basename(msg.file_path)
    return send_from_directory(directory, filename, as_attachment=True,
                               download_name=msg.file_name or filename)

# ── Get direct messages with a user ──────────────────────────────────

@chat_bp.route('/direct/<int:other_id>', methods=['GET'])
@jwt_required()
def direct_messages(other_id):
    uid = int(get_jwt_identity())
    messages = ChatMessage.query.filter(
        db.or_(
            db.and_(ChatMessage.sender_id == uid, ChatMessage.receiver_id == other_id),
            db.and_(ChatMessage.sender_id == other_id, ChatMessage.receiver_id == uid)
        )
    ).order_by(ChatMessage.created_at.asc()).all()
    return jsonify([m.to_dict() for m in messages])

# ── Get group messages ───────────────────────────────────────────────

@chat_bp.route('/group/<group_name>', methods=['GET'])
@jwt_required()
def group_messages(group_name):
    messages = ChatMessage.query.filter_by(group_name=group_name) \
        .order_by(ChatMessage.created_at.asc()).all()
    return jsonify([m.to_dict() for m in messages])

# ── List available contacts ──────────────────────────────────────────

@chat_bp.route('/contacts', methods=['GET'])
@jwt_required()
def contacts():
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)

    # Only show contacts the user is allowed to chat with
    all_users = User.query.filter(User.id != uid, User.is_active == True).all()

    contacts_list = []
    for u in all_users:
        # Apply chat restriction filter
        if not can_chat(user.role, u.role):
            continue

        # Get last message
        last_msg = ChatMessage.query.filter(
            db.or_(
                db.and_(ChatMessage.sender_id == uid, ChatMessage.receiver_id == u.id),
                db.and_(ChatMessage.sender_id == u.id, ChatMessage.receiver_id == uid)
            )
        ).order_by(ChatMessage.created_at.desc()).first()

        contacts_list.append({
            'id': u.id,
            'name': u.name,
            'role': u.role,
            'department': u.department,
            'last_message': last_msg.message if last_msg else None,
            'last_message_time': last_msg.created_at.isoformat() if last_msg else None,
        })

    # Sort: those with messages first, then alphabetically
    contacts_list.sort(key=lambda c: (c['last_message_time'] is None,
                                       c['last_message_time'] or ''), reverse=True)
    return jsonify(contacts_list)

# ── List groups ──────────────────────────────────────────────────────

@chat_bp.route('/groups', methods=['GET'])
@jwt_required()
def groups():
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)

    groups_list = ['Broadcast']
    if user.department:
        groups_list.append(user.department)
    if user.role in ('admin', 'principal'):
        depts = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'BIOMEDICAL', 'MTECH CSE']
        groups_list.extend([d for d in depts if d not in groups_list])

    result = []
    for g in groups_list:
        last_msg = ChatMessage.query.filter_by(group_name=g) \
            .order_by(ChatMessage.created_at.desc()).first()
        result.append({
            'name': g,
            'last_message': last_msg.message if last_msg else None,
            'last_message_time': last_msg.created_at.isoformat() if last_msg else None,
            'sender_name': last_msg.sender.name if last_msg else None,
        })
    return jsonify(result)

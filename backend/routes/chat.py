import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, send_from_directory, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from models import db, ChatMessage, ChatThreadState, User, Notification

chat_bp = Blueprint('chat', __name__)

DEPARTMENT_GROUPS = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'BIOMEDICAL', 'MTECH CSE']
BROADCAST_GROUP = 'Broadcast'

CHAT_ALLOWED_EXTENSIONS = {
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv',
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg',
    'mp4', 'avi', 'mkv', 'mov', 'wmv', 'webm',
    'mp3', 'wav', 'ogg', 'flac',
    'zip', 'rar', '7z', 'tar', 'gz',
}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in CHAT_ALLOWED_EXTENSIONS


def can_chat(sender_role: str, receiver_role: str) -> bool:
    if sender_role == 'principal':
        return True
    if sender_role == 'admin':
        return receiver_role == 'principal'
    if sender_role == 'hod':
        return receiver_role in ('faculty', 'principal')
    if sender_role == 'faculty':
        return receiver_role in ('faculty', 'hod', 'principal')
    return False


def available_groups_for(user: User) -> list[str]:
    groups_list = [BROADCAST_GROUP]

    if user.role in ('admin', 'principal'):
        groups_list.extend(DEPARTMENT_GROUPS)
    elif user.department:
        groups_list.append(user.department)

    return list(dict.fromkeys(groups_list))


def can_access_group(user: User, group_name: str) -> bool:
    return group_name in available_groups_for(user)


def can_send_to_group(user: User, group_name: str) -> bool:
    if group_name == BROADCAST_GROUP:
        return user.role in ('admin', 'principal')

    if group_name not in DEPARTMENT_GROUPS:
        return False

    if user.role in ('admin', 'principal'):
        return True

    return user.role in ('hod', 'faculty') and user.department == group_name


def get_thread_state(user_id: int, thread_type: str, thread_key: str) -> ChatThreadState | None:
    return ChatThreadState.query.filter_by(
        user_id=user_id,
        thread_type=thread_type,
        thread_key=thread_key,
    ).first()


def mark_thread_read(user_id: int, thread_type: str, thread_key: str):
    state = get_thread_state(user_id, thread_type, thread_key)
    now = datetime.utcnow()

    if state is None:
        state = ChatThreadState(
            user_id=user_id,
            thread_type=thread_type,
            thread_key=thread_key,
            last_read_at=now,
        )
        db.session.add(state)
    else:
        state.last_read_at = now

    db.session.commit()


def unread_direct_count(user_id: int, other_user_id: int) -> int:
    state = get_thread_state(user_id, 'direct', str(other_user_id))
    query = ChatMessage.query.filter(
        ChatMessage.sender_id == other_user_id,
        ChatMessage.receiver_id == user_id,
    )
    if state:
        query = query.filter(ChatMessage.created_at > state.last_read_at)
    return query.count()


def unread_group_count(user_id: int, group_name: str) -> int:
    state = get_thread_state(user_id, 'group', group_name)
    query = ChatMessage.query.filter(
        ChatMessage.group_name == group_name,
        ChatMessage.sender_id != user_id,
    )
    if state:
        query = query.filter(ChatMessage.created_at > state.last_read_at)
    return query.count()


@chat_bp.route('', methods=['POST'])
@jwt_required()
def send_message():
    uid = int(get_jwt_identity())
    sender = User.query.get_or_404(uid)

    if request.content_type and 'multipart/form-data' in request.content_type:
        receiver_id = request.form.get('receiver_id', type=int)
        group_name = request.form.get('group_name')
        message = (request.form.get('message') or '').strip()
        file = request.files.get('file')
    else:
        data = request.get_json() or {}
        receiver_id = data.get('receiver_id')
        group_name = data.get('group_name')
        message = (data.get('message') or '').strip()
        file = None

    if not message and not file:
        return jsonify({'error': 'Message or file is required'}), 400
    if not receiver_id and not group_name:
        return jsonify({'error': 'Specify receiver_id or group_name'}), 400
    if receiver_id and group_name:
        return jsonify({'error': 'Use either receiver_id or group_name, not both'}), 400

    if receiver_id:
        receiver = User.query.get_or_404(receiver_id)
        if not can_chat(sender.role, receiver.role):
            return jsonify({'error': f'You cannot directly message a {receiver.role}'}), 403
    else:
        if not can_access_group(sender, group_name):
            return jsonify({'error': f'You do not have access to the {group_name} group'}), 403
        if not can_send_to_group(sender, group_name):
            return jsonify({'error': f'You cannot send messages to the {group_name} group'}), 403

    message_type = 'text'
    file_path = None
    file_name = None

    if file and file.filename:
        if not allowed_file(file.filename):
            return jsonify({
                'error': f'File type not allowed. Supported: {", ".join(sorted(CHAT_ALLOWED_EXTENSIONS))}'
            }), 400
        file_name = secure_filename(file.filename)
        unique_name = f"{uuid.uuid4().hex}_{file_name}"
        upload_dir = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'chat')
        os.makedirs(upload_dir, exist_ok=True)
        file.save(os.path.join(upload_dir, unique_name))
        file_path = f"chat/{unique_name}"
        message_type = 'file'
        if not message:
            message = f"Attachment: {file_name}"

    msg = ChatMessage(
        sender_id=uid,
        receiver_id=receiver_id,
        group_name=group_name,
        message=message,
        message_type=message_type,
        file_path=file_path,
        file_name=file_name,
    )
    db.session.add(msg)

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


@chat_bp.route('/download/<int:message_id>', methods=['GET'])
@jwt_required()
def download_attachment(message_id):
    uid = int(get_jwt_identity())
    current_user = User.query.get_or_404(uid)
    msg = ChatMessage.query.get_or_404(message_id)

    if not msg.file_path:
        return jsonify({'error': 'No file attached'}), 404

    if msg.receiver_id:
        other_user_id = msg.receiver_id if msg.sender_id == uid else msg.sender_id
        other_user = User.query.get(other_user_id) if other_user_id else None
        if not other_user or not (can_chat(current_user.role, other_user.role) or can_chat(other_user.role, current_user.role)):
            return jsonify({'error': 'Access denied'}), 403
    else:
        if not msg.group_name or not can_access_group(current_user, msg.group_name):
            return jsonify({'error': 'Access denied'}), 403

    upload_dir = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    directory = os.path.join(upload_dir, os.path.dirname(msg.file_path))
    filename = os.path.basename(msg.file_path)
    return send_from_directory(directory, filename, as_attachment=True, download_name=msg.file_name or filename)


@chat_bp.route('/direct/<int:other_id>', methods=['GET'])
@jwt_required()
def direct_messages(other_id):
    uid = int(get_jwt_identity())
    current_user = User.query.get_or_404(uid)
    other_user = User.query.get_or_404(other_id)

    if not (can_chat(current_user.role, other_user.role) or can_chat(other_user.role, current_user.role)):
        return jsonify({'error': 'Access denied'}), 403

    messages = ChatMessage.query.filter(
        db.or_(
            db.and_(ChatMessage.sender_id == uid, ChatMessage.receiver_id == other_id),
            db.and_(ChatMessage.sender_id == other_id, ChatMessage.receiver_id == uid)
        )
    ).order_by(ChatMessage.created_at.asc()).all()

    mark_thread_read(uid, 'direct', str(other_id))
    return jsonify([m.to_dict() for m in messages])


@chat_bp.route('/group/<group_name>', methods=['GET'])
@jwt_required()
def group_messages(group_name):
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)

    if not can_access_group(user, group_name):
        return jsonify({'error': 'Access denied'}), 403

    messages = ChatMessage.query.filter_by(group_name=group_name).order_by(ChatMessage.created_at.asc()).all()

    mark_thread_read(uid, 'group', group_name)
    return jsonify([m.to_dict() for m in messages])


@chat_bp.route('/contacts', methods=['GET'])
@jwt_required()
def contacts():
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)

    all_users = User.query.filter(User.id != uid, User.is_active == True).all()

    contacts_list = []
    for other in all_users:
        if not can_chat(user.role, other.role):
            continue

        last_msg = ChatMessage.query.filter(
            db.or_(
                db.and_(ChatMessage.sender_id == uid, ChatMessage.receiver_id == other.id),
                db.and_(ChatMessage.sender_id == other.id, ChatMessage.receiver_id == uid)
            )
        ).order_by(ChatMessage.created_at.desc()).first()

        contacts_list.append({
            'id': other.id,
            'name': other.name,
            'role': other.role,
            'department': other.department,
            'last_message': last_msg.message if last_msg else None,
            'last_message_time': last_msg.created_at.isoformat() if last_msg else None,
            'unread_count': unread_direct_count(uid, other.id),
        })

    contacts_list.sort(
        key=lambda contact: (
            contact['unread_count'] == 0,
            contact['last_message_time'] is None,
            contact['last_message_time'] or ''
        ),
        reverse=False
    )
    return jsonify(contacts_list)


@chat_bp.route('/groups', methods=['GET'])
@jwt_required()
def groups():
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)

    result = []
    for group_name in available_groups_for(user):
        last_msg = ChatMessage.query.filter_by(group_name=group_name).order_by(ChatMessage.created_at.desc()).first()
        result.append({
            'name': group_name,
            'last_message': last_msg.message if last_msg else None,
            'last_message_time': last_msg.created_at.isoformat() if last_msg else None,
            'sender_name': last_msg.sender.name if last_msg else None,
            'can_send': can_send_to_group(user, group_name),
            'unread_count': unread_group_count(uid, group_name),
        })

    result.sort(
        key=lambda group: (
            group['unread_count'] == 0,
            group['last_message_time'] is None,
            group['last_message_time'] or ''
        ),
        reverse=False
    )
    return jsonify(result)

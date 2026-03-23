from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Notification, User

notifications_bp = Blueprint('notifications', __name__)

# ── List notifications ───────────────────────────────────────────────

@notifications_bp.route('', methods=['GET'])
@jwt_required()
def list_notifications():
    uid = int(get_jwt_identity())
    unread_only = request.args.get('unread', '').lower() == 'true'

    query = Notification.query.filter_by(user_id=uid)
    if unread_only:
        query = query.filter_by(is_read=False)

    notifications = query.order_by(Notification.created_at.desc()).all()
    return jsonify([n.to_dict() for n in notifications])

# ── Mark as read ─────────────────────────────────────────────────────

@notifications_bp.route('/<int:notification_id>/read', methods=['PUT'])
@jwt_required()
def mark_read(notification_id):
    uid = int(get_jwt_identity())
    n = Notification.query.get_or_404(notification_id)
    if n.user_id != uid:
        return jsonify({'error': 'Access denied'}), 403
    n.is_read = True
    db.session.commit()
    return jsonify(n.to_dict())

# ── Mark all as read ─────────────────────────────────────────────────

@notifications_bp.route('/read-all', methods=['PUT'])
@jwt_required()
def mark_all_read():
    uid = int(get_jwt_identity())
    Notification.query.filter_by(user_id=uid, is_read=False).update({'is_read': True})
    db.session.commit()
    return jsonify({'message': 'All notifications marked as read'})

# ── Unread count ─────────────────────────────────────────────────────

@notifications_bp.route('/unread-count', methods=['GET'])
@jwt_required()
def unread_count():
    uid = int(get_jwt_identity())
    count = Notification.query.filter_by(user_id=uid, is_read=False).count()
    return jsonify({'count': count})

# ── Delete notification ──────────────────────────────────────────────

@notifications_bp.route('/<int:notification_id>', methods=['DELETE'])
@jwt_required()
def delete_notification(notification_id):
    uid = int(get_jwt_identity())
    n = Notification.query.get_or_404(notification_id)
    if n.user_id != uid:
        return jsonify({'error': 'Access denied'}), 403
    db.session.delete(n)
    db.session.commit()
    return jsonify({'message': 'Notification deleted'})

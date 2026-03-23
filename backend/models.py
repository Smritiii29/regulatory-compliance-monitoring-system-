from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

# ── Users ──────────────────────────────────────────────────────────────

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # admin, principal, hod, faculty
    department = db.Column(db.String(100))
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=True)  # True = real signup, False = seed/dummy
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    submissions = db.relationship('Submission', foreign_keys='Submission.user_id', backref='user', lazy=True)
    sent_messages = db.relationship('ChatMessage', foreign_keys='ChatMessage.sender_id', backref='sender', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'department': self.department,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

# ── Circulars ──────────────────────────────────────────────────────────

class Circular(db.Model):
    __tablename__ = 'circulars'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(80), nullable=False)
    regulation_type = db.Column(db.String(50))            # NAAC, NHERC, etc.
    deadline = db.Column(db.DateTime)
    academic_year = db.Column(db.String(20))
    priority = db.Column(db.String(20), default='medium')  # high, medium, low
    status = db.Column(db.String(30), default='active')    # active, completed, expired
    target_departments = db.Column(db.Text)                # comma-separated or "all"
    file_path = db.Column(db.String(500))
    file_name = db.Column(db.String(300))
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    uploader = db.relationship('User', backref='circulars')
    submissions = db.relationship('Submission', backref='circular', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'regulation_type': self.regulation_type,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'academic_year': self.academic_year,
            'priority': self.priority,
            'status': self.status,
            'target_departments': self.target_departments,
            'file_path': self.file_path,
            'file_name': self.file_name,
            'uploaded_by': self.uploaded_by,
            'uploader_name': self.uploader.name if self.uploader else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'submission_count': len(self.submissions),
            'approved_count': len([s for s in self.submissions if s.status == 'approved']),
        }

# ── Submissions ────────────────────────────────────────────────────────

class Submission(db.Model):
    __tablename__ = 'submissions'
    id = db.Column(db.Integer, primary_key=True)
    circular_id = db.Column(db.Integer, db.ForeignKey('circulars.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    file_path = db.Column(db.String(500))
    file_name = db.Column(db.String(300))
    remarks = db.Column(db.Text)
    status = db.Column(db.String(30), default='pending')  # pending, submitted, under_review, approved, rejected
    admin_remarks = db.Column(db.Text)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed_at = db.Column(db.DateTime)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'))

    reviewer = db.relationship('User', foreign_keys=[reviewed_by])

    def to_dict(self):
        return {
            'id': self.id,
            'circular_id': self.circular_id,
            'circular_title': self.circular.title if self.circular else None,
            'circular_category': self.circular.category if self.circular else None,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else None,
            'user_department': self.user.department if self.user else None,
            'user_role': self.user.role if self.user else None,
            'file_path': self.file_path,
            'file_name': self.file_name,
            'remarks': self.remarks,
            'status': self.status,
            'admin_remarks': self.admin_remarks,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'reviewed_by': self.reviewed_by,
        }

# ── Notifications ──────────────────────────────────────────────────────

class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(300), nullable=False)
    message = db.Column(db.Text)
    type = db.Column(db.String(30))  # circular, submission, deadline, system
    is_read = db.Column(db.Boolean, default=False)
    circular_id = db.Column(db.Integer, db.ForeignKey('circulars.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref='notifications')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'message': self.message,
            'type': self.type,
            'is_read': self.is_read,
            'circular_id': self.circular_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

# ── Chat ───────────────────────────────────────────────────────────────

class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    receiver_id = db.Column(db.Integer)              # null = group/broadcast
    group_name = db.Column(db.String(100))            # department name or 'broadcast'
    message = db.Column(db.Text, nullable=False)
    message_type = db.Column(db.String(20), default='text')  # text, file
    file_path = db.Column(db.String(500))
    file_name = db.Column(db.String(300))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'sender_id': self.sender_id,
            'sender_name': self.sender.name if self.sender else None,
            'sender_role': self.sender.role if self.sender else None,
            'receiver_id': self.receiver_id,
            'group_name': self.group_name,
            'message': self.message,
            'message_type': self.message_type,
            'file_path': self.file_path,
            'file_name': self.file_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

# ── Activity Log ───────────────────────────────────────────────────────

class ActivityLog(db.Model):
    __tablename__ = 'activity_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action = db.Column(db.String(50), nullable=False)
    entity_type = db.Column(db.String(30))   # circular, submission, user
    entity_id = db.Column(db.Integer)
    details = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref='activity_logs')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else None,
            'user_role': self.user.role if self.user else None,
            'action': self.action,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'details': self.details,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

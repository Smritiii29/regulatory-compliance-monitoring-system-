import os
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from models import db, Circular, User, Notification, ActivityLog, Submission
from datetime import datetime
from utils.categorizer import auto_categorize
from utils.deadline_parser import extract_deadline
from utils.email_sender import send_notification_email

circulars_bp = Blueprint('circulars', __name__)

CATEGORIES = [
    'Regulation Update', 'Hackathon Event', 'Workshop / Seminar',
    'Curriculum Update', 'Infrastructure', 'Faculty Development',
    'Student Activities', 'Audit & Accreditation', 'Examination',
    'Research & Innovation', 'Placement & Internship', 'Other'
]

# ── Upload circular (admin only) ─────────────────────────────────────

@circulars_bp.route('', methods=['POST'])
@jwt_required()
def create_circular():
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)
    if user.role not in ('admin', 'principal'):
        return jsonify({'error': 'Only admin/principal can upload circulars'}), 403

    title = request.form.get('title', '').strip()
    description = request.form.get('description', '').strip()
    category = request.form.get('category', '').strip()
    regulation_type = request.form.get('regulation_type', '').strip()
    deadline_str = request.form.get('deadline', '').strip()
    academic_year = request.form.get('academic_year', '').strip()
    priority = request.form.get('priority', 'medium').strip()
    target_departments = request.form.get('target_departments', 'all').strip()

    if not title:
        return jsonify({'error': 'Title is required'}), 400

    # Auto-categorize if not provided
    if not category:
        category = auto_categorize(title + ' ' + description)

    # Parse deadline
    deadline = None
    if deadline_str:
        try:
            deadline = datetime.fromisoformat(deadline_str)
        except ValueError:
            deadline = extract_deadline(deadline_str)
    else:
        deadline = extract_deadline(title + ' ' + description)

    # Handle file upload
    file_path = None
    file_name = None
    if 'file' in request.files:
        f = request.files['file']
        if f.filename:
            file_name = secure_filename(f.filename)
            upload_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'circulars')
            os.makedirs(upload_dir, exist_ok=True)
            file_path = os.path.join(upload_dir, f'{datetime.utcnow().strftime("%Y%m%d%H%M%S")}_{file_name}')
            f.save(file_path)

    circular = Circular(
        title=title, description=description, category=category,
        regulation_type=regulation_type, deadline=deadline,
        academic_year=academic_year, priority=priority,
        target_departments=target_departments, file_path=file_path,
        file_name=file_name, uploaded_by=uid,
    )
    db.session.add(circular)
    db.session.flush()

    # Notify targeted users
    if target_departments == 'all':
        targets = User.query.filter(User.id != uid, User.is_active == True).all()
    else:
        depts = [d.strip() for d in target_departments.split(',')]
        targets = User.query.filter(
            User.department.in_(depts), User.id != uid, User.is_active == True
        ).all()

    for t in targets:
        notif_msg = f'{category} circular published. {"Deadline: " + deadline.strftime("%d %b %Y") if deadline else "No deadline set."}'
        n = Notification(
            user_id=t.id, title=f'New Circular: {title}',
            message=notif_msg,
            type='circular', circular_id=circular.id,
        )
        db.session.add(n)
        # Also send email notification
        send_notification_email(t.email, t.name, f'New Circular: {title}', notif_msg)

    log = ActivityLog(user_id=uid, action='create_circular', entity_type='circular',
                      entity_id=circular.id, details=f'Uploaded circular: {title}')
    db.session.add(log)
    db.session.commit()

    return jsonify(circular.to_dict()), 201

# ── List circulars ───────────────────────────────────────────────────

@circulars_bp.route('', methods=['GET'])
@jwt_required()
def list_circulars():
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)

    query = Circular.query

    # Filters
    category = request.args.get('category')
    status = request.args.get('status')
    regulation = request.args.get('regulation_type')
    search = request.args.get('search', '').strip()
    academic_year = request.args.get('academic_year')

    if category:
        query = query.filter(Circular.category == category)
    if status:
        query = query.filter(Circular.status == status)
    if regulation:
        query = query.filter(Circular.regulation_type == regulation)
    if academic_year:
        query = query.filter(Circular.academic_year == academic_year)
    if search:
        pattern = f'%{search}%'
        query = query.filter(
            db.or_(Circular.title.ilike(pattern), Circular.description.ilike(pattern),
                   Circular.category.ilike(pattern))
        )

    # For HOD/faculty, filter by their department
    if user.role in ('hod', 'faculty') and user.department:
        query = query.filter(
            db.or_(
                Circular.target_departments == 'all',
                Circular.target_departments.ilike(f'%{user.department}%')
            )
        )

    circulars = query.order_by(Circular.created_at.desc()).all()
    result = []
    for c in circulars:
        d = c.to_dict()
        # Check if current user has submitted
        sub = Submission.query.filter_by(circular_id=c.id, user_id=uid).first()
        d['my_submission'] = sub.to_dict() if sub else None
        result.append(d)

    return jsonify(result)

# ── Get single circular ─────────────────────────────────────────────

@circulars_bp.route('/<int:circular_id>', methods=['GET'])
@jwt_required()
def get_circular(circular_id):
    uid = int(get_jwt_identity())
    circular = Circular.query.get_or_404(circular_id)
    d = circular.to_dict()
    sub = Submission.query.filter_by(circular_id=circular_id, user_id=uid).first()
    d['my_submission'] = sub.to_dict() if sub else None
    d['all_submissions'] = [s.to_dict() for s in circular.submissions]
    return jsonify(d)

# ── Update circular ──────────────────────────────────────────────────

@circulars_bp.route('/<int:circular_id>', methods=['PUT'])
@jwt_required()
def update_circular(circular_id):
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)
    if user.role not in ('admin', 'principal'):
        return jsonify({'error': 'Access denied'}), 403

    circular = Circular.query.get_or_404(circular_id)
    data = request.get_json()

    for field in ('title', 'description', 'category', 'regulation_type',
                  'priority', 'status', 'target_departments', 'academic_year'):
        if field in data:
            setattr(circular, field, data[field])
    if 'deadline' in data and data['deadline']:
        try:
            circular.deadline = datetime.fromisoformat(data['deadline'])
        except ValueError:
            pass

    db.session.commit()
    return jsonify(circular.to_dict())

# ── Delete circular ──────────────────────────────────────────────────

@circulars_bp.route('/<int:circular_id>', methods=['DELETE'])
@jwt_required()
def delete_circular(circular_id):
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)
    if user.role not in ('admin', 'principal'):
        return jsonify({'error': 'Access denied'}), 403

    circular = Circular.query.get_or_404(circular_id)
    db.session.delete(circular)
    log = ActivityLog(user_id=uid, action='delete_circular', entity_type='circular',
                      entity_id=circular_id, details=f'Deleted circular: {circular.title}')
    db.session.add(log)
    db.session.commit()
    return jsonify({'message': 'Circular deleted'})

# ── Download circular file ───────────────────────────────────────────

@circulars_bp.route('/<int:circular_id>/download', methods=['GET'])
@jwt_required()
def download_circular(circular_id):
    circular = Circular.query.get_or_404(circular_id)
    if not circular.file_path or not os.path.exists(circular.file_path):
        return jsonify({'error': 'File not found'}), 404
    directory = os.path.dirname(circular.file_path)
    filename = os.path.basename(circular.file_path)
    return send_from_directory(directory, filename, as_attachment=True,
                               download_name=circular.file_name)

# ── Category summary ────────────────────────────────────────────────

@circulars_bp.route('/categories/summary', methods=['GET'])
@jwt_required()
def category_summary():
    results = []
    for cat in CATEGORIES:
        circulars = Circular.query.filter_by(category=cat).all()
        total = len(circulars)
        active = len([c for c in circulars if c.status == 'active'])
        completed = len([c for c in circulars if c.status == 'completed'])
        total_subs = sum(len(c.submissions) for c in circulars)
        approved_subs = sum(len([s for s in c.submissions if s.status == 'approved']) for c in circulars)

        results.append({
            'category': cat,
            'total': total,
            'active': active,
            'completed': completed,
            'total_submissions': total_subs,
            'approved_submissions': approved_subs,
            'compliance_rate': round(approved_subs / total_subs * 100, 1) if total_subs > 0 else 0,
        })
    return jsonify(results)

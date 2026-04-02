import os
from datetime import datetime

from flask import Blueprint, current_app, jsonify, request, send_from_directory
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import or_
from werkzeug.utils import secure_filename

from models import ActivityLog, Circular, Notification, Submission, User, db
from utils.categorizer import auto_categorize
from utils.deadline_parser import extract_deadline
from utils.email_sender import send_notification_email

circulars_bp = Blueprint('circulars', __name__)

CATEGORIES = [
    'Regulation Update',
    'Hackathon Event',
    'Workshop / Seminar',
    'Curriculum Update',
    'Infrastructure',
    'Faculty Development',
    'Student Activities',
    'Audit & Accreditation',
    'Examination',
    'Research & Innovation',
    'Placement & Internship',
    'Other',
]


def current_user():
    return User.query.get_or_404(int(get_jwt_identity()))


def parse_deadline(deadline_str: str, fallback_text: str = ''):
    if deadline_str:
        try:
            return datetime.fromisoformat(deadline_str)
        except ValueError:
            return extract_deadline(deadline_str)

    return extract_deadline(fallback_text)


def visible_circulars_query(user: User):
    query = Circular.query

    if user.role in ('admin', 'principal'):
        return query

    if user.department:
        return query.filter(
            or_(
                Circular.target_departments == 'all',
                Circular.target_departments.ilike(f'%{user.department}%'),
            )
        )

    return query.filter(Circular.target_departments == 'all')


def serialize_circular(circular: Circular, user_id: int):
    payload = circular.to_dict()
    submission = Submission.query.filter_by(circular_id=circular.id, user_id=user_id).first()
    payload['my_submission'] = submission.to_dict() if submission else None
    return payload


def target_users_for_circular(uploader_id: int, target_departments: str):
    if target_departments == 'all':
        return User.query.filter(User.id != uploader_id, User.is_active.is_(True)).all()

    departments = [dept.strip() for dept in target_departments.split(',') if dept.strip()]
    if not departments:
        return []

    return User.query.filter(
        User.department.in_(departments),
        User.id != uploader_id,
        User.is_active.is_(True),
    ).all()


def summary_cache_path(circular_id: int) -> str:
    cache_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'summaries')
    os.makedirs(cache_dir, exist_ok=True)
    return os.path.join(cache_dir, f'{circular_id}.md')


def get_cached_summary(circular: Circular) -> str | None:
    cache_path = summary_cache_path(circular.id)
    if not os.path.exists(cache_path):
        return None

    cache_mtime = os.path.getmtime(cache_path)
    circular_mtime = circular.updated_at.timestamp() if circular.updated_at else 0
    file_mtime = 0
    if circular.file_path and os.path.exists(circular.file_path):
        file_mtime = os.path.getmtime(circular.file_path)

    if cache_mtime < max(circular_mtime, file_mtime):
        return None

    with open(cache_path, 'r', encoding='utf-8') as handle:
        return handle.read().strip()


def cache_summary(circular: Circular, summary: str):
    with open(summary_cache_path(circular.id), 'w', encoding='utf-8') as handle:
        handle.write(summary)


@circulars_bp.route('', methods=['POST'])
@circulars_bp.route('/create', methods=['POST'])
@jwt_required()
def create_circular():
    user = current_user()
    if user.role not in ('admin', 'principal'):
        return jsonify({'error': 'Only admin/principal can upload circulars'}), 403

    title = request.form.get('title', '').strip()
    description = request.form.get('description', '').strip()
    category = request.form.get('category', '').strip()
    regulation_type = request.form.get('regulation_type', '').strip()
    deadline_str = request.form.get('deadline', '').strip()
    academic_year = request.form.get('academic_year', '').strip()
    priority = request.form.get('priority', 'medium').strip()
    target_departments = request.form.get('target_departments', 'all').strip() or 'all'

    if not title:
        return jsonify({'error': 'Title is required'}), 400

    if not category:
        category = auto_categorize(f'{title} {description}')

    deadline = parse_deadline(deadline_str, f'{title} {description}')

    file_path = None
    file_name = None
    uploaded_file = request.files.get('file')
    if uploaded_file and uploaded_file.filename:
        file_name = secure_filename(uploaded_file.filename)
        upload_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'circulars')
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(
            upload_dir,
            f'{datetime.utcnow().strftime("%Y%m%d%H%M%S")}_{file_name}',
        )
        uploaded_file.save(file_path)

    circular = Circular(
        title=title,
        description=description,
        category=category,
        regulation_type=regulation_type,
        deadline=deadline,
        academic_year=academic_year,
        priority=priority,
        target_departments=target_departments,
        file_path=file_path,
        file_name=file_name,
        uploaded_by=user.id,
    )
    db.session.add(circular)
    db.session.flush()

    notification_message = f'{category} circular published. '
    notification_message += (
        f'Deadline: {deadline.strftime("%d %b %Y")}' if deadline else 'No deadline set.'
    )

    for target in target_users_for_circular(user.id, target_departments):
        db.session.add(
            Notification(
                user_id=target.id,
                circular_id=circular.id,
                title=f'New Circular: {title}',
                message=notification_message,
                type='circular',
                is_read=False,
            )
        )
        send_notification_email(
            to_email=target.email,
            name=target.name,
            title=f'New Circular: {title}',
            message=notification_message,
        )

    db.session.add(
        ActivityLog(
            user_id=user.id,
            action='create_circular',
            entity_type='circular',
            entity_id=circular.id,
            details=f'Uploaded circular: {title}',
        )
    )
    db.session.commit()

    return jsonify(circular.to_dict()), 201


@circulars_bp.route('', methods=['GET'])
@circulars_bp.route('/list', methods=['GET'])
@jwt_required()
def list_circulars():
    user = current_user()
    query = visible_circulars_query(user)

    category = request.args.get('category', '').strip()
    status = request.args.get('status', '').strip()
    regulation_type = request.args.get('regulation_type', '').strip()
    academic_year = request.args.get('academic_year', '').strip()
    search = request.args.get('search', '').strip()

    if category and category not in ('all', 'all_categories'):
        query = query.filter(Circular.category == category)
    if status and status not in ('all', 'all_statuses'):
        query = query.filter(Circular.status == status)
    if regulation_type and regulation_type not in ('all', 'all_regulations'):
        query = query.filter(Circular.regulation_type == regulation_type)
    if academic_year and academic_year not in ('all', 'all_years'):
        query = query.filter(Circular.academic_year == academic_year)
    if search:
        pattern = f'%{search}%'
        query = query.filter(
            or_(
                Circular.title.ilike(pattern),
                Circular.description.ilike(pattern),
                Circular.category.ilike(pattern),
                Circular.regulation_type.ilike(pattern),
            )
        )

    circulars = query.order_by(Circular.created_at.desc()).all()
    return jsonify([serialize_circular(circular, user.id) for circular in circulars]), 200


@circulars_bp.route('/<int:circular_id>', methods=['GET'])
@jwt_required()
def get_circular(circular_id):
    user = current_user()
    circular = visible_circulars_query(user).filter(Circular.id == circular_id).first_or_404()

    payload = serialize_circular(circular, user.id)
    payload['all_submissions'] = [submission.to_dict() for submission in circular.submissions]
    return jsonify(payload)


@circulars_bp.route('/<int:circular_id>', methods=['PUT'])
@jwt_required()
def update_circular(circular_id):
    user = current_user()
    if user.role not in ('admin', 'principal'):
        return jsonify({'error': 'Access denied'}), 403

    circular = Circular.query.get_or_404(circular_id)
    data = request.get_json() or {}

    for field in (
        'title',
        'description',
        'category',
        'regulation_type',
        'priority',
        'status',
        'target_departments',
        'academic_year',
    ):
        if field in data:
            value = data[field]
            if field == 'target_departments' and not value:
                value = 'all'
            if field == 'academic_year' and value == '':
                value = None
            setattr(circular, field, value)

    if 'deadline' in data:
        circular.deadline = parse_deadline(data.get('deadline') or '')

    db.session.add(
        ActivityLog(
            user_id=user.id,
            action='update_circular',
            entity_type='circular',
            entity_id=circular.id,
            details=f'Updated circular: {circular.title}',
        )
    )
    db.session.commit()

    return jsonify(circular.to_dict())


@circulars_bp.route('/<int:circular_id>', methods=['DELETE'])
@jwt_required()
def delete_circular(circular_id):
    user = current_user()
    if user.role not in ('admin', 'principal'):
        return jsonify({'error': 'Access denied'}), 403

    circular = Circular.query.get_or_404(circular_id)
    circular_title = circular.title

    Notification.query.filter_by(circular_id=circular_id).delete()
    Submission.query.filter_by(circular_id=circular_id).delete()

    db.session.delete(circular)
    db.session.add(
        ActivityLog(
            user_id=user.id,
            action='delete_circular',
            entity_type='circular',
            entity_id=circular_id,
            details=f'Deleted circular: {circular_title}',
        )
    )
    db.session.commit()

    return jsonify({'message': 'Circular deleted'})


@circulars_bp.route('/categories/summary', methods=['GET'])
@jwt_required()
def category_summary():
    user = current_user()
    visible_circulars = visible_circulars_query(user).all()
    visible_by_category = {category: [] for category in CATEGORIES}

    for circular in visible_circulars:
        visible_by_category.setdefault(circular.category or 'Other', []).append(circular)

    results = []
    for category, circulars in visible_by_category.items():
        total = len(circulars)
        active = len([item for item in circulars if item.status == 'active'])
        completed = len([item for item in circulars if item.status == 'completed'])
        total_submissions = sum(len(item.submissions) for item in circulars)
        approved_submissions = sum(
            len([submission for submission in item.submissions if submission.status == 'approved'])
            for item in circulars
        )

        results.append(
            {
                'category': category,
                'total': total,
                'active': active,
                'completed': completed,
                'total_submissions': total_submissions,
                'approved_submissions': approved_submissions,
                'compliance_rate': (
                    round(approved_submissions / total_submissions * 100, 1)
                    if total_submissions > 0
                    else 0
                ),
            }
        )

    return jsonify(results)


@circulars_bp.route('/<int:circular_id>/summarize', methods=['POST'])
@jwt_required()
def summarize_circular(circular_id):
    try:
        user = current_user()
        circular = visible_circulars_query(user).filter(Circular.id == circular_id).first_or_404()

        cached = get_cached_summary(circular)
        if cached:
            return jsonify({'summary': cached, 'source': 'cache'}), 200

        if not circular.file_path or not circular.file_name:
            return jsonify({'error': 'No document attached to this circular'}), 400

        if not circular.file_name.lower().endswith(('.pdf', '.docx')):
            return jsonify({'error': 'Only PDF and DOCX files can be summarized'}), 400

        try:
            from utils.pdf_extractor import extract_text

            text = extract_text(circular.file_path)
            if not text.strip():
                return jsonify({'error': 'Could not extract text from document'}), 400
        except Exception as exc:
            return jsonify({'error': f'Error extracting text: {str(exc)}'}), 500

        try:
            from utils.ai_summarizer import summarize_document

            api_key = current_app.config.get('GEMINI_API_KEY')
            if not api_key:
                return jsonify({'error': 'AI service not configured'}), 500

            summary, source = summarize_document(text, circular.title, api_key)
        except Exception as exc:
            return jsonify({'error': f'Error generating summary: {str(exc)}'}), 500

        if summary:
            cache_summary(circular, summary)

        db.session.add(
            ActivityLog(
                user_id=user.id,
                action='summarize_circular',
                entity_type='circular',
                entity_id=circular_id,
                details=f'Generated AI summary for: {circular.title}',
            )
        )
        db.session.commit()

        return jsonify({'summary': summary, 'source': source}), 200
    except Exception as exc:
        return jsonify({'error': f'Unexpected error: {str(exc)}'}), 500


@circulars_bp.route('/<int:circular_id>/download', methods=['GET'])
@jwt_required()
def download_circular(circular_id):
    circular = Circular.query.get_or_404(circular_id)
    if not circular.file_path or not os.path.exists(circular.file_path):
        return jsonify({'error': 'File not found'}), 404

    directory = os.path.dirname(circular.file_path)
    filename = os.path.basename(circular.file_path)
    return send_from_directory(
        directory,
        filename,
        as_attachment=True,
        download_name=circular.file_name,
    )

import os
from datetime import datetime

from flask import Blueprint, current_app, jsonify, request, send_from_directory
from flask_jwt_extended import get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename

from models import ActivityLog, Circular, Notification, Submission, User, db
from utils.categorizer import auto_categorize
from utils.deadline_parser import extract_deadline
from utils.email_sender import send_notification_email
from utils.storage_paths import resolve_existing_path

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


def _user_can_access_circular(user: User, circular: Circular) -> bool:
    if user.role in ('admin', 'principal'):
        return True

    if circular.target_departments == 'all':
        return True

    if not user.department or not circular.target_departments:
        return False

    target_departments = [
        dept.strip().lower()
        for dept in circular.target_departments.split(',')
        if dept.strip()
    ]
    return user.department.strip().lower() in target_departments


def _summary_cache_path(circular_id: int) -> str:
    summary_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'summaries')
    os.makedirs(summary_dir, exist_ok=True)
    return os.path.join(summary_dir, f'circular_{circular_id}.md')


def _resolve_circular_file(circular: Circular, persist: bool = False) -> str | None:
    resolved_path = resolve_existing_path(
        circular.file_path,
        current_app.config['UPLOAD_FOLDER'],
        preferred_subdir='circulars',
        candidate_names=[circular.file_name],
    )
    if persist and resolved_path and circular.file_path != resolved_path:
        circular.file_path = resolved_path
        db.session.commit()
    return resolved_path


def _safe_remove_file(path: str | None):
    if not path or not os.path.exists(path):
        return
    try:
        os.remove(path)
    except OSError:
        # A locked runtime file should not block circular cleanup.
        pass


def _serialize_circular(circular: Circular, user_id: int):
    payload = circular.to_dict()
    submission = Submission.query.filter_by(circular_id=circular.id, user_id=user_id).first()
    payload['my_submission'] = submission.to_dict() if submission else None
    payload['summary_cached'] = os.path.exists(_summary_cache_path(circular.id))
    return payload


@circulars_bp.route('/create', methods=['POST'])
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

    if not category:
        category = auto_categorize(f'{title} {description}')

    deadline = None
    if deadline_str:
        try:
            deadline = datetime.fromisoformat(deadline_str)
        except ValueError:
            deadline = extract_deadline(deadline_str)
    else:
        deadline = extract_deadline(f'{title} {description}')

    file_path = None
    file_name = None
    if 'file' in request.files:
        uploaded_file = request.files['file']
        if uploaded_file.filename:
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
        uploaded_by=uid,
    )
    db.session.add(circular)
    db.session.flush()

    if target_departments == 'all':
        targets = User.query.filter(User.id != uid, User.is_active.is_(True)).all()
    else:
        departments = [dept.strip() for dept in target_departments.split(',') if dept.strip()]
        targets = User.query.filter(
            User.department.in_(departments),
            User.id != uid,
            User.is_active.is_(True),
        ).all()

    for target in targets:
        notification_message = f'{category} circular published. '
        if deadline:
            notification_message += f'Deadline: {deadline.strftime("%d %b %Y")}'
        else:
            notification_message += 'No deadline set.'

        db.session.add(Notification(
            user_id=target.id,
            circular_id=circular.id,
            title=f'New Circular: {title}',
            message=notification_message,
            type='circular',
            is_read=False,
        ))

        send_notification_email(
            to_email=target.email,
            name=target.name,
            title=f'New Circular: {title}',
            message=notification_message,
        )

    db.session.add(ActivityLog(
        user_id=uid,
        action='create_circular',
        entity_type='circular',
        entity_id=circular.id,
        details=f'Uploaded circular: {title}',
    ))
    db.session.commit()

    return jsonify(_serialize_circular(circular, uid)), 201


@circulars_bp.route('/list', methods=['GET'])
@jwt_required()
def list_circulars():
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)
    query = Circular.query

    category = request.args.get('category', '').strip()
    status = request.args.get('status', '').strip()
    regulation_type = request.args.get('regulation_type', '').strip()
    source_type = request.args.get('source_type', '').strip().lower()
    search = request.args.get('search', '').strip()

    if user.role not in ('admin', 'principal'):
        if user.department:
            query = query.filter(
                (Circular.target_departments == 'all') |
                (Circular.target_departments.ilike(f'%{user.department}%'))
            )
        else:
            query = query.filter(Circular.target_departments == 'all')

    if category and not category.startswith('all_'):
        query = query.filter(Circular.category == category)

    if status and not status.startswith('all_'):
        query = query.filter(Circular.status == status)

    if regulation_type and not regulation_type.startswith('all_'):
        query = query.filter(Circular.regulation_type == regulation_type)

    if search:
        pattern = f'%{search}%'
        query = query.filter(
            db.or_(
                Circular.title.ilike(pattern),
                Circular.description.ilike(pattern),
                Circular.category.ilike(pattern),
                Circular.regulation_type.ilike(pattern),
            )
        )

    circulars = query.order_by(Circular.created_at.desc()).all()

    if source_type in ('scraped', 'admin'):
        circulars = [item for item in circulars if item.source_type() == source_type]

    return jsonify([_serialize_circular(circular, uid) for circular in circulars]), 200


@circulars_bp.route('/<int:circular_id>', methods=['GET'])
@jwt_required()
def get_circular(circular_id):
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)
    circular = Circular.query.get_or_404(circular_id)

    if not _user_can_access_circular(user, circular):
        return jsonify({'error': 'Access denied'}), 403

    return jsonify(_serialize_circular(circular, uid)), 200


@circulars_bp.route('/<int:circular_id>', methods=['PUT'])
@jwt_required()
def update_circular(circular_id):
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)
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
            setattr(circular, field, data[field])

    if 'deadline' in data:
        if data['deadline']:
            try:
                circular.deadline = datetime.fromisoformat(data['deadline'])
            except ValueError:
                return jsonify({'error': 'Invalid deadline format'}), 400
        else:
            circular.deadline = None

    db.session.commit()
    return jsonify(_serialize_circular(circular, uid)), 200


@circulars_bp.route('/<int:circular_id>', methods=['DELETE'])
@jwt_required()
def delete_circular(circular_id):
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)
    if user.role not in ('admin', 'principal'):
        return jsonify({'error': 'Access denied'}), 403

    circular = Circular.query.get_or_404(circular_id)

    resolved_path = _resolve_circular_file(circular)
    _safe_remove_file(resolved_path)

    related_submissions = Submission.query.filter_by(circular_id=circular_id).all()
    for submission in related_submissions:
        submission_path = resolve_existing_path(
            submission.file_path,
            current_app.config['UPLOAD_FOLDER'],
            preferred_subdir='submissions',
            candidate_names=[submission.file_name],
        )
        _safe_remove_file(submission_path)

    Notification.query.filter_by(circular_id=circular_id).delete(synchronize_session=False)
    Submission.query.filter_by(circular_id=circular_id).delete(synchronize_session=False)

    cache_path = _summary_cache_path(circular_id)
    _safe_remove_file(cache_path)

    db.session.add(ActivityLog(
        user_id=uid,
        action='delete_circular',
        entity_type='circular',
        entity_id=circular_id,
        details=f'Deleted circular: {circular.title}',
    ))
    db.session.delete(circular)
    db.session.commit()
    return jsonify({'message': 'Circular deleted'}), 200


@circulars_bp.route('/<int:circular_id>/summarize', methods=['POST'])
@jwt_required()
def summarize_circular(circular_id):
    try:
        uid = int(get_jwt_identity())
        user = User.query.get_or_404(uid)
        circular = Circular.query.get_or_404(circular_id)

        if not _user_can_access_circular(user, circular):
            return jsonify({'error': 'Access denied'}), 403

        cache_path = _summary_cache_path(circular_id)
        if os.path.exists(cache_path):
            with open(cache_path, 'r', encoding='utf-8') as summary_file:
                return jsonify({'summary': summary_file.read()}), 200

        resolved_path = _resolve_circular_file(circular, persist=True)

        if not resolved_path or not circular.file_name:
            return jsonify({'error': 'No document attached to this circular'}), 400

        if not circular.file_name.lower().endswith(('.pdf', '.docx')):
            return jsonify({'error': 'Only PDF and DOCX files can be summarized'}), 400

        try:
            from utils.pdf_extractor import extract_text

            text = extract_text(resolved_path)
            if not text.strip():
                return jsonify({'error': 'Could not extract text from document'}), 400
        except Exception as exc:
            return jsonify({'error': f'Error extracting text: {str(exc)}'}), 500

        try:
            from utils.ai_summarizer import summarize_document

            api_key = current_app.config.get('GEMINI_API_KEY')
            if not api_key:
                return jsonify({'error': 'AI service not configured'}), 500

            summary = summarize_document(text, circular.title, api_key)
            if not summary or summary.startswith('Error:'):
                error_message = summary.replace('Error:', '').strip() if summary else 'Failed to generate summary'
                status_code = 429 if '429' in error_message or 'RESOURCE_EXHAUSTED' in error_message else 500
                return jsonify({'error': error_message}), status_code

            with open(cache_path, 'w', encoding='utf-8') as summary_file:
                summary_file.write(summary)
        except Exception as exc:
            return jsonify({'error': f'Error generating summary: {str(exc)}'}), 500

        db.session.add(ActivityLog(
            user_id=uid,
            action='summarize_circular',
            entity_type='circular',
            entity_id=circular_id,
            details=f'Generated AI summary for: {circular.title}',
        ))
        db.session.commit()

        return jsonify({'summary': summary}), 200
    except Exception as exc:
        return jsonify({'error': f'Unexpected error: {str(exc)}'}), 500


@circulars_bp.route('/<int:circular_id>/download', methods=['GET'])
@jwt_required()
def download_circular(circular_id):
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)
    circular = Circular.query.get_or_404(circular_id)

    if not _user_can_access_circular(user, circular):
        return jsonify({'error': 'Access denied'}), 403

    resolved_path = _resolve_circular_file(circular, persist=True)
    if not resolved_path or not os.path.exists(resolved_path):
        return jsonify({'error': 'File not found'}), 404

    directory = os.path.dirname(resolved_path)
    filename = os.path.basename(resolved_path)
    return send_from_directory(
        directory,
        filename,
        as_attachment=True,
        download_name=circular.file_name,
    )


@circulars_bp.route('/categories/summary', methods=['GET'])
@jwt_required()
def category_summary():
    results = []
    for category in CATEGORIES:
        circulars = Circular.query.filter_by(category=category).all()
        total = len(circulars)
        active = len([item for item in circulars if item.status == 'active'])
        completed = len([item for item in circulars if item.status == 'completed'])
        total_submissions = sum(len(item.submissions) for item in circulars)
        approved_submissions = sum(
            len([submission for submission in item.submissions if submission.status == 'approved'])
            for item in circulars
        )

        results.append({
            'category': category,
            'total': total,
            'active': active,
            'completed': completed,
            'total_submissions': total_submissions,
            'approved_submissions': approved_submissions,
            'compliance_rate': round(approved_submissions / total_submissions * 100, 1) if total_submissions else 0,
        })

    return jsonify(results), 200

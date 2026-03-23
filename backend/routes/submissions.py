import os
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from models import db, Submission, Circular, User, Notification, ActivityLog
from utils.email_sender import send_notification_email
from datetime import datetime

submissions_bp = Blueprint('submissions', __name__)

# ── Submit proof for a circular ──────────────────────────────────────

@submissions_bp.route('', methods=['POST'])
@jwt_required()
def create_submission():
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)

    circular_id = request.form.get('circular_id', type=int)
    remarks = request.form.get('remarks', '').strip()

    if not circular_id:
        return jsonify({'error': 'circular_id is required'}), 400

    circular = Circular.query.get_or_404(circular_id)

    # Check if already submitted
    existing = Submission.query.filter_by(circular_id=circular_id, user_id=uid).first()
    if existing and existing.status not in ('rejected',):
        return jsonify({'error': 'You have already submitted for this circular'}), 409

    # Handle file upload
    file_path = None
    file_name = None
    if 'file' in request.files:
        f = request.files['file']
        if f.filename:
            file_name = secure_filename(f.filename)
            upload_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'submissions')
            os.makedirs(upload_dir, exist_ok=True)
            file_path = os.path.join(upload_dir,
                                     f'{uid}_{circular_id}_{datetime.utcnow().strftime("%Y%m%d%H%M%S")}_{file_name}')
            f.save(file_path)

    if existing and existing.status == 'rejected':
        # Re-submit
        existing.file_path = file_path
        existing.file_name = file_name
        existing.remarks = remarks
        existing.status = 'submitted'
        existing.submitted_at = datetime.utcnow()
        existing.admin_remarks = None
        existing.reviewed_at = None
        existing.reviewed_by = None
        submission = existing
    else:
        submission = Submission(
            circular_id=circular_id, user_id=uid, file_path=file_path,
            file_name=file_name, remarks=remarks, status='submitted',
        )
        db.session.add(submission)

    db.session.flush()

    # ── Role-based notification hierarchy ──────────────────────────
    # faculty → notify HOD (same dept) + principal (NOT admin directly)
    # hod     → notify admin + principal + faculty in dept
    # principal → notify admin + HODs
    notify_msg = f'{user.name} ({user.department}) submitted proof for "{circular.title}"'
    notify_targets = []

    if user.role == 'faculty':
        # Faculty submits to HOD + Principal only
        hods = User.query.filter_by(role='hod', department=user.department, is_active=True).all()
        principals = User.query.filter_by(role='principal', is_active=True).all()
        notify_targets = hods + principals
    elif user.role == 'hod':
        # HOD submits to admin + principal + faculty in their dept
        admins = User.query.filter_by(role='admin', is_active=True).all()
        principals = User.query.filter_by(role='principal', is_active=True).all()
        faculty = User.query.filter_by(role='faculty', department=user.department, is_active=True).all()
        notify_targets = admins + principals + faculty
    elif user.role == 'principal':
        # Principal submits to admin + HODs
        admins = User.query.filter_by(role='admin', is_active=True).all()
        hods = User.query.filter_by(role='hod', is_active=True).all()
        notify_targets = admins + hods
    else:
        # admin submits → notify principal + HODs + faculty
        others = User.query.filter(User.role.in_(['principal', 'hod', 'faculty']), User.is_active == True).all()
        notify_targets = others

    # Remove self from targets
    notify_targets = [t for t in notify_targets if t.id != uid]

    for t in notify_targets:
        n = Notification(
            user_id=t.id, title='New Submission',
            message=notify_msg, type='submission', circular_id=circular_id,
        )
        db.session.add(n)
        # Also send email notification
        send_notification_email(t.email, t.name, 'New Submission', notify_msg)

    log = ActivityLog(user_id=uid, action='submit_proof', entity_type='submission',
                      entity_id=submission.id,
                      details=f'Submitted proof for: {circular.title}')
    db.session.add(log)
    db.session.commit()

    return jsonify(submission.to_dict()), 201

# ── List submissions ─────────────────────────────────────────────────

@submissions_bp.route('', methods=['GET'])
@jwt_required()
def list_submissions():
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)

    query = Submission.query

    # Filters
    status = request.args.get('status')
    circular_id = request.args.get('circular_id', type=int)
    department = request.args.get('department')

    if status:
        query = query.filter(Submission.status == status)
    if circular_id:
        query = query.filter(Submission.circular_id == circular_id)

    # Role-based filtering
    if user.role == 'faculty':
        query = query.filter(Submission.user_id == uid)
    elif user.role == 'hod':
        dept_users = User.query.filter_by(department=user.department).all()
        dept_user_ids = [u.id for u in dept_users]
        query = query.filter(Submission.user_id.in_(dept_user_ids))
    # admin / principal see all

    if department:
        dept_users = User.query.filter_by(department=department).all()
        dept_user_ids = [u.id for u in dept_users]
        query = query.filter(Submission.user_id.in_(dept_user_ids))

    submissions = query.order_by(Submission.submitted_at.desc()).all()
    return jsonify([s.to_dict() for s in submissions])

# ── Get single submission ────────────────────────────────────────────

@submissions_bp.route('/<int:submission_id>', methods=['GET'])
@jwt_required()
def get_submission(submission_id):
    submission = Submission.query.get_or_404(submission_id)
    return jsonify(submission.to_dict())

# ── Review submission (approve/reject) ───────────────────────────────

@submissions_bp.route('/<int:submission_id>/review', methods=['PUT'])
@jwt_required()
def review_submission(submission_id):
    uid = int(get_jwt_identity())
    reviewer = User.query.get_or_404(uid)
    if reviewer.role not in ('admin', 'principal', 'hod'):
        return jsonify({'error': 'Only admin, principal, or HOD can review submissions'}), 403

    submission = Submission.query.get_or_404(submission_id)
    data = request.get_json()
    action = data.get('action')  # 'approve' or 'reject'
    admin_remarks = data.get('remarks', '').strip()

    if action not in ('approve', 'reject'):
        return jsonify({'error': 'Action must be approve or reject'}), 400

    submission.status = 'approved' if action == 'approve' else 'rejected'
    submission.admin_remarks = admin_remarks
    submission.reviewed_at = datetime.utcnow()
    submission.reviewed_by = uid

    # Notify the submitter (in-platform + email)
    review_msg = f'Your submission for "{submission.circular.title}" has been {"approved" if action == "approve" else "rejected"}.{" Remarks: " + admin_remarks if admin_remarks else ""}'
    n = Notification(
        user_id=submission.user_id,
        title=f'Submission {"Approved" if action == "approve" else "Rejected"}',
        message=review_msg,
        type='submission', circular_id=submission.circular_id,
    )
    db.session.add(n)
    submitter = User.query.get(submission.user_id)
    if submitter:
        send_notification_email(
            submitter.email, submitter.name,
            f'Submission {"Approved" if action == "approve" else "Rejected"}', review_msg
        )

    # Check if all submissions for circular are done  → auto-complete
    circular = submission.circular
    if action == 'approve':
        all_subs = Submission.query.filter_by(circular_id=circular.id).all()
        if all_subs and all(s.status == 'approved' for s in all_subs):
            circular.status = 'completed'

    log = ActivityLog(user_id=uid, action=f'{action}_submission', entity_type='submission',
                      entity_id=submission_id,
                      details=f'{action.title()}d submission by {submission.user.name} for {circular.title}')
    db.session.add(log)
    db.session.commit()

    return jsonify(submission.to_dict())

# ── Download submission file ─────────────────────────────────────────

@submissions_bp.route('/<int:submission_id>/download', methods=['GET'])
@jwt_required()
def download_submission(submission_id):
    submission = Submission.query.get_or_404(submission_id)
    if not submission.file_path or not os.path.exists(submission.file_path):
        return jsonify({'error': 'File not found'}), 404
    directory = os.path.dirname(submission.file_path)
    filename = os.path.basename(submission.file_path)
    return send_from_directory(directory, filename, as_attachment=True,
                               download_name=submission.file_name)

# ── My submissions ───────────────────────────────────────────────────

@submissions_bp.route('/mine', methods=['GET'])
@jwt_required()
def my_submissions():
    uid = int(get_jwt_identity())
    subs = Submission.query.filter_by(user_id=uid).order_by(Submission.submitted_at.desc()).all()
    return jsonify([s.to_dict() for s in subs])

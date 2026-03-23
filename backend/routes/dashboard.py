from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Circular, Submission, Notification, ActivityLog
from datetime import datetime, timedelta

dashboard_bp = Blueprint('dashboard', __name__)

DEPARTMENTS = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'BIOMEDICAL', 'MTECH CSE']

@dashboard_bp.route('/stats', methods=['GET'])
@jwt_required()
def stats():
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)

    now = datetime.utcnow()
    thirty_days = now - timedelta(days=30)

    # ── Common stats ───────────────────────────────────────────────
    total_circulars = Circular.query.count()
    active_circulars = Circular.query.filter_by(status='active').count()
    total_submissions = Submission.query.count()
    pending_submissions = Submission.query.filter_by(status='submitted').count()
    approved_submissions = Submission.query.filter_by(status='approved').count()
    rejected_submissions = Submission.query.filter_by(status='rejected').count()
    total_users = User.query.filter_by(is_active=True).count()

    # Upcoming deadlines
    upcoming = Circular.query.filter(
        Circular.deadline >= now,
        Circular.deadline <= now + timedelta(days=14),
        Circular.status == 'active'
    ).order_by(Circular.deadline.asc()).limit(10).all()

    # Overdue circulars
    overdue = Circular.query.filter(
        Circular.deadline < now,
        Circular.status == 'active'
    ).all()

    # Recent activity
    recent_activity = ActivityLog.query.order_by(ActivityLog.created_at.desc()).limit(20).all()

    # Compliance rate
    compliance_rate = round(approved_submissions / total_submissions * 100, 1) if total_submissions > 0 else 0

    result = {
        'total_circulars': total_circulars,
        'active_circulars': active_circulars,
        'total_submissions': total_submissions,
        'pending_submissions': pending_submissions,
        'approved_submissions': approved_submissions,
        'rejected_submissions': rejected_submissions,
        'compliance_rate': compliance_rate,
        'total_users': total_users,
        'overdue_count': len(overdue),
        'upcoming_deadlines': [c.to_dict() for c in upcoming],
        'overdue_circulars': [c.to_dict() for c in overdue],
        'recent_activity': [a.to_dict() for a in recent_activity],
    }

    # ── Role-specific data ─────────────────────────────────────────
    if user.role in ('admin', 'principal'):
        # Department-wise compliance
        dept_stats = []
        for dept in DEPARTMENTS:
            dept_users = User.query.filter_by(department=dept, is_active=True).all()
            dept_user_ids = [u.id for u in dept_users]
            if dept_user_ids:
                dept_subs = Submission.query.filter(Submission.user_id.in_(dept_user_ids)).all()
                dept_approved = len([s for s in dept_subs if s.status == 'approved'])
                dept_total = len(dept_subs)
                dept_rate = round(dept_approved / dept_total * 100, 1) if dept_total > 0 else 0
            else:
                dept_total = 0
                dept_approved = 0
                dept_rate = 0

            dept_stats.append({
                'department': dept,
                'user_count': len(dept_users),
                'total_submissions': dept_total,
                'approved_submissions': dept_approved,
                'compliance_rate': dept_rate,
            })
        result['department_stats'] = dept_stats

        # Pending reviews
        pending_review = Submission.query.filter_by(status='submitted') \
            .order_by(Submission.submitted_at.desc()).limit(10).all()
        result['pending_reviews'] = [s.to_dict() for s in pending_review]

    elif user.role == 'hod':
        # Department stats
        dept_users = User.query.filter_by(department=user.department, is_active=True).all()
        dept_user_ids = [u.id for u in dept_users]
        dept_subs = Submission.query.filter(Submission.user_id.in_(dept_user_ids)).all()
        result['department_users'] = len(dept_users)
        result['department_submissions'] = len(dept_subs)
        result['department_approved'] = len([s for s in dept_subs if s.status == 'approved'])
        result['department_compliance'] = round(
            result['department_approved'] / len(dept_subs) * 100, 1) if dept_subs else 0

    elif user.role == 'faculty':
        my_subs = Submission.query.filter_by(user_id=uid).all()
        result['my_total_submissions'] = len(my_subs)
        result['my_approved'] = len([s for s in my_subs if s.status == 'approved'])
        result['my_pending'] = len([s for s in my_subs if s.status in ('submitted', 'pending')])
        result['my_rejected'] = len([s for s in my_subs if s.status == 'rejected'])

        # Circulars requiring my action
        my_circular_ids = [s.circular_id for s in my_subs]
        if user.department:
            pending_circulars = Circular.query.filter(
                Circular.status == 'active',
                ~Circular.id.in_(my_circular_ids) if my_circular_ids else True,
                db.or_(
                    Circular.target_departments == 'all',
                    Circular.target_departments.ilike(f'%{user.department}%')
                )
            ).all()
        else:
            pending_circulars = []
        result['pending_circulars'] = [c.to_dict() for c in pending_circulars]

    return jsonify(result)

# ── Accreditation readiness ──────────────────────────────────────────

@dashboard_bp.route('/accreditation', methods=['GET'])
@jwt_required()
def accreditation():
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)
    if user.role not in ('admin', 'principal'):
        return jsonify({'error': 'Access denied'}), 403

    regulation_types = ['NAAC', 'NHERC', 'UGC', 'AICTE', 'NBA', 'Other']
    result = []
    for rt in regulation_types:
        circulars = Circular.query.filter_by(regulation_type=rt).all()
        total = len(circulars)
        completed = len([c for c in circulars if c.status == 'completed'])
        active = len([c for c in circulars if c.status == 'active'])
        total_subs = sum(len(c.submissions) for c in circulars)
        approved_subs = sum(len([s for s in c.submissions if s.status == 'approved']) for c in circulars)

        result.append({
            'regulation_type': rt,
            'total_circulars': total,
            'completed': completed,
            'active': active,
            'total_submissions': total_subs,
            'approved_submissions': approved_subs,
            'readiness_score': round(completed / total * 100, 1) if total > 0 else 0,
        })

    overall = sum(r['readiness_score'] for r in result) / len(result) if result else 0
    return jsonify({'regulations': result, 'overall_readiness': round(overall, 1)})

# ── Activity log ─────────────────────────────────────────────────────

@dashboard_bp.route('/activity', methods=['GET'])
@jwt_required()
def activity_log():
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)

    query = ActivityLog.query
    if user.role == 'faculty':
        query = query.filter_by(user_id=uid)
    elif user.role == 'hod':
        dept_users = User.query.filter_by(department=user.department).all()
        dept_user_ids = [u.id for u in dept_users]
        query = query.filter(ActivityLog.user_id.in_(dept_user_ids))

    logs = query.order_by(ActivityLog.created_at.desc()) \
        .offset((page - 1) * per_page).limit(per_page).all()
    return jsonify([l.to_dict() for l in logs])

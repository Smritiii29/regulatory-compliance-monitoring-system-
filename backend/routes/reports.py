import io
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Circular, Submission
from utils.pdf_generator import generate_annual_report, generate_department_report

reports_bp = Blueprint('reports', __name__)

# ── Generate annual report (PDF) ────────────────────────────────────

@reports_bp.route('/annual', methods=['GET'])
@jwt_required()
def annual_report():
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)
    if user.role not in ('admin', 'principal'):
        return jsonify({'error': 'Access denied'}), 403

    academic_year = request.args.get('academic_year', '2024-2025')
    pdf_buffer = generate_annual_report(academic_year)

    return send_file(
        pdf_buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'RCMS_Annual_Report_{academic_year}.pdf'
    )

# ── Generate department report (PDF) ────────────────────────────────

@reports_bp.route('/department', methods=['GET'])
@jwt_required()
def department_report():
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)
    if user.role not in ('admin', 'principal', 'hod'):
        return jsonify({'error': 'Access denied'}), 403

    department = request.args.get('department', user.department)
    academic_year = request.args.get('academic_year', '2024-2025')

    if user.role == 'hod' and department != user.department:
        return jsonify({'error': 'Access denied'}), 403

    pdf_buffer = generate_department_report(department, academic_year)

    return send_file(
        pdf_buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'RCMS_Report_{department}_{academic_year}.pdf'
    )

# ── Report data (JSON) ──────────────────────────────────────────────

@reports_bp.route('/data', methods=['GET'])
@jwt_required()
def report_data():
    uid = int(get_jwt_identity())
    user = User.query.get_or_404(uid)

    academic_year = request.args.get('academic_year', '2024-2025')

    circulars = Circular.query.filter_by(academic_year=academic_year).all()
    total = len(circulars)
    completed = len([c for c in circulars if c.status == 'completed'])
    active = len([c for c in circulars if c.status == 'active'])

    submissions = Submission.query.join(Circular).filter(
        Circular.academic_year == academic_year
    ).all()
    total_subs = len(submissions)
    approved_subs = len([s for s in submissions if s.status == 'approved'])
    rejected_subs = len([s for s in submissions if s.status == 'rejected'])
    pending_subs = len([s for s in submissions if s.status in ('submitted', 'pending')])

    # Category breakdown
    categories = {}
    for c in circulars:
        cat = c.category
        if cat not in categories:
            categories[cat] = {'total': 0, 'completed': 0, 'active': 0, 'submissions': 0, 'approved': 0}
        categories[cat]['total'] += 1
        if c.status == 'completed':
            categories[cat]['completed'] += 1
        elif c.status == 'active':
            categories[cat]['active'] += 1
        for s in c.submissions:
            categories[cat]['submissions'] += 1
            if s.status == 'approved':
                categories[cat]['approved'] += 1

    # Department breakdown
    departments = {}
    depts = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'BIOMEDICAL', 'MTECH CSE']
    for dept in depts:
        dept_users = User.query.filter_by(department=dept).all()
        dept_user_ids = [u.id for u in dept_users]
        dept_subs = [s for s in submissions if s.user_id in dept_user_ids]
        departments[dept] = {
            'user_count': len(dept_users),
            'submissions': len(dept_subs),
            'approved': len([s for s in dept_subs if s.status == 'approved']),
            'compliance_rate': round(len([s for s in dept_subs if s.status == 'approved']) / len(dept_subs) * 100, 1) if dept_subs else 0,
        }

    return jsonify({
        'academic_year': academic_year,
        'total_circulars': total,
        'completed_circulars': completed,
        'active_circulars': active,
        'total_submissions': total_subs,
        'approved_submissions': approved_subs,
        'rejected_submissions': rejected_subs,
        'pending_submissions': pending_subs,
        'compliance_rate': round(approved_subs / total_subs * 100, 1) if total_subs > 0 else 0,
        'categories': categories,
        'departments': departments,
    })

import os
import sys
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import Config
from models import db, User, Circular, Notification, ActivityLog


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    db.init_app(app)
    JWTManager(app)

    # Ensure upload folder exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Session secret (needed for OAuth state tokens)
    app.secret_key = app.config['SECRET_KEY']

    # Register blueprints
    from routes.auth import auth_bp
    from routes.circulars import circulars_bp
    from routes.submissions import submissions_bp
    from routes.notifications import notifications_bp
    from routes.chat import chat_bp
    from routes.dashboard import dashboard_bp
    from routes.reports import reports_bp
    from routes.oauth import oauth_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(oauth_bp, url_prefix='/api/auth')
    app.register_blueprint(circulars_bp, url_prefix='/api/circulars')
    app.register_blueprint(submissions_bp, url_prefix='/api/submissions')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')

    # Health check
    @app.route('/api/health')
    def health():
        return {'status': 'ok', 'message': 'RCMS Backend is running'}

    # Create tables and seed data
    with app.app_context():
        db.create_all()
        seed_data()

    return app


def seed_data():
    """Seed the database with initial data if empty."""
    if User.query.first():
        return  # Already seeded

    print("Seeding database with initial data...")

    # ── Create users ──────────────────────────────────────────────
    users_data = [
        # Admin
        {'name': 'System Admin', 'email': 'admin@college.edu.in', 'password': 'admin123',
         'role': 'admin', 'department': None},
        # Principal
        {'name': 'Dr. Rajesh Kumar', 'email': 'principal@college.edu.in', 'password': 'principal123',
         'role': 'principal', 'department': None},
        # HODs
        {'name': 'Dr. Priya Sharma', 'email': 'hod.cse@college.edu.in', 'password': 'hod123',
         'role': 'hod', 'department': 'CSE'},
        {'name': 'Dr. Arun Patel', 'email': 'hod.it@college.edu.in', 'password': 'hod123',
         'role': 'hod', 'department': 'IT'},
        {'name': 'Dr. Kavitha Nair', 'email': 'hod.ece@college.edu.in', 'password': 'hod123',
         'role': 'hod', 'department': 'ECE'},
        {'name': 'Dr. Suresh Reddy', 'email': 'hod.eee@college.edu.in', 'password': 'hod123',
         'role': 'hod', 'department': 'EEE'},
        {'name': 'Dr. Mohan Das', 'email': 'hod.mech@college.edu.in', 'password': 'hod123',
         'role': 'hod', 'department': 'MECH'},
        {'name': 'Dr. Lakshmi Iyer', 'email': 'hod.civil@college.edu.in', 'password': 'hod123',
         'role': 'hod', 'department': 'CIVIL'},
        {'name': 'Dr. Anita Desai', 'email': 'hod.biomed@college.edu.in', 'password': 'hod123',
         'role': 'hod', 'department': 'BIOMEDICAL'},
        {'name': 'Dr. Vikram Singh', 'email': 'hod.mtech@college.edu.in', 'password': 'hod123',
         'role': 'hod', 'department': 'MTECH CSE'},
        # Faculty
        {'name': 'Prof. Ravi Shankar', 'email': 'ravi.cse@college.edu.in', 'password': 'faculty123',
         'role': 'faculty', 'department': 'CSE'},
        {'name': 'Prof. Deepa Menon', 'email': 'deepa.cse@college.edu.in', 'password': 'faculty123',
         'role': 'faculty', 'department': 'CSE'},
        {'name': 'Prof. Sanjay Gupta', 'email': 'sanjay.it@college.edu.in', 'password': 'faculty123',
         'role': 'faculty', 'department': 'IT'},
        {'name': 'Prof. Meera Krishnan', 'email': 'meera.ece@college.edu.in', 'password': 'faculty123',
         'role': 'faculty', 'department': 'ECE'},
        {'name': 'Prof. Amit Joshi', 'email': 'amit.eee@college.edu.in', 'password': 'faculty123',
         'role': 'faculty', 'department': 'EEE'},
        {'name': 'Prof. Neha Agarwal', 'email': 'neha.mech@college.edu.in', 'password': 'faculty123',
         'role': 'faculty', 'department': 'MECH'},
        {'name': 'Prof. Rahul Verma', 'email': 'rahul.civil@college.edu.in', 'password': 'faculty123',
         'role': 'faculty', 'department': 'CIVIL'},
        {'name': 'Prof. Smriti Bansal', 'email': 'smriti.biomed@college.edu.in', 'password': 'faculty123',
         'role': 'faculty', 'department': 'BIOMEDICAL'},
        {'name': 'Prof. Karthik Rajan', 'email': 'karthik.mtech@college.edu.in', 'password': 'faculty123',
         'role': 'faculty', 'department': 'MTECH CSE'},
    ]

    users = []
    for u in users_data:
        user = User(
            name=u['name'], email=u['email'],
            password_hash=generate_password_hash(u['password']),
            role=u['role'], department=u['department'], is_active=True,
            is_verified=False,  # Seed/dummy users cannot login
        )
        db.session.add(user)
        users.append(user)

    db.session.flush()

    admin = users[0]

    # ── Create sample circulars ───────────────────────────────────
    now = datetime.utcnow()
    circulars_data = [
        {
            'title': 'NAAC Self-Study Report Preparation',
            'description': 'All departments must submit their Self-Study Report (SSR) data as per NAAC criteria. Include quantitative metrics, best practices, and supporting documents.',
            'category': 'Audit & Accreditation',
            'regulation_type': 'NAAC',
            'deadline': now + timedelta(days=30),
            'priority': 'high',
            'target_departments': 'all',
            'academic_year': '2024-2025',
        },
        {
            'title': 'Smart India Hackathon 2025 Registration',
            'description': 'Register student teams for Smart India Hackathon 2025. Each department should nominate at least 2 teams. Submit team details and problem statements.',
            'category': 'Hackathon Event',
            'regulation_type': 'AICTE',
            'deadline': now + timedelta(days=14),
            'priority': 'high',
            'target_departments': 'CSE,IT,ECE',
            'academic_year': '2024-2025',
        },
        {
            'title': 'Faculty Development Program on NEP 2020',
            'description': 'Mandatory 5-day FDP on National Education Policy 2020 implementation. All faculty must attend and submit completion certificates.',
            'category': 'Workshop / Seminar',
            'regulation_type': 'UGC',
            'deadline': now + timedelta(days=21),
            'priority': 'medium',
            'target_departments': 'all',
            'academic_year': '2024-2025',
        },
        {
            'title': 'NBA Accreditation - Outcome-Based Education Documents',
            'description': 'Submit Course Outcomes, Program Outcomes, and attainment data for NBA accreditation review. Include rubrics and assessment tools.',
            'category': 'Audit & Accreditation',
            'regulation_type': 'NBA',
            'deadline': now + timedelta(days=45),
            'priority': 'high',
            'target_departments': 'CSE,IT,ECE,EEE,MECH',
            'academic_year': '2024-2025',
        },
        {
            'title': 'Updated Curriculum for Academic Year 2025-2026',
            'description': 'Submit revised curriculum incorporating industry feedback, skill-based courses, and interdisciplinary electives as per AICTE model curriculum.',
            'category': 'Curriculum Update',
            'regulation_type': 'AICTE',
            'deadline': now + timedelta(days=60),
            'priority': 'medium',
            'target_departments': 'all',
            'academic_year': '2024-2025',
        },
        {
            'title': 'Research Publication Data Collection',
            'description': 'Submit details of all research publications, patents filed, and funded projects for the current academic year.',
            'category': 'Research & Innovation',
            'regulation_type': 'NAAC',
            'deadline': now + timedelta(days=15),
            'priority': 'medium',
            'target_departments': 'all',
            'academic_year': '2024-2025',
        },
        {
            'title': 'Infrastructure Audit Report 2024',
            'description': 'Complete the annual infrastructure audit checklist including lab equipment inventory, safety compliance, and maintenance records.',
            'category': 'Infrastructure',
            'regulation_type': 'AICTE',
            'deadline': now + timedelta(days=20),
            'priority': 'low',
            'target_departments': 'all',
            'academic_year': '2024-2025',
        },
        {
            'title': 'Placement & Internship Data Submission',
            'description': 'Submit placement statistics, internship completion data, and industry collaboration details for NIRF ranking.',
            'category': 'Placement & Internship',
            'regulation_type': 'UGC',
            'deadline': now + timedelta(days=10),
            'priority': 'high',
            'target_departments': 'all',
            'academic_year': '2024-2025',
        },
        {
            'title': 'Student Feedback Analysis Report',
            'description': 'Compile and analyze student feedback for all courses taught in the current semester. Submit statistical analysis and action taken reports.',
            'category': 'Student Activities',
            'regulation_type': 'NAAC',
            'deadline': now + timedelta(days=25),
            'priority': 'medium',
            'target_departments': 'all',
            'academic_year': '2024-2025',
        },
        {
            'title': 'UGC Regulation Compliance Checklist',
            'description': 'Complete the UGC regulation compliance checklist covering faculty qualifications, student-teacher ratio, and governance matters.',
            'category': 'Regulation Update',
            'regulation_type': 'UGC',
            'deadline': now + timedelta(days=35),
            'priority': 'high',
            'target_departments': 'all',
            'academic_year': '2024-2025',
        },
    ]

    for cd in circulars_data:
        circular = Circular(uploaded_by=admin.id, **cd)
        db.session.add(circular)

    db.session.flush()

    # ── Create notifications for all users ────────────────────────
    all_circulars = Circular.query.all()
    for user in users[1:]:  # Skip admin
        for circular in all_circulars[:3]:  # First 3 circulars
            n = Notification(
                user_id=user.id,
                title=f'New Circular: {circular.title}',
                message=f'{circular.category} circular published. {"Deadline: " + circular.deadline.strftime("%d %b %Y") if circular.deadline else ""}',
                type='circular', circular_id=circular.id,
            )
            db.session.add(n)

    # ── Create sample submissions ─────────────────────────────────
    from models import Submission
    faculty_users = [u for u in users if u.role == 'faculty']
    for i, faculty in enumerate(faculty_users[:4]):  # First 4 faculty submit for first circular
        sub = Submission(
            circular_id=all_circulars[0].id, user_id=faculty.id,
            remarks=f'Submitting SSR data for {faculty.department} department.',
            status='submitted' if i % 2 == 0 else 'approved',
            submitted_at=now - timedelta(days=5-i),
        )
        if sub.status == 'approved':
            sub.reviewed_at = now - timedelta(days=3-i)
            sub.reviewed_by = admin.id
            sub.admin_remarks = 'Looks good. Approved.'
        db.session.add(sub)

    db.session.commit()
    print(f"Seeded {len(users)} users, {len(circulars_data)} circulars, notifications, and sample submissions.")


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000, use_reloader=False)

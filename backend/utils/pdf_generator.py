"""
PDF report generation using ReportLab.
"""

import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT


def _get_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle('Title2', parent=styles['Title'], fontSize=20, spaceAfter=20))
    styles.add(ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=12,
                               textColor=colors.grey, alignment=TA_CENTER, spaceAfter=30))
    styles.add(ParagraphStyle('SectionHead', parent=styles['Heading2'], fontSize=14,
                               spaceAfter=12, spaceBefore=20,
                               textColor=colors.HexColor('#1a365d')))
    return styles


def generate_annual_report(academic_year: str) -> io.BytesIO:
    """Generate a comprehensive annual compliance report PDF."""
    from models import db, Circular, Submission, User

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            topMargin=30*mm, bottomMargin=20*mm,
                            leftMargin=20*mm, rightMargin=20*mm)
    styles = _get_styles()
    elements = []

    # Title
    elements.append(Paragraph('Regulatory Compliance Monitoring System', styles['Title2']))
    elements.append(Paragraph(f'Annual Report — Academic Year {academic_year}', styles['Subtitle']))
    elements.append(Paragraph(f'Generated on {datetime.now().strftime("%d %B %Y, %I:%M %p")}',
                               styles['Subtitle']))
    elements.append(Spacer(1, 20))

    # ── Overview ────────────────────────────────────────────────────
    circulars = Circular.query.filter_by(academic_year=academic_year).all()
    all_circulars = Circular.query.all() if not circulars else circulars
    total = len(all_circulars)
    completed = len([c for c in all_circulars if c.status == 'completed'])
    active = len([c for c in all_circulars if c.status == 'active'])

    all_submissions = []
    for c in all_circulars:
        all_submissions.extend(c.submissions)
    total_subs = len(all_submissions)
    approved = len([s for s in all_submissions if s.status == 'approved'])
    rejected = len([s for s in all_submissions if s.status == 'rejected'])
    pending = len([s for s in all_submissions if s.status in ('submitted', 'pending')])

    elements.append(Paragraph('1. Executive Summary', styles['SectionHead']))
    overview_data = [
        ['Metric', 'Value'],
        ['Total Circulars', str(total)],
        ['Active Circulars', str(active)],
        ['Completed Circulars', str(completed)],
        ['Total Submissions', str(total_subs)],
        ['Approved Submissions', str(approved)],
        ['Rejected Submissions', str(rejected)],
        ['Pending Submissions', str(pending)],
        ['Overall Compliance Rate', f'{round(approved/total_subs*100,1) if total_subs else 0}%'],
    ]
    t = Table(overview_data, colWidths=[200, 150])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a365d')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7fafc')]),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 20))

    # ── Category Breakdown ──────────────────────────────────────────
    elements.append(Paragraph('2. Category-wise Compliance', styles['SectionHead']))
    categories = {}
    for c in all_circulars:
        cat = c.category
        if cat not in categories:
            categories[cat] = {'total': 0, 'completed': 0, 'submissions': 0, 'approved': 0}
        categories[cat]['total'] += 1
        if c.status == 'completed':
            categories[cat]['completed'] += 1
        for s in c.submissions:
            categories[cat]['submissions'] += 1
            if s.status == 'approved':
                categories[cat]['approved'] += 1

    cat_data = [['Category', 'Circulars', 'Completed', 'Submissions', 'Approved', 'Rate']]
    for cat, d in sorted(categories.items()):
        rate = round(d['approved'] / d['submissions'] * 100, 1) if d['submissions'] else 0
        cat_data.append([cat, str(d['total']), str(d['completed']),
                         str(d['submissions']), str(d['approved']), f'{rate}%'])

    if len(cat_data) > 1:
        t2 = Table(cat_data, colWidths=[120, 60, 60, 70, 60, 50])
        t2.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d3748')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7fafc')]),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(t2)
    else:
        elements.append(Paragraph('No data available for categories.', styles['Normal']))
    elements.append(Spacer(1, 20))

    # ── Department Breakdown ────────────────────────────────────────
    elements.append(Paragraph('3. Department-wise Compliance', styles['SectionHead']))
    depts = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'BIOMEDICAL', 'MTECH CSE']
    dept_data = [['Department', 'Users', 'Submissions', 'Approved', 'Compliance Rate']]
    for dept in depts:
        dept_users = User.query.filter_by(department=dept, is_active=True).all()
        dept_user_ids = [u.id for u in dept_users]
        dept_subs = [s for s in all_submissions if s.user_id in dept_user_ids]
        dept_approved = [s for s in dept_subs if s.status == 'approved']
        rate = round(len(dept_approved) / len(dept_subs) * 100, 1) if dept_subs else 0
        dept_data.append([dept, str(len(dept_users)), str(len(dept_subs)),
                          str(len(dept_approved)), f'{rate}%'])

    t3 = Table(dept_data, colWidths=[100, 50, 70, 60, 100])
    t3.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d3748')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7fafc')]),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(t3)
    elements.append(Spacer(1, 20))

    # ── Accreditation Readiness ─────────────────────────────────────
    elements.append(Paragraph('4. Accreditation Readiness', styles['SectionHead']))
    reg_types = ['NAAC', 'NHERC', 'UGC', 'AICTE', 'NBA']
    acc_data = [['Body', 'Total', 'Completed', 'Readiness']]
    for rt in reg_types:
        rt_circulars = [c for c in all_circulars if c.regulation_type == rt]
        rt_total = len(rt_circulars)
        rt_completed = len([c for c in rt_circulars if c.status == 'completed'])
        readiness = round(rt_completed / rt_total * 100, 1) if rt_total else 0
        acc_data.append([rt, str(rt_total), str(rt_completed), f'{readiness}%'])

    t4 = Table(acc_data, colWidths=[80, 60, 70, 80])
    t4.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d3748')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7fafc')]),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(t4)

    # Footer
    elements.append(Spacer(1, 40))
    elements.append(Paragraph('— End of Report —', ParagraphStyle('Footer',
                               parent=styles['Normal'], alignment=TA_CENTER,
                               textColor=colors.grey, fontSize=10)))

    doc.build(elements)
    buffer.seek(0)
    return buffer


def generate_department_report(department: str, academic_year: str) -> io.BytesIO:
    """Generate a department-specific compliance report PDF."""
    from models import db, Circular, Submission, User

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            topMargin=30*mm, bottomMargin=20*mm,
                            leftMargin=20*mm, rightMargin=20*mm)
    styles = _get_styles()
    elements = []

    elements.append(Paragraph(f'{department} Department — Compliance Report', styles['Title2']))
    elements.append(Paragraph(f'Academic Year {academic_year}', styles['Subtitle']))
    elements.append(Paragraph(f'Generated on {datetime.now().strftime("%d %B %Y, %I:%M %p")}',
                               styles['Subtitle']))
    elements.append(Spacer(1, 20))

    # Department users
    dept_users = User.query.filter_by(department=department, is_active=True).all()
    dept_user_ids = [u.id for u in dept_users]

    # Relevant circulars
    circulars = Circular.query.filter(
        db.or_(
            Circular.target_departments == 'all',
            Circular.target_departments.ilike(f'%{department}%')
        )
    ).all()

    elements.append(Paragraph('1. Department Overview', styles['SectionHead']))
    overview = [
        ['Metric', 'Value'],
        ['Total Faculty', str(len(dept_users))],
        ['Relevant Circulars', str(len(circulars))],
    ]

    # Submissions
    dept_subs = Submission.query.filter(Submission.user_id.in_(dept_user_ids)).all() if dept_user_ids else []
    approved = len([s for s in dept_subs if s.status == 'approved'])
    overview.extend([
        ['Total Submissions', str(len(dept_subs))],
        ['Approved', str(approved)],
        ['Compliance Rate', f'{round(approved/len(dept_subs)*100,1) if dept_subs else 0}%'],
    ])

    t = Table(overview, colWidths=[200, 150])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a365d')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7fafc')]),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 20))

    # User-wise breakdown
    elements.append(Paragraph('2. Faculty-wise Submissions', styles['SectionHead']))
    user_data = [['Faculty', 'Role', 'Submissions', 'Approved', 'Rate']]
    for u in dept_users:
        u_subs = [s for s in dept_subs if s.user_id == u.id]
        u_approved = len([s for s in u_subs if s.status == 'approved'])
        rate = round(u_approved / len(u_subs) * 100, 1) if u_subs else 0
        user_data.append([u.name, u.role.upper(), str(len(u_subs)),
                          str(u_approved), f'{rate}%'])

    if len(user_data) > 1:
        t2 = Table(user_data, colWidths=[130, 60, 70, 60, 50])
        t2.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d3748')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7fafc')]),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(t2)

    elements.append(Spacer(1, 40))
    elements.append(Paragraph('— End of Report —', ParagraphStyle('Footer',
                               parent=styles['Normal'], alignment=TA_CENTER,
                               textColor=colors.grey, fontSize=10)))

    doc.build(elements)
    buffer.seek(0)
    return buffer

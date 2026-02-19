"""
Auto-categorize circulars based on title and description keywords.
"""

CATEGORY_KEYWORDS = {
    'Regulation Update': [
        'regulation', 'policy', 'compliance', 'guideline', 'amendment',
        'notification', 'gazette', 'statutory', 'rule', 'act', 'law',
        'circular', 'directive', 'mandate'
    ],
    'Hackathon Event': [
        'hackathon', 'coding', 'competition', 'challenge', 'ideathon',
        'makeathon', 'codeathon', 'smart india hackathon', 'sih'
    ],
    'Workshop / Seminar': [
        'workshop', 'seminar', 'webinar', 'conference', 'symposium',
        'training', 'session', 'talk', 'lecture', 'colloquium', 'fdp',
        'faculty development', 'hands-on', 'masterclass'
    ],
    'Curriculum Update': [
        'curriculum', 'syllabus', 'course', 'module', 'credit',
        'academic', 'program', 'elective', 'outcome', 'clo', 'plo',
        'lesson plan', 'pedagogy'
    ],
    'Infrastructure': [
        'infrastructure', 'lab', 'equipment', 'facility', 'building',
        'maintenance', 'renovation', 'construction', 'purchase',
        'procurement', 'library', 'computer'
    ],
    'Faculty Development': [
        'faculty', 'professional development', 'research', 'publication',
        'patent', 'paper', 'journal', 'certification', 'training program',
        'fip', 'sabbatical', 'orientation'
    ],
    'Student Activities': [
        'student', 'club', 'fest', 'cultural', 'sports', 'nss', 'ncc',
        'placement', 'internship', 'counseling', 'welfare', 'scholarship',
        'admission', 'mentor', 'alumni'
    ],
    'Audit & Accreditation': [
        'audit', 'accreditation', 'naac', 'nba', 'abet', 'nirf',
        'ranking', 'assessment', 'quality', 'iqac', 'ssr', 'sar',
        'peer team', 'inspection', 'review', 'nherc', 'ugc', 'aicte'
    ],
    'Examination': [
        'exam', 'examination', 'test', 'assessment', 'evaluation',
        'marks', 'grade', 'result', 'supplementary', 'revaluation',
        'internal', 'external', 'question paper', 'time table'
    ],
    'Research & Innovation': [
        'research', 'innovation', 'project', 'grant', 'funding',
        'startup', 'incubation', 'ipr', 'intellectual property',
        'collaboration', 'mou', 'consultancy'
    ],
    'Placement & Internship': [
        'placement', 'internship', 'recruit', 'company', 'interview',
        'campus', 'offer', 'package', 'industry', 'corporate'
    ],
}


def auto_categorize(text: str) -> str:
    """
    Categorize a circular based on keyword matching in the text.
    Returns the best-matching category or 'Other' if no match.
    """
    text_lower = text.lower()
    scores = {}

    for category, keywords in CATEGORY_KEYWORDS.items():
        score = 0
        for kw in keywords:
            if kw in text_lower:
                # Give more weight to longer keyword matches
                score += len(kw.split())
        if score > 0:
            scores[category] = score

    if not scores:
        return 'Other'

    return max(scores, key=scores.get)

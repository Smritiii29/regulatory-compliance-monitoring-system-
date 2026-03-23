"""
Extract deadline dates from circular text.
"""

import re
from datetime import datetime
from dateutil import parser as date_parser


def extract_deadline(text: str):
    """
    Try to extract a deadline date from text.
    Returns a datetime object or None.
    """
    if not text:
        return None

    text_lower = text.lower()

    # Common deadline patterns
    patterns = [
        # "deadline: 15 March 2025", "due date: 15/03/2025"
        r'(?:deadline|due\s*date|last\s*date|submit\s*(?:by|before)|on\s*or\s*before)[:\s]+(\d{1,2}[\s/\-\.]\w+[\s/\-\.]\d{2,4})',
        # "by 15th March 2025", "before March 15, 2025"
        r'(?:by|before|on\s+or\s+before)\s+(\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{2,4})',
        r'(?:by|before|on\s+or\s+before)\s+(\w+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{2,4})',
        # "15/03/2025", "15-03-2025", "2025-03-15"
        r'(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})',
        r'(\d{4}[/\-\.]\d{1,2}[/\-\.]\d{1,2})',
        # "March 15, 2025", "15 March 2025"
        r'(\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4})',
        r'((?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})',
    ]

    for pattern in patterns:
        match = re.search(pattern, text_lower)
        if match:
            date_str = match.group(1)
            # Remove ordinal suffixes
            date_str = re.sub(r'(\d+)(?:st|nd|rd|th)', r'\1', date_str)
            try:
                return date_parser.parse(date_str, fuzzy=True, dayfirst=True)
            except (ValueError, OverflowError):
                continue

    return None

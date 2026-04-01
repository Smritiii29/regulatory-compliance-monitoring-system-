import re
import time
from collections import OrderedDict

import requests


class ComplianceSummarizer:
    def __init__(self, api_key: str, model: str = 'gemini-2.5-flash'):
        if not api_key:
            raise ValueError('Gemini API key required')

        self.api_key = api_key
        self.model = model
        self.max_retries = 2
        self.request_timeout = (10, 45)
        self.max_input_chars = 18000
        self.max_keyword_lines = 40

        self.session = requests.Session()
        self.session.trust_env = False

    def normalize_text(self, text: str) -> str:
        text = (text or '').replace('\r\n', '\n').replace('\r', '\n').replace('\x00', ' ')
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    def chunk_text(self, text: str) -> str:
        normalized = self.normalize_text(text)
        if len(normalized) <= self.max_input_chars:
            return normalized

        keywords = (
            'must', 'shall', 'required', 'deadline', 'last date', 'submit',
            'compliance', 'eligibility', 'criteria', 'institute', 'program',
            'approval', 'document', 'fee', 'percentage',
        )

        keyword_lines = []
        seen = set()
        for line in normalized.splitlines():
            cleaned = line.strip()
            if len(cleaned) < 20:
                continue
            lowered = cleaned.lower()
            if any(keyword in lowered for keyword in keywords) and cleaned not in seen:
                keyword_lines.append(cleaned)
                seen.add(cleaned)
            if len(keyword_lines) >= self.max_keyword_lines:
                break

        opening = normalized[:8000]
        important = '\n'.join(keyword_lines)[:7000]
        closing = normalized[-3000:] if len(normalized) > 11000 else ''

        combined = '\n\n'.join(
            part for part in (
                opening,
                f'IMPORTANT EXTRACTS\n{important}' if important else '',
                f'ENDING EXTRACT\n{closing}' if closing else '',
            )
            if part
        )
        return combined[:self.max_input_chars]

    def format_summary(self, text: str) -> str:
        headings_map = {
            r"\d+\.\s*\*\*EXECUTIVE SUMMARY\*\*": "## EXECUTIVE SUMMARY",
            r"\d+\.\s*EXECUTIVE SUMMARY": "## EXECUTIVE SUMMARY",
            r"\d+\.\s*\*\*KEY REQUIREMENTS\*\*": "## KEY REQUIREMENTS",
            r"\d+\.\s*KEY REQUIREMENTS": "## KEY REQUIREMENTS",
            r"\d+\.\s*\*\*REQUIREMENTS\*\*": "## KEY REQUIREMENTS",
            r"\d+\.\s*REQUIREMENTS": "## KEY REQUIREMENTS",
            r"\d+\.\s*\*\*DEADLINES\*\*": "## DEADLINES",
            r"\d+\.\s*DEADLINES": "## DEADLINES",
            r"\d+\.\s*\*\*RESPONSIBLE PARTIES\*\*": "## RESPONSIBLE PARTIES",
            r"\d+\.\s*RESPONSIBLE PARTIES": "## RESPONSIBLE PARTIES",
            r"\d+\.\s*\*\*COMPLIANCE NOTES\*\*": "## COMPLIANCE NOTES",
            r"\d+\.\s*COMPLIANCE NOTES": "## COMPLIANCE NOTES",
        }

        for pattern, replacement in headings_map.items():
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)

        text = re.sub(r"^\s*\*\s+", "- ", text, flags=re.MULTILINE)
        text = re.sub(r"^\s*\d+\.\s+", "- ", text, flags=re.MULTILINE)
        text = re.sub(r"\n\s*\n\s*\n+", "\n\n", text)
        return text.strip()

    def extract_response_text(self, payload: dict) -> str:
        candidates = payload.get('candidates') or []
        for candidate in candidates:
            content = candidate.get('content') or {}
            for part in content.get('parts') or []:
                text = part.get('text')
                if text:
                    return text.strip()

        prompt_feedback = payload.get('promptFeedback') or {}
        block_reason = prompt_feedback.get('blockReason')
        if block_reason:
            raise RuntimeError(f'Gemini blocked the request: {block_reason}')

        raise RuntimeError('Empty response from Gemini model')

    def call_model(self, prompt: str, max_tokens: int = 1400) -> str:
        url = f'https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent'
        body = {
            'contents': [{'parts': [{'text': prompt}]}],
            'generationConfig': {
                'temperature': 0.1,
                'maxOutputTokens': max_tokens,
            },
        }

        last_error = None
        for attempt in range(self.max_retries):
            try:
                response = self.session.post(
                    url,
                    params={'key': self.api_key},
                    json=body,
                    timeout=self.request_timeout,
                )

                if response.status_code in (429, 500, 502, 503, 504) and attempt < self.max_retries - 1:
                    time.sleep(2 * (attempt + 1))
                    continue

                response.raise_for_status()
                return self.extract_response_text(response.json())
            except requests.Timeout as exc:
                last_error = RuntimeError('Gemini request timed out')
            except requests.RequestException as exc:
                detail = ''
                if exc.response is not None:
                    try:
                        detail = exc.response.json().get('error', {}).get('message', '')
                    except Exception:
                        detail = exc.response.text[:300]
                last_error = RuntimeError(detail or f'Gemini request failed: {exc}')
            except Exception as exc:
                last_error = RuntimeError(str(exc))

            if attempt < self.max_retries - 1:
                time.sleep(1.5)

        raise last_error or RuntimeError('Gemini request failed')

    def build_summary_prompt(self, text: str, title: str) -> str:
        return f"""You are summarizing a regulatory compliance circular for an academic institution.

Create a concise markdown summary using exactly these headings:

## EXECUTIVE SUMMARY
2-3 sentences.

## KEY REQUIREMENTS
Bullet points for the major actions, rules, numbers, and eligibility conditions.

## DEADLINES
Bullet points for any dates, timelines, last dates, or mention "Not explicitly stated."

## RESPONSIBLE PARTIES
Bullet points for who needs to act or who is affected.

## COMPLIANCE NOTES
Bullet points for exceptions, fees, approvals, supporting documents, or operational notes.

TITLE: {title}

DOCUMENT TEXT:
{text}
"""

    def build_fallback_summary(self, text: str, title: str = "") -> str:
        normalized = self.normalize_text(text)
        lines = [line.strip() for line in normalized.splitlines() if line.strip()]

        sentence_candidates = re.split(r'(?<=[.!?])\s+', normalized[:2500])
        executive = ' '.join(sentence_candidates[:2]).strip() or (lines[0] if lines else 'No readable text extracted.')

        requirement_keywords = ('must', 'shall', 'required', 'submit', 'compliance', 'approval', 'eligibility')
        requirement_lines = []
        seen_requirements = set()
        for line in lines:
            lowered = line.lower()
            if any(keyword in lowered for keyword in requirement_keywords) and line not in seen_requirements:
                requirement_lines.append(line)
                seen_requirements.add(line)
            if len(requirement_lines) >= 6:
                break

        date_patterns = [
            r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',
            r'\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b',
            r'\b[A-Za-z]{3,9}\s+\d{1,2},\s+\d{4}\b',
        ]
        dates = OrderedDict()
        for pattern in date_patterns:
            for match in re.findall(pattern, normalized):
                dates[match] = None

        party_keywords = ('admin', 'principal', 'hod', 'faculty', 'department', 'institute', 'institution', 'college')
        parties = []
        seen_parties = set()
        for line in lines:
            lowered = line.lower()
            if any(keyword in lowered for keyword in party_keywords) and line not in seen_parties:
                parties.append(line)
                seen_parties.add(line)
            if len(parties) >= 5:
                break

        notes = []
        if title:
            notes.append(f'Document title: {title}')
        notes.append('Summary generated directly from extracted document text.')
        if len(normalized) > self.max_input_chars:
            notes.append('A condensed portion of the document was used to keep the summary responsive.')

        def bullet_block(items, fallback):
            values = items if items else [fallback]
            return '\n'.join(f'- {item}' for item in values)

        return '\n\n'.join([
            '## EXECUTIVE SUMMARY',
            executive,
            '## KEY REQUIREMENTS',
            bullet_block(requirement_lines, 'No explicit requirements were automatically extracted.'),
            '## DEADLINES',
            bullet_block(list(dates.keys())[:6], 'Not explicitly stated.'),
            '## RESPONSIBLE PARTIES',
            bullet_block(parties, 'Not explicitly stated.'),
            '## COMPLIANCE NOTES',
            bullet_block(notes, 'No additional notes extracted.'),
        ]).strip()

    def summarize_long_document(self, text: str, title: str = "") -> tuple[str, str]:
        prepared_text = self.chunk_text(text)
        prompt = self.build_summary_prompt(prepared_text, title)

        try:
            summary = self.call_model(prompt, max_tokens=1400)
            return self.format_summary(summary), 'ai'
        except Exception:
            return self.build_fallback_summary(text, title), 'fallback'


def summarize_document(text: str, title: str = "", api_key: str = None) -> tuple[str, str]:
    summarizer = ComplianceSummarizer(api_key)
    return summarizer.summarize_long_document(text, title)

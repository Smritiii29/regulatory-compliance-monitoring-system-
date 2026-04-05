import re
import time
from typing import List

try:
    from google import genai as modern_genai
except ImportError:
    modern_genai = None

try:
    import google.generativeai as legacy_genai
except ImportError:
    legacy_genai = None


class ComplianceSummarizer:
    def __init__(self, api_key: str, model: str = 'gemini-2.5-flash'):
        self.model = model
        self.max_retries = 2
        self.retry_delay = 1
        self.last_request_time = 0.0
        # Keep a small gap between requests without forcing multi-minute summaries.
        self.min_interval = 1.0

        if modern_genai is not None:
            self.mode = 'modern'
            self.client = modern_genai.Client(api_key=api_key)
        elif legacy_genai is not None:
            self.mode = 'legacy'
            legacy_genai.configure(api_key=api_key)
            self.client = legacy_genai.GenerativeModel(model)
        else:
            raise ImportError(
                'No supported Gemini SDK installed. '
                'Install google-generativeai or google-genai.'
            )

    def throttle(self):
        """Keep requests below the configured rate limit."""
        current_time = time.time()
        elapsed = current_time - self.last_request_time

        if elapsed < self.min_interval:
            time.sleep(self.min_interval - elapsed)

        self.last_request_time = time.time()

    def chunk_text(self, text: str, max_chunk_size: int = 18000) -> List[str]:
        """Split text into logical chunks based on document structure."""
        chunks = []

        section_patterns = [
            r'\n(?:SECTION|CHAPTER|PART|ARTICLE)\s+[A-Z0-9]+',
            r'\n(?:\d+\.)?\s+(?:[A-Z][A-Za-z]+){2,}[\s:]*\n',
            r'\n(?:Subject|Reference|Eligibility|Requirements|Criteria|Program|Institute)',
        ]

        split_text = text
        for pattern in section_patterns:
            if re.search(pattern, split_text, re.IGNORECASE):
                split_text = re.split(pattern, split_text, flags=re.IGNORECASE)
                break

        if isinstance(split_text, str):
            split_text = [split_text]

        for section in split_text:
            if not section.strip():
                continue

            paragraphs = re.split(r'\n\s*\n+', section.strip())
            current_chunk = ""

            for para in paragraphs:
                para = para.strip()
                if not para:
                    continue

                if len(current_chunk) + len(para) + 2 < max_chunk_size:
                    current_chunk = f"{current_chunk}\n\n{para}".strip() if current_chunk else para
                else:
                    if current_chunk:
                        chunks.append(current_chunk)
                    current_chunk = para

            if current_chunk:
                chunks.append(current_chunk)

        return chunks if chunks else [text]

    def format_summary(self, text: str) -> str:
        headings_map = {
            r"\d+\.\s*\*\*EXECUTIVE SUMMARY\*\*": "## EXECUTIVE SUMMARY",
            r"\d+\.\s*EXECUTIVE SUMMARY": "## EXECUTIVE SUMMARY",
            r"\d+\.\s*\*\*KEY REQUIREMENTS\*\*": "## KEY REQUIREMENTS",
            r"\d+\.\s*KEY REQUIREMENTS": "## KEY REQUIREMENTS",
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

        sections = [
            'EXECUTIVE SUMMARY',
            'KEY REQUIREMENTS',
            'DEADLINES',
            'RESPONSIBLE PARTIES',
            'COMPLIANCE NOTES',
        ]

        for section in sections:
            text = re.sub(
                rf"## {re.escape(section)}\n(?:## {re.escape(section)}\n)+",
                f"## {section}\n",
                text,
            )

        return text.strip()

    def _extract_text(self, response) -> str:
        text = getattr(response, 'text', None)
        if text:
            return text.strip()
        raise ValueError('Empty response from Gemini model')

    def _call_modern_sdk(self, prompt: str, max_tokens: int) -> str:
        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=modern_genai.types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=max_tokens,
            ),
        )
        return self._extract_text(response)

    def _call_legacy_sdk(self, prompt: str, max_tokens: int) -> str:
        response = self.client.generate_content(
            prompt,
            generation_config=legacy_genai.types.GenerationConfig(
                temperature=0.1,
                max_output_tokens=max_tokens,
            ),
        )
        return self._extract_text(response)

    def call_model(self, prompt: str, max_tokens: int = 2000) -> str:
        """Centralized API call with retry and throttling."""
        for attempt in range(self.max_retries):
            try:
                self.throttle()

                if self.mode == 'modern':
                    return self._call_modern_sdk(prompt, max_tokens)
                return self._call_legacy_sdk(prompt, max_tokens)

            except Exception as exc:
                error_str = str(exc)

                if '429' in error_str or 'RESOURCE_EXHAUSTED' in error_str:
                    if attempt < self.max_retries - 1:
                        wait_time = min(60, self.retry_delay * (2 ** attempt))
                        time.sleep(wait_time)
                        continue

                return f"Error: {error_str}"

        return "Error: Max retries exceeded"

    def summarize_chunk(self, text: str) -> str:
        prompt = f"""Extract compliance facts from this document section.

TEXT:
{text}

Extract ONLY:
- Key requirements
- Programs/institutes
- Deadlines/dates
- Rules/exceptions
- Numbers/percentages

One line per fact."""

        return self.call_model(prompt, max_tokens=1200)

    def summarize_single_pass(self, text: str, title: str = "") -> str:
        prompt = f"""Create a concise structured compliance summary for this document.

TITLE: {title}

TEXT:
{text}

Return only:

## EXECUTIVE SUMMARY
2-3 short sentences.

## REQUIREMENTS
- Key compliance rules
- Eligibility / scope
- Required actions

## PROGRAMS/INSTITUTES
- Mention programs, institutions, or bodies if present

## EFFECTIVE DATE
- Mention dates, deadlines, or "Not specified"

## COMPLIANCE NOTES
- Important exceptions, numeric thresholds, or special conditions
"""
        return self.call_model(prompt, max_tokens=2200)

    def summarize_long_document(self, text: str, title: str = "") -> str:
        clean_text = text.strip()
        if not clean_text:
            return "Error: Empty document text"

        # Most documents in this app fit comfortably in a single fast request.
        if len(clean_text) <= 18000:
            return self.format_summary(self.summarize_single_pass(clean_text, title))

        chunks = self.chunk_text(clean_text)

        if len(chunks) == 1:
            facts = self.summarize_chunk(clean_text)
        else:
            chunk_facts = []

            for chunk in chunks:
                facts = self.summarize_chunk(chunk)
                if facts and not facts.startswith("Error"):
                    chunk_facts.append(facts)

            if not chunk_facts:
                fallback_text = clean_text[:18000]
                return self.format_summary(self.summarize_single_pass(fallback_text, title))

            facts = "\n".join(chunk_facts)

        consolidation_prompt = f"""Create a structured compliance summary.

TITLE: {title}

FACTS:
{facts}

Return:

## EXECUTIVE SUMMARY
2-3 sentences.

## REQUIREMENTS
All key rules.

## PROGRAMS/INSTITUTES

## EFFECTIVE DATE

## COMPLIANCE NOTES
"""

        final_summary = self.call_model(consolidation_prompt, max_tokens=3200)
        return self.format_summary(final_summary)


def summarize_document(text: str, title: str = "", api_key: str = None) -> str:
    if not api_key:
        raise ValueError("Gemini API key required")

    summarizer = ComplianceSummarizer(api_key)
    return summarizer.summarize_long_document(text, title)

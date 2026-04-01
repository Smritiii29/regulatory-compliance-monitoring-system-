```python
from google import genai
from typing import List
import re
import time


class ComplianceSummarizer:
    def __init__(self, api_key: str, model: str = 'gemini-2.5-flash'):
        self.client = genai.Client(api_key=api_key)
        self.model = model

        # Retry config
        self.max_retries = 3
        self.retry_delay = 2  # seconds

        # ✅ Rate limiting (5 requests per minute)
        self.last_request_time = 0
        self.min_interval = 60 / 5  # 12 seconds

    # ------------------ RATE LIMITER ------------------ #
    def throttle(self):
        """Ensure we do not exceed API rate limits."""
        current_time = time.time()
        elapsed = current_time - self.last_request_time

        if elapsed < self.min_interval:
            sleep_time = self.min_interval - elapsed
            time.sleep(sleep_time)

        self.last_request_time = time.time()

    # ------------------ CHUNKING ------------------ #
    def chunk_text(self, text: str, max_chunk_size: int = 12000) -> List[str]:
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
                    if current_chunk:
                        current_chunk += "\n\n" + para
                    else:
                        current_chunk = para
                else:
                    if current_chunk:
                        chunks.append(current_chunk)
                    current_chunk = para

            if current_chunk:
                chunks.append(current_chunk)

        return chunks if chunks else [text]

    # ------------------ FORMAT CLEANUP ------------------ #
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
            'COMPLIANCE NOTES'
        ]

        for section in sections:
            text = re.sub(
                rf"## {re.escape(section)}\n(?:## {re.escape(section)}\n)+",
                f"## {section}\n",
                text
            )

        return text.strip()

    # ------------------ API CALL ------------------ #
    def call_model(self, prompt: str, max_tokens: int = 2000) -> str:
        """Centralized API call with retry + throttling."""
        for attempt in range(self.max_retries):
            try:
                self.throttle()  # ✅ Prevent rate limit

                response = self.client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                    config=genai.types.GenerateContentConfig(
                        temperature=0.1,
                        max_output_tokens=max_tokens,
                    )
                )
                return response.text.strip()

            except Exception as e:
                error_str = str(e)

                if '429' in error_str or 'RESOURCE_EXHAUSTED' in error_str:
                    if attempt < self.max_retries - 1:
                        wait_time = min(60, self.retry_delay * (2 ** attempt))
                        time.sleep(wait_time)
                        continue

                return f"Error: {error_str}"

        return "Error: Max retries exceeded"

    # ------------------ CHUNK SUMMARIZATION ------------------ #
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

        return self.call_model(prompt, max_tokens=2000)

    # ------------------ MAIN PIPELINE ------------------ #
    def summarize_long_document(self, text: str, title: str = "") -> str:
        chunks = self.chunk_text(text)

        if len(chunks) == 1:
            facts = self.summarize_chunk(text)
        else:
            chunk_facts = []

            for chunk in chunks:
                facts = self.summarize_chunk(chunk)
                if facts and not facts.startswith("Error"):
                    chunk_facts.append(facts)

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

        final_summary = self.call_model(consolidation_prompt, max_tokens=15000)
        return self.format_summary(final_summary)


# ------------------ ENTRY FUNCTION ------------------ #
def summarize_document(text: str, title: str = "", api_key: str = None) -> str:
    if not api_key:
        raise ValueError("Gemini API key required")

    summarizer = ComplianceSummarizer(api_key)
    return summarizer.summarize_long_document(text, title)
```

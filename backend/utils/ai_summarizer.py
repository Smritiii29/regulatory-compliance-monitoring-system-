import google.generativeai as genai
from typing import List
import re

class ComplianceSummarizer:
    def __init__(self, api_key: str, model: str = 'gemini-1.5-flash'):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model)

    def chunk_text(self, text: str, max_chunk_size: int = 15000) -> List[str]:
        """Split long text into manageable chunks."""
        # Split by paragraphs first
        paragraphs = re.split(r'\n\s*\n', text)
        chunks = []
        current_chunk = ""

        for para in paragraphs:
            if len(current_chunk) + len(para) < max_chunk_size:
                current_chunk += para + "\n\n"
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = para + "\n\n"

        if current_chunk:
            chunks.append(current_chunk.strip())

        return chunks

    def summarize_chunk(self, text: str, context: str = "") -> str:
        """Summarize a single chunk of text."""
        prompt = f"""
You are a compliance analyst summarizing regulatory documents for educational institutions.

CONTEXT: {context}

DOCUMENT TEXT:
{text}

INSTRUCTIONS:
Extract and summarize the key compliance requirements, deadlines, responsibilities, and action items.
Focus on:
- Deadlines and submission dates
- Required actions/tasks
- Target departments or roles
- Compliance standards/regulations
- Consequences of non-compliance
- Supporting documents needed
- Contact information or authorities

Format your response as:
1. EXECUTIVE SUMMARY (2-3 sentences)
2. KEY REQUIREMENTS (bullet points)
3. DEADLINES (chronological list)
4. RESPONSIBLE PARTIES (who needs to do what)
5. COMPLIANCE NOTES (important warnings or conditions)

Be concise but comprehensive. Use clear, professional language.
"""

        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,
                    max_output_tokens=2048,
                )
            )
            return response.text.strip()
        except Exception as e:
            return f"Error summarizing chunk: {str(e)}"

    def summarize_long_document(self, text: str, title: str = "") -> str:
        """Summarize a long document by processing chunks and combining results."""
        chunks = self.chunk_text(text)

        if len(chunks) == 1:
            # Short document - summarize directly
            return self.summarize_chunk(text, f"Document: {title}")

        # Long document - summarize each chunk, then combine
        chunk_summaries = []
        for i, chunk in enumerate(chunks):
            context = f"Document: {title} - Part {i+1} of {len(chunks)}"
            summary = self.summarize_chunk(chunk, context)
            chunk_summaries.append(f"PART {i+1}:\n{summary}")

        # Combine all summaries
        combined_text = "\n\n".join(chunk_summaries)

        # Final consolidation prompt
        consolidation_prompt = f"""
You are consolidating multiple summaries of a long regulatory document.

DOCUMENT TITLE: {title}

INDIVIDUAL PART SUMMARIES:
{combined_text}

INSTRUCTIONS:
Create a unified, coherent summary that combines all the key information from the parts.
Eliminate redundancy while preserving all important details.
Maintain the same structured format as the individual summaries.

FINAL CONSOLIDATED SUMMARY:
"""

        try:
            response = self.model.generate_content(
                consolidation_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,
                    max_output_tokens=4096,
                )
            )
            return response.text.strip()
        except Exception as e:
            # Fallback: just combine the summaries
            return f"COMBINED SUMMARY FOR: {title}\n\n" + "\n\n".join(chunk_summaries)

def summarize_document(text: str, title: str = "", api_key: str = None) -> str:
    """Main function to summarize a document."""
    if not api_key:
        raise ValueError("Gemini API key required")

    summarizer = ComplianceSummarizer(api_key)
    return summarizer.summarize_long_document(text, title)
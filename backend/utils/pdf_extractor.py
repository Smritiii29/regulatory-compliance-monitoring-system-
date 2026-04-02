import pdfplumber
import docx
import os

def extract_pdf_text(file_path: str) -> str:
    """Extract text from PDF file."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"

    return text.strip()

def extract_docx_text(file_path: str) -> str:
    """Extract text from DOCX file."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    doc = docx.Document(file_path)
    text = ""
    for paragraph in doc.paragraphs:
        text += paragraph.text + "\n"

    return text.strip()

def extract_text(file_path: str) -> str:
    """Extract text from file based on extension."""
    if file_path.lower().endswith('.pdf'):
        return extract_pdf_text(file_path)
    elif file_path.lower().endswith('.docx'):
        return extract_docx_text(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_path}")
# resume_parser.py
"""
Resume parsing module for extracting text from PDF/DOCX files.
Supports batch processing and error handling.
"""

import PyPDF2
import docx
import re
from typing import Dict, List, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ResumeParser:
    """Extracts and preprocesses text from resume files."""
    
    def __init__(self):
        self.supported_formats = ['.pdf', '.docx', '.doc']
    
    def parse_pdf(self, file_path: str) -> str:
        """Extract text from PDF file."""
        try:
            text = ""
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
            return text.strip()
        except Exception as e:
            logger.error(f"Error parsing PDF {file_path}: {e}")
            return ""
    
    def parse_docx(self, file_path: str) -> str:
        """Extract text from DOCX file."""
        try:
            doc = docx.Document(file_path)
            text = "\n".join([para.text for para in doc.paragraphs])
            return text.strip()
        except Exception as e:
            logger.error(f"Error parsing DOCX {file_path}: {e}")
            return ""
    
    def parse_resume(self, file_path: str) -> str:
        """Parse resume based on file extension."""
        file_ext = file_path.lower().split('.')[-1]
        
        if file_ext == 'pdf':
            return self.parse_pdf(file_path)
        elif file_ext in ['docx', 'doc']:
            return self.parse_docx(file_path)
        else:
            logger.warning(f"Unsupported file format: {file_ext}")
            return ""
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize extracted text."""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters but keep important ones
        text = re.sub(r'[^\w\s\-\.\@\+\#]', ' ', text)
        # Normalize case
        text = text.lower()
        return text.strip()
    
    def parse_batch(self, file_paths: List[str]) -> List[Dict[str, str]]:
        """Parse multiple resumes and return structured data."""
        results = []
        
        for idx, file_path in enumerate(file_paths):
            try:
                raw_text = self.parse_resume(file_path)
                cleaned_text = self.clean_text(raw_text)
                
                results.append({
                    'id': idx,
                    'filename': file_path.split('/')[-1],
                    'raw_text': raw_text,
                    'cleaned_text': cleaned_text,
                    'status': 'success' if cleaned_text else 'empty'
                })
                
                logger.info(f"Successfully parsed: {file_path}")
                
            except Exception as e:
                logger.error(f"Failed to parse {file_path}: {e}")
                results.append({
                    'id': idx,
                    'filename': file_path.split('/')[-1],
                    'raw_text': '',
                    'cleaned_text': '',
                    'status': 'failed',
                    'error': str(e)
                })
        
        return results


# Example usage
if __name__ == "__main__":
    parser = ResumeParser()
    
    # Test single file
    text = parser.parse_resume("sample_resume.pdf")
    cleaned = parser.clean_text(text)
    print(f"Extracted {len(cleaned)} characters")
    
    # Test batch processing
    files = ["resume1.pdf", "resume2.docx", "resume3.pdf"]
    results = parser.parse_batch(files)
    print(f"Processed {len(results)} resumes")
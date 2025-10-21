# feature_extractor.py
"""
NLP-based feature extraction from resumes.
Extracts skills, education, experience, contact info, and candidate names.
"""

import re
import spacy
from typing import Dict, List, Set
import json

# Load spaCy model (install: python -m spacy download en_core_web_sm)
nlp = spacy.load("en_core_web_sm")


class FeatureExtractor:
    """Extract structured features from resume text."""
    
    def __init__(self, skills_db_path: str = "skills_database.json"):
        self.skills_database = self._load_skills_database(skills_db_path)
        
        # Education keywords
        self.education_keywords = {
            'bachelor': 3, 'b.tech': 3, 'b.e': 3, 'bs': 3, 'ba': 3,
            'master': 4, 'm.tech': 4, 'ms': 4, 'mba': 4, 'ma': 4,
            'phd': 5, 'doctorate': 5,
            'diploma': 2, 'certificate': 1
        }
        
        # Experience indicators
        self.experience_patterns = [
            r'(\d+)\+?\s*years?\s+(?:of\s+)?experience',
            r'experience\s+(?:of\s+)?(\d+)\+?\s*years?',
            r'worked\s+for\s+(\d+)\+?\s*years?'
        ]
    
    def _load_skills_database(self, path: str) -> Dict[str, List[str]]:
        """Load predefined skills database grouped by categories."""
        try:
            with open(path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            # Default skills database if file doesn't exist
            return {
                "programming": ["python", "java", "javascript", "c++", "c#", "ruby", "php", "go", "rust", "kotlin"],
                "web": ["react", "angular", "vue", "nodejs", "express", "django", "flask", "spring", "asp.net"],
                "database": ["mysql", "postgresql", "mongodb", "redis", "cassandra", "oracle", "sql", "nosql"],
                "cloud": ["aws", "azure", "gcp", "docker", "kubernetes", "jenkins", "terraform", "ansible"],
                "data_science": ["machine learning", "deep learning", "nlp", "computer vision", "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy"],
                "mobile": ["android", "ios", "react native", "flutter", "swift", "kotlin", "xamarin"],
                "tools": ["git", "jira", "confluence", "postman", "swagger", "linux", "agile", "scrum"],
                "soft_skills": ["leadership", "communication", "teamwork", "problem solving", "analytical", "critical thinking"]
            }
    
    def extract_name(self, text: str) -> str:
        """
        Extract candidate name from resume text.
        Uses multiple strategies to find the most likely name.
        """
        # Strategy 1: Look for name in first 500 characters (usually at top)
        doc = nlp(text[:500])
        
        # Get all PERSON entities
        person_entities = [ent.text for ent in doc.ents if ent.label_ == "PERSON"]
        
        if person_entities:
            # Return the first person name found (usually the candidate's name)
            name = person_entities[0].strip()
            # Clean up the name
            name = re.sub(r'\s+', ' ', name)
            return name
        
        # Strategy 2: Look for common name patterns in first few lines
        lines = text.split('\n')[:10]
        for line in lines:
            line = line.strip()
            # Look for lines that are 2-4 words, capitalized, and not too long
            words = line.split()
            if 2 <= len(words) <= 4 and len(line) < 50:
                # Check if it looks like a name (all words capitalized)
                if all(word[0].isupper() for word in words if word):
                    # Avoid common resume section headers
                    if not any(keyword in line.lower() for keyword in 
                              ['resume', 'curriculum', 'vitae', 'profile', 'summary', 
                               'objective', 'contact', 'education', 'experience']):
                        return line
        
        # Strategy 3: Fallback - return "Candidate" + resume number
        return "Unknown Candidate"
    
    def extract_skills(self, text: str) -> Dict[str, List[str]]:
        """Extract technical and soft skills from text."""
        found_skills = {}
        text_lower = text.lower()
        
        for category, skills in self.skills_database.items():
            matched = []
            for skill in skills:
                # Use word boundaries for accurate matching
                pattern = r'\b' + re.escape(skill.lower()) + r'\b'
                if re.search(pattern, text_lower):
                    matched.append(skill)
            
            if matched:
                found_skills[category] = matched
        
        return found_skills
    
    def extract_education(self, text: str) -> Dict[str, any]:
        """Extract education level and degrees."""
        text_lower = text.lower()
        highest_level = 0
        degrees = []
        
        for keyword, level in self.education_keywords.items():
            if keyword in text_lower:
                degrees.append(keyword)
                highest_level = max(highest_level, level)
        
        # Extract university names using NER
        doc = nlp(text)
        universities = [ent.text for ent in doc.ents if ent.label_ == "ORG"]
        
        return {
            'highest_level': highest_level,
            'degrees': list(set(degrees)),
            'universities': universities[:3]  # Top 3 mentions
        }
    
    def extract_experience(self, text: str) -> Dict[str, any]:
        """Extract years of experience."""
        years = []
        
        for pattern in self.experience_patterns:
            matches = re.findall(pattern, text.lower())
            years.extend([int(y) for y in matches])
        
        # Extract company names using NER
        doc = nlp(text)
        companies = [ent.text for ent in doc.ents if ent.label_ == "ORG"]
        
        return {
            'years': max(years) if years else 0,
            'companies': companies[:5]  # Top 5 mentions
        }
    
    def extract_contact_info(self, text: str) -> Dict[str, str]:
        """Extract email and phone number."""
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        phone_pattern = r'\b\d{10}\b|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b'
        
        emails = re.findall(email_pattern, text)
        phones = re.findall(phone_pattern, text)
        
        return {
            'email': emails[0] if emails else None,
            'phone': phones[0] if phones else None
        }
    
    def extract_all_features(self, text: str) -> Dict:
        """Extract all features from resume text."""
        return {
            'name': self.extract_name(text),
            'skills': self.extract_skills(text),
            'education': self.extract_education(text),
            'experience': self.extract_experience(text),
            'contact': self.extract_contact_info(text)
        }
    
    def process_batch(self, parsed_resumes: List[Dict]) -> List[Dict]:
        """Process multiple resumes and extract features."""
        results = []
        
        for resume in parsed_resumes:
            if resume['status'] != 'success':
                continue
            
            features = self.extract_all_features(resume['cleaned_text'])
            
            results.append({
                'id': resume['id'],
                'filename': resume['filename'],
                'name': features['name'],  # ✅ Added name field
                'skills': features['skills'],
                'education': features['education'],
                'experience': features['experience'],
                'contact': features['contact']
            })
        
        return results


# Example usage
if __name__ == "__main__":
    extractor = FeatureExtractor()
    
    # Test name extraction
    sample_text = """
    John Michael Smith
    Senior Software Engineer
    john.smith@email.com | +1-555-123-4567
    
    PROFESSIONAL SUMMARY
    Experienced software engineer with 5+ years of experience...
    """
    
    name = extractor.extract_name(sample_text)
    print(f"Extracted name: {name}")
    
    features = extractor.extract_all_features(sample_text)
    print(f"All features: {features}")
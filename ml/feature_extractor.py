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
        Uses multiple strategies with confidence scoring.
        """
        # ✅ ADD LOGGING AT THE START
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info("=" * 50)
        logger.info("Starting name extraction...")
        logger.info(f"First 200 chars of text:\n{text[:200]}")
        logger.info("=" * 50)
        
        # Strategy 1: Look for name in first 1000 characters (extended range)
        doc = nlp(text[:1000])
        
        # Get all PERSON entities with their positions
        person_entities = [(ent.text.strip(), ent.start_char) for ent in doc.ents if ent.label_ == "PERSON"]
        
        # ✅ ADD LOGGING FOR STRATEGY 1
        logger.info(f"Strategy 1 - SpaCy NER found {len(person_entities)} PERSON entities: {person_entities}")
        
        # Filter out common false positives
        false_positives = ['resume', 'cv', 'curriculum vitae', 'dear', 'sir', 'madam', 'hiring', 'manager']
        person_entities = [(name, pos) for name, pos in person_entities 
                        if not any(fp in name.lower() for fp in false_positives)]
        
        # ✅ ADD LOGGING AFTER FILTERING
        logger.info(f"After filtering false positives: {person_entities}")
        
        if person_entities:
            # Return the FIRST person entity (usually the candidate's name at top)
            name = person_entities[0][0]
            # Clean up the name
            name = re.sub(r'\s+', ' ', name)
            # Validate name (should be 2-5 words, mostly alphabetic)
            words = name.split()
            if 2 <= len(words) <= 5 and all(word[0].isupper() for word in words if word):
                # ✅ ADD SUCCESS LOGGING
                logger.info(f"✅ Strategy 1 SUCCESS - Extracted name: '{name}'")
                return name
            else:
                # ✅ ADD FAILURE LOGGING
                logger.warning(f"❌ Strategy 1 FAILED validation - Name: '{name}', Words: {words}")
        
        # Strategy 2: Look for name patterns in first 15 lines
        # ✅ ADD LOGGING FOR STRATEGY 2
        logger.info("Strategy 1 failed, trying Strategy 2 - Line pattern matching...")
        
        lines = text.split('\n')[:15]
        logger.info(f"Analyzing first {len(lines)} lines")
        
        # Common resume section headers to avoid
        section_keywords = [
            'resume', 'curriculum', 'vitae', 'profile', 'summary', 'objective', 
            'contact', 'education', 'experience', 'skills', 'projects', 'work',
            'email', 'phone', 'address', 'linkedin', 'github', 'portfolio'
        ]
        
        for i, line in enumerate(lines):
            line = line.strip()
            
            # Skip empty lines or lines with special characters
            if not line or len(line) < 3 or any(char in line for char in ['@', '|', ':', '•']):
                continue
            
            words = line.split()
            
            # ✅ ADD DETAILED LOGGING FOR EACH LINE
            logger.debug(f"Line {i}: '{line}' - Words: {len(words)}")
            
            # Name should be 2-4 words, properly capitalized, not too long
            if 2 <= len(words) <= 4 and len(line) < 50:
                # Check if all words start with capital letter
                if all(word[0].isupper() and word.isalpha() for word in words):
                    # Check it's not a section header
                    if not any(keyword in line.lower() for keyword in section_keywords):
                        # ✅ ADD SUCCESS LOGGING
                        logger.info(f"✅ Strategy 2 SUCCESS - Extracted name from line {i}: '{line}'")
                        return line
                    else:
                        logger.debug(f"Line {i} rejected - matches section keyword")
                else:
                    logger.debug(f"Line {i} rejected - capitalization check failed")
        
        # Strategy 3: Look for email prefix (name often appears before @)
        # ✅ ADD LOGGING FOR STRATEGY 3
        logger.info("Strategy 2 failed, trying Strategy 3 - Email prefix extraction...")
        
        email_pattern = r'([A-Za-z]+(?:\s+[A-Za-z]+)?)\s*[:\-]?\s*([a-zA-Z0-9._%+-]+@)'
        email_match = re.search(email_pattern, text[:500])
        
        if email_match:
            potential_name = email_match.group(1).strip()
            logger.info(f"Found potential name near email: '{potential_name}'")
            words = potential_name.split()
            if 1 <= len(words) <= 3:
                # ✅ ADD SUCCESS LOGGING
                result = potential_name.title()
                logger.info(f"✅ Strategy 3 SUCCESS - Extracted name: '{result}'")
                return result
        else:
            logger.info("No email pattern found")
        
        # Strategy 4: Fallback - return first line if it looks like a name
        # ✅ ADD LOGGING FOR STRATEGY 4
        logger.info("Strategy 3 failed, trying Strategy 4 - First line fallback...")
        
        first_line = text.split('\n')[0].strip()
        logger.info(f"First line: '{first_line}'")
        
        words = first_line.split()
        if 2 <= len(words) <= 4 and len(first_line) < 50:
            if all(word[0].isupper() for word in words if word.isalpha()):
                # ✅ ADD SUCCESS LOGGING
                logger.info(f"✅ Strategy 4 SUCCESS - Using first line: '{first_line}'")
                return first_line
            else:
                logger.warning(f"First line failed capitalization check: {words}")
        else:
            logger.warning(f"First line failed length check - Words: {len(words)}, Length: {len(first_line)}")
        
        # ✅ ADD FINAL FAILURE LOGGING
        logger.error("❌ ALL STRATEGIES FAILED - Returning 'Unknown Candidate'")
        logger.info("=" * 50)
        
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
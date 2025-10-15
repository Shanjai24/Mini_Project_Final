# ml_matcher.py
"""
ML-based resume matching using Sentence Transformers and cosine similarity.
Supports fine-tuning for specific job roles.
"""

import numpy as np
from sentence_transformers import SentenceTransformer, util
from sklearn.preprocessing import MinMaxScaler
from typing import Dict, List, Tuple
import pickle
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ResumeJobMatcher:
    """Match resumes with job descriptions using semantic similarity."""
    
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        """
        Initialize with a pre-trained sentence transformer model.
        Options: 'all-MiniLM-L6-v2' (fast), 'all-mpnet-base-v2' (better quality)
        """
        self.model = SentenceTransformer(model_name)
        self.scaler = MinMaxScaler()
        logger.info(f"Loaded model: {model_name}")
    
    def create_resume_embedding(self, features: Dict) -> str:
        """Convert structured features into a single text representation."""
        parts = []
        
        # Add skills
        if 'skills' in features and features['skills']:
            all_skills = []
            for category, skills in features['skills'].items():
                all_skills.extend(skills)
            parts.append(f"Skills: {', '.join(all_skills)}")
        
        # Add education
        if 'education' in features and features['education']['degrees']:
            degrees = ', '.join(features['education']['degrees'])
            parts.append(f"Education: {degrees}")
        
        # Add experience
        if 'experience' in features and features['experience']['years']:
            years = features['experience']['years']
            parts.append(f"Experience: {years} years")
        
        return ". ".join(parts)
    
    def compute_semantic_similarity(self, resume_text: str, job_description: str) -> float:
        """Compute cosine similarity between resume and job description."""
        resume_embedding = self.model.encode(resume_text, convert_to_tensor=True)
        job_embedding = self.model.encode(job_description, convert_to_tensor=True)
        
        similarity = util.cos_sim(resume_embedding, job_embedding).item()
        return similarity
    
    def compute_feature_score(self, features: Dict, job_requirements: Dict) -> float:
        """Compute rule-based feature matching score."""
        score = 0.0
        max_score = 0.0
        
        # Skills matching (weight: 0.5)
        if 'required_skills' in job_requirements:
            required = set([s.lower() for s in job_requirements['required_skills']])
            candidate_skills = set()
            if 'skills' in features:
                for skills_list in features['skills'].values():
                    candidate_skills.update([s.lower() for s in skills_list])
            
            if required:
                skill_match = len(required & candidate_skills) / len(required)
                score += skill_match * 50
            max_score += 50
        
        # Education matching (weight: 0.2)
        if 'min_education_level' in job_requirements:
            min_level = job_requirements['min_education_level']
            candidate_level = features.get('education', {}).get('highest_level', 0)
            if candidate_level >= min_level:
                score += 20
            max_score += 20
        
        # Experience matching (weight: 0.3)
        if 'min_experience' in job_requirements:
            min_exp = job_requirements['min_experience']
            candidate_exp = features.get('experience', {}).get('years', 0)
            if candidate_exp >= min_exp:
                score += 30
            elif candidate_exp > 0:
                # Partial credit for some experience
                score += (candidate_exp / min_exp) * 30
            max_score += 30
        
        return (score / max_score * 100) if max_score > 0 else 0
    
    def match_resume_to_job(
        self, 
        resume_features: Dict, 
        job_description: str,
        job_requirements: Dict,
        weights: Dict = None
    ) -> Dict:
        """
        Match a single resume to a job.
        
        Args:
            resume_features: Extracted features from resume
            job_description: Full job description text
            job_requirements: Structured requirements (skills, education, experience)
            weights: Custom weights for scoring (semantic_weight, feature_weight)
        
        Returns:
            Dict with matching score and details
        """
        if weights is None:
            weights = {'semantic_weight': 0.6, 'feature_weight': 0.4}
        
        # Create resume text for embedding
        resume_text = self.create_resume_embedding(resume_features)
        
        # Compute semantic similarity
        semantic_score = self.compute_semantic_similarity(resume_text, job_description)
        semantic_score = max(0, min(100, semantic_score * 100))  # Scale to 0-100
        
        # Compute feature-based score
        feature_score = self.compute_feature_score(resume_features, job_requirements)
        
        # Weighted final score
        final_score = (
            semantic_score * weights['semantic_weight'] +
            feature_score * weights['feature_weight']
        )
        
        return {
            'final_score': round(final_score, 2),
            'semantic_score': round(semantic_score, 2),
            'feature_score': round(feature_score, 2),
            'breakdown': {
                'matched_skills': self._get_matched_skills(resume_features, job_requirements),
                'education_match': self._check_education_match(resume_features, job_requirements),
                'experience_match': self._check_experience_match(resume_features, job_requirements)
            }
        }
    
    def _get_matched_skills(self, features: Dict, requirements: Dict) -> List[str]:
        """Get list of matched skills."""
        if 'required_skills' not in requirements:
            return []
        
        required = set([s.lower() for s in requirements['required_skills']])
        candidate_skills = set()
        if 'skills' in features:
            for skills_list in features['skills'].values():
                candidate_skills.update([s.lower() for s in skills_list])
        
        return list(required & candidate_skills)
    
    def _check_education_match(self, features: Dict, requirements: Dict) -> bool:
        """Check if education requirement is met."""
        if 'min_education_level' not in requirements:
            return True
        
        min_level = requirements['min_education_level']
        candidate_level = features.get('education', {}).get('highest_level', 0)
        return candidate_level >= min_level
    
    def _check_experience_match(self, features: Dict, requirements: Dict) -> bool:
        """Check if experience requirement is met."""
        if 'min_experience' not in requirements:
            return True
        
        min_exp = requirements['min_experience']
        candidate_exp = features.get('experience', {}).get('years', 0)
        return candidate_exp >= min_exp
    
    def rank_candidates(
        self,
        candidates: List[Dict],
        job_description: str,
        job_requirements: Dict,
        top_n: int = 5
    ) -> List[Dict]:
        """
        Rank all candidates and return top N.
        
        Args:
            candidates: List of dicts with 'id', 'filename', 'features'
            job_description: Job description text
            job_requirements: Structured job requirements
            top_n: Number of top candidates to return
        
        Returns:
            Sorted list of top N candidates with scores
        """
        scored_candidates = []
        
        for candidate in candidates:
            try:
                match_result = self.match_resume_to_job(
                    candidate['features'],
                    job_description,
                    job_requirements
                )
                
                scored_candidates.append({
                    'id': candidate['id'],
                    'filename': candidate['filename'],
                    'score': match_result['final_score'],
                    'semantic_score': match_result['semantic_score'],
                    'feature_score': match_result['feature_score'],
                    'breakdown': match_result['breakdown']
                })
                
            except Exception as e:
                logger.error(f"Error matching candidate {candidate['filename']}: {e}")
        
        # Sort by score descending
        scored_candidates.sort(key=lambda x: x['score'], reverse=True)
        
        return scored_candidates[:top_n]
    
    def save_model(self, path: str):
        """Save the model configuration."""
        with open(path, 'wb') as f:
            pickle.dump({
                'model_name': self.model._model_card_vars.get('model_name', 'unknown'),
                'scaler': self.scaler
            }, f)
        logger.info(f"Model saved to {path}")
    
    def load_model(self, path: str):
        """Load a saved model configuration."""
        with open(path, 'rb') as f:
            config = pickle.load(f)
            self.scaler = config['scaler']
        logger.info(f"Model loaded from {path}")


# Example usage
if __name__ == "__main__":
    matcher = ResumeJobMatcher()
    
    # Sample job description
    job_desc = """
    We are looking for a Senior Python Developer with 3+ years of experience.
    Must have strong skills in Python, Django, PostgreSQL, and AWS.
    Bachelor's degree in Computer Science required.
    """
    
    job_reqs = {
        'required_skills': ['python', 'django', 'postgresql', 'aws'],
        'min_education_level': 3,  # Bachelor's
        'min_experience': 3
    }
    
    # Sample candidate features
    candidate = {
        'id': 1,
        'filename': 'john_doe.pdf',
        'features': {
            'skills': {
                'programming': ['python', 'java'],
                'web': ['django', 'flask'],
                'database': ['postgresql', 'mongodb'],
                'cloud': ['aws', 'docker']
            },
            'education': {'highest_level': 4, 'degrees': ['master']},
            'experience': {'years': 5}
        }
    }
    
    result = matcher.match_resume_to_job(
        candidate['features'],
        job_desc,
        job_reqs
    )
    
    print(f"Match Score: {result['final_score']}")
    print(f"Matched Skills: {result['breakdown']['matched_skills']}")
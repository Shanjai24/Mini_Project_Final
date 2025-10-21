# ml_matcher.py
"""
Machine Learning based Resume-Job Matching
Uses semantic similarity and feature-based scoring
"""

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from typing import List, Dict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ResumeJobMatcher:
    """Match resumes with job descriptions using hybrid approach."""
    
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        """
        Initialize the matcher with a pre-trained sentence transformer model.
        
        Args:
            model_name: HuggingFace model name for sentence embeddings
        """
        self.model = SentenceTransformer(model_name)
        logger.info(f"Loaded model: {model_name}")
    
    def compute_semantic_similarity(self, resume_texts: List[str], job_description: str) -> List[float]:
        """
        Compute semantic similarity between resumes and job description.
        
        Args:
            resume_texts: List of resume text strings
            job_description: Job description text
            
        Returns:
            List of similarity scores (0-1) for each resume
        """
        # Encode job description
        job_embedding = self.model.encode([job_description], convert_to_tensor=False)
        
        # Encode all resumes
        resume_embeddings = self.model.encode(resume_texts, convert_to_tensor=False)
        
        # Compute cosine similarity
        similarities = cosine_similarity(resume_embeddings, job_embedding)
        
        # Flatten and return as list
        return similarities.flatten().tolist()
    
    def compute_feature_score(self, candidate: Dict, job_requirements: Dict) -> tuple:
        """
        Compute feature-based matching score.
        
        Args:
            candidate: Dictionary with extracted features
            job_requirements: Dictionary with required_skills, min_education_level, min_experience
            
        Returns:
            Tuple of (score, breakdown_dict)
        """
        score = 0.0
        breakdown = {
            'matched_skills': [],
            'education_match': False,
            'experience_match': False,
            'skill_score': 0.0,
            'education_score': 0.0,
            'experience_score': 0.0
        }
        
        # 1. Skills matching (60% weight)
        required_skills = set(s.lower() for s in job_requirements.get('required_skills', []))
        if required_skills:
            # Flatten candidate skills
            candidate_skills = set()
            for skill_category, skills in candidate.get('skills', {}).items():
                candidate_skills.update(s.lower() for s in skills)
            
            # Find matches
            matched = required_skills.intersection(candidate_skills)
            breakdown['matched_skills'] = list(matched)
            
            # Calculate skill score
            skill_match_ratio = len(matched) / len(required_skills) if required_skills else 0
            breakdown['skill_score'] = skill_match_ratio
            score += skill_match_ratio * 0.6
        
        # 2. Education matching (20% weight)
        min_education = job_requirements.get('min_education_level', 0)
        candidate_education = candidate.get('education', {}).get('highest_level', 0)
        
        if candidate_education >= min_education:
            breakdown['education_match'] = True
            breakdown['education_score'] = 1.0
            score += 0.2
        else:
            # Partial credit
            education_ratio = candidate_education / min_education if min_education > 0 else 0
            breakdown['education_score'] = education_ratio
            score += education_ratio * 0.2
        
        # 3. Experience matching (20% weight)
        min_experience = job_requirements.get('min_experience', 0)
        candidate_experience = candidate.get('experience', {}).get('years', 0)
        
        if candidate_experience >= min_experience:
            breakdown['experience_match'] = True
            breakdown['experience_score'] = 1.0
            score += 0.2
        else:
            # Partial credit
            experience_ratio = candidate_experience / min_experience if min_experience > 0 else 0
            breakdown['experience_score'] = experience_ratio
            score += experience_ratio * 0.2
        
        return score, breakdown
    
    def rank_candidates(
        self, 
        candidates: List[Dict], 
        job_description: str, 
        job_requirements: Dict,
        top_n: int = 5
    ) -> List[Dict]:
        """
        Rank candidates based on job description and requirements.
        Returns top N candidates with detailed scores.
        
        Args:
            candidates: List of candidate dictionaries with extracted features
            job_description: Job description text
            job_requirements: Dictionary with required skills/education/experience
            top_n: Number of top candidates to return
            
        Returns:
            List of top N candidates with scores and breakdowns
        """
        # Extract resume texts for semantic matching
        # Use a combination of skills and experience for better matching
        resume_texts = []
        for candidate in candidates:
            # Build a representative text from candidate features
            text_parts = []
            
            # Add skills
            for category, skills in candidate.get('skills', {}).items():
                text_parts.extend(skills)
            
            # Add education
            education = candidate.get('education', {})
            text_parts.extend(education.get('degrees', []))
            
            # Add experience info
            experience = candidate.get('experience', {})
            if experience.get('years', 0) > 0:
                text_parts.append(f"{experience['years']} years experience")
            
            resume_texts.append(" ".join(text_parts))
        
        # Compute semantic similarity scores
        semantic_scores = self.compute_semantic_similarity(resume_texts, job_description)
        
        results = []
        
        for idx, candidate in enumerate(candidates):
            # Rule-based feature matching
            feature_score, breakdown = self.compute_feature_score(
                candidate,
                job_requirements
            )
            
            # Weighted final score (60% semantic, 40% feature-based)
            final_score = (
                0.6 * semantic_scores[idx] +
                0.4 * feature_score
            )
            
            results.append({
                'id': candidate['id'],
                'filename': candidate['filename'],
                'candidate_name': candidate.get('name', 'Unknown Candidate'),  # ✅ Include name
                'score': round(final_score * 100, 2),
                'semantic_score': round(semantic_scores[idx] * 100, 2),
                'feature_score': round(feature_score * 100, 2),
                'breakdown': breakdown
            })
        
        # Sort by final score descending
        results.sort(key=lambda x: x['score'], reverse=True)
        
        return results[:top_n]
    
    def explain_match(self, candidate_result: Dict) -> str:
        """
        Generate human-readable explanation of match.
        
        Args:
            candidate_result: Result dictionary from rank_candidates
            
        Returns:
            Explanation string
        """
        breakdown = candidate_result['breakdown']
        
        explanation = f"Candidate: {candidate_result['candidate_name']}\n"
        explanation += f"Overall Score: {candidate_result['score']}%\n\n"
        
        explanation += "Breakdown:\n"
        explanation += f"- Semantic Match: {candidate_result['semantic_score']}%\n"
        explanation += f"- Feature Match: {candidate_result['feature_score']}%\n\n"
        
        explanation += f"Skills Matched: {len(breakdown['matched_skills'])}\n"
        if breakdown['matched_skills']:
            explanation += f"  {', '.join(breakdown['matched_skills'])}\n"
        
        explanation += f"Education: {'✓' if breakdown['education_match'] else '✗'}\n"
        explanation += f"Experience: {'✓' if breakdown['experience_match'] else '✗'}\n"
        
        return explanation


# Example usage
if __name__ == "__main__":
    # Test the matcher
    matcher = ResumeJobMatcher()
    
    # Sample data
    candidates = [
        {
            'id': 1,
            'filename': 'resume1.pdf',
            'name': 'John Doe',
            'skills': {
                'programming': ['python', 'javascript'],
                'web': ['react', 'nodejs']
            },
            'education': {'highest_level': 3, 'degrees': ['bachelor']},
            'experience': {'years': 5}
        },
        {
            'id': 2,
            'filename': 'resume2.pdf',
            'name': 'Jane Smith',
            'skills': {
                'programming': ['java', 'python'],
                'database': ['mysql']
            },
            'education': {'highest_level': 4, 'degrees': ['master']},
            'experience': {'years': 3}
        }
    ]
    
    job_description = "Looking for a Python developer with React experience"
    job_requirements = {
        'required_skills': ['python', 'react'],
        'min_education_level': 3,
        'min_experience': 2
    }
    
    results = matcher.rank_candidates(candidates, job_description, job_requirements)
    
    for result in results:
        print(matcher.explain_match(result))
        print("-" * 50)
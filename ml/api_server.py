# api_server.py
"""
FastAPI server for HR Seeker resume matching system.
Provides endpoints for bulk resume upload and matching.
"""

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
import tempfile
import os
import json
from pathlib import Path
import logging

# Import our custom modules
from resume_parser import ResumeParser
from feature_extractor import FeatureExtractor
from ml_matcher import ResumeJobMatcher

app = FastAPI(title="HR Seeker API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://*.vercel.app",
        "https://miniprojectfinal-production.up.railway.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
parser = ResumeParser()
extractor = FeatureExtractor()
matcher = ResumeJobMatcher()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Pydantic models
class JobRequirements(BaseModel):
    required_skills: List[str]
    min_education_level: int = 0  # 0=None, 1=Certificate, 2=Diploma, 3=Bachelor, 4=Master, 5=PhD
    min_experience: int = 0
    preferred_skills: Optional[List[str]] = []


class MatchRequest(BaseModel):
    job_description: str
    job_requirements: JobRequirements
    top_n: int = 5


class CandidateResult(BaseModel):
    id: int
    filename: str
    candidate_name: str  # ✅ NEW: Add candidate name field
    score: float
    semantic_score: float
    feature_score: float
    matched_skills: List[str]
    education_match: bool
    experience_match: bool


class MatchResponse(BaseModel):
    success: bool
    total_resumes: int
    top_candidates: List[CandidateResult]
    message: str


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "service": "HR Seeker API",
        "status": "running",
        "version": "1.0.0"
    }


@app.post("/api/match-resumes", response_model=MatchResponse)
async def match_resumes(
    files: List[UploadFile] = File(...),
    job_description: str = Form(...),
    job_requirements: str = Form(...),
    top_n: int = Form(5)
):
    """
    Upload bulk resumes and match them with a job description.
    
    Args:
        files: List of resume files (PDF/DOCX)
        job_description: Full job description text
        job_requirements: JSON string with required_skills, min_education_level, min_experience
        top_n: Number of top candidates to return
    
    Returns:
        Ranked list of top N candidates with match scores
    """
    
    try:
        # Validate input
        if not files:
            raise HTTPException(status_code=400, detail="No files uploaded")
        
        if not job_description:
            raise HTTPException(status_code=400, detail="Job description is required")
        
        # Validate number of files
        if len(files) < 5 or len(files) > 20:
            raise HTTPException(
                status_code=400,
                detail="Please upload between 5 and 20 resume files"
            )
        
        # Parse job requirements
        try:
            job_reqs_dict = json.loads(job_requirements)
            job_reqs = JobRequirements(**job_reqs_dict)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid job requirements format: {str(e)}"
            )
        
        # Create temporary directory for uploaded files
        with tempfile.TemporaryDirectory() as temp_dir:
            file_paths = []
            original_filenames = []
            
            # Save uploaded files and preserve original filenames
            for idx, file in enumerate(files):
                file_ext = Path(file.filename).suffix
                if file_ext.lower() not in ['.pdf', '.docx', '.doc']:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Unsupported file format: {file.filename}"
                    )
                
                temp_path = os.path.join(temp_dir, f"resume_{idx}{file_ext}")
                with open(temp_path, "wb") as f:
                    content = await file.read()
                    f.write(content)
                file_paths.append(temp_path)
                original_filenames.append(file.filename)  # Store original filename
            
            # Step 1: Parse resumes
            parsed_resumes = parser.parse_batch(file_paths)
            
            # Replace temp filenames with original filenames
            for idx, resume in enumerate(parsed_resumes):
                if idx < len(original_filenames):
                    resume['filename'] = original_filenames[idx]
            
            # Filter out failed parses
            valid_resumes = [r for r in parsed_resumes if r['status'] == 'success']
            
            if not valid_resumes:
                raise HTTPException(
                    status_code=400,
                    detail="Failed to parse any resumes. Please check file formats."
                )
            
            # Step 2: Extract features
            candidates_with_features = extractor.process_batch(valid_resumes)
            
            # Step 3: Match and rank candidates
            job_reqs_dict = {
                'required_skills': job_reqs.required_skills,
                'min_education_level': job_reqs.min_education_level,
                'min_experience': job_reqs.min_experience
            }
            
            top_candidates = matcher.rank_candidates(
                candidates_with_features,
                job_description,
                job_reqs_dict,
                top_n
            )
            
            # Format response
            candidate_results = [
    CandidateResult(
        id=c['id'],
        filename=c['filename'],
        candidate_name=c.get('candidate_name', 'Unknown Candidate'),  # ✅ NEW
        score=c['score'],
        semantic_score=c['semantic_score'],
        feature_score=c['feature_score'],
        matched_skills=c['breakdown']['matched_skills'],
        education_match=c['breakdown']['education_match'],
        experience_match=c['breakdown']['experience_match']
    )
    for c in top_candidates
]
            
            return MatchResponse(
                success=True,
                total_resumes=len(valid_resumes),
                top_candidates=candidate_results,
                message=f"Successfully ranked {len(valid_resumes)} candidates"
            )
    
    except Exception as e:
        logger.error(f"Error processing resumes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/parse-single-resume")
async def parse_single_resume(file: UploadFile = File(...)):
    """
    Parse a single resume and return extracted features (for testing).
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        file_ext = Path(file.filename).suffix
        temp_path = os.path.join(temp_dir, f"temp_resume{file_ext}")
        
        with open(temp_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Parse and extract features
        text = parser.parse_resume(temp_path)
        cleaned_text = parser.clean_text(text)
        features = extractor.extract_all_features(cleaned_text)
        
        return {
            "filename": file.filename,
            "text_length": len(cleaned_text),
            "features": features
        }


@app.get("/api/supported-skills")
async def get_supported_skills():
    """Get list of all skills in the database."""
    return {
        "skills_database": extractor.skills_database
    }


@app.post("/api/add-skills")
async def add_skills(category: str = Form(...), skills: str = Form(...)):
    """
    Add new skills to the database.
    
    Args:
        category: Skill category (e.g., "programming", "web", "tools")
        skills: Comma-separated list of skills
    """
    new_skills = [s.strip() for s in skills.split(',')]
    
    if category not in extractor.skills_database:
        extractor.skills_database[category] = []
    
    extractor.skills_database[category].extend(new_skills)
    
    # Save updated skills database
    with open("skills_database.json", "w") as f:
        json.dump(extractor.skills_database, f, indent=2)
    
    return {
        "success": True,
        "message": f"Added {len(new_skills)} skills to category '{category}'",
        "category": category,
        "added_skills": new_skills
    }
@app.post("/api/analyze-student-resume")
async def analyze_student_resume(file: UploadFile = File(...)):
    """
    Analyze a single student resume and provide:
    - ATS score
    - Extracted skills
    - Best role match
    - Recommendations
    """
    temp_path = None
    try:
        # Save uploaded file temporarily
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # ✅ Use existing parser
        resume_text = parser.parse_resume(temp_path)
        cleaned_text = parser.clean_text(resume_text)
        
        # ✅ IMPROVED: Extract candidate name using feature extractor
        features = extractor.extract_all_features(cleaned_text)
        candidate_name = features.get('name', 'Unknown Candidate')

        # Fallback if extraction failed
        if candidate_name == 'Unknown Candidate':
            logger.warning("Name extraction failed, trying fallback method")
            lines = cleaned_text.split('\n')
            for line in lines[:10]:
                line = line.strip()
                # Skip lines with email, phone, or numbers
                if not line or '@' in line or any(char.isdigit() for char in line[:20]):
                    continue
                words = line.split()
                # Name should be 2-4 words, capitalized, not too long
                if 2 <= len(words) <= 4 and len(line) < 50:
                    if all(w[0].isupper() for w in words if w.isalpha()):
                        excluded = ['resume', 'cv', 'curriculum', 'vitae', 'profile', 'summary', 
                                'objective', 'education', 'experience', 'skills', 'contact']
                        if not any(e in line.lower() for e in excluded):
                            candidate_name = line
                            logger.info(f"Fallback extracted name: {candidate_name}")
                            break
        
        # ✅ Use existing feature extractor
        features = extractor.extract_all_features(cleaned_text)
        
        # ✅ FIX: Handle skills extraction properly
        raw_skills = features.get('skills', [])
        
        # Convert to list if it's a dict or other structure
        if isinstance(raw_skills, dict):
            extracted_skills = list(raw_skills.keys())
        elif isinstance(raw_skills, list):
            extracted_skills = raw_skills
        else:
            extracted_skills = []
        
        # Ensure all skills are strings and lowercase
        extracted_skills = [str(skill).lower() for skill in extracted_skills if skill]
        
        # Calculate ATS score
        score = 50  # Base score
        
        # Check for key sections
        sections = ['experience', 'education', 'skills', 'projects']
        for section in sections:
            if section in cleaned_text.lower():
                score += 8
        
        # Check for contact information
        if '@' in cleaned_text:  # Email
            score += 5
        if any(char.isdigit() for char in cleaned_text[:200]):  # Phone in header
            score += 5
        
        # Skills count bonus
        if len(extracted_skills) >= 10:
            score += 10
        elif len(extracted_skills) >= 5:
            score += 5
        
        # Length check
        word_count = len(cleaned_text.split())
        if 300 <= word_count <= 1000:
            score += 10
        elif 200 <= word_count < 300 or 1000 < word_count <= 1500:
            score += 5
        
        ats_score = min(score, 100)
        
        # Define role requirements
        role_requirements = {
            "Software Engineer": ["python", "java", "javascript", "react", "node.js", "git", "sql", "api", "restful", "agile"],
            "Data Scientist": ["python", "machine learning", "pandas", "numpy", "sql", "tensorflow", "scikit-learn", "statistics", "deep learning", "data visualization"],
            "Frontend Developer": ["javascript", "react", "angular", "vue", "html", "css", "typescript", "webpack", "redux", "sass"],
            "Backend Developer": ["python", "java", "node.js", "sql", "mongodb", "api", "microservices", "docker", "kubernetes", "aws"],
            "Full Stack Developer": ["javascript", "react", "node.js", "python", "sql", "mongodb", "api", "git", "aws", "docker"],
            "DevOps Engineer": ["docker", "kubernetes", "aws", "ci/cd", "jenkins", "terraform", "ansible", "linux", "git", "monitoring"],
            "Data Analyst": ["sql", "excel", "python", "tableau", "power bi", "data visualization", "statistics", "pandas", "reporting"],
            "Product Manager": ["agile", "jira", "product strategy", "roadmap", "stakeholder management", "analytics", "user research"],
            "Business Analyst": ["sql", "excel", "business intelligence", "requirements gathering", "documentation", "stakeholder management"],
            "Mobile Developer": ["react native", "flutter", "swift", "kotlin", "android", "ios", "mobile ui", "api integration"]
        }
        
        # Calculate match for each role
        all_roles = {}
        for role_name, required_skills in role_requirements.items():
            # ✅ FIX: Safer skill matching
            matched_skills = []
            for skill in extracted_skills:
                for req in required_skills:
                    if req.lower() in skill or skill in req.lower():
                        matched_skills.append(skill)
                        break
            
            match_percentage = int((len(matched_skills) / len(required_skills)) * 100) if required_skills else 0
            
            missing_skills = []
            for req in required_skills:
                if not any(req.lower() in skill or skill in req.lower() for skill in extracted_skills):
                    missing_skills.append(req)
            
            all_roles[role_name] = {
                "match_percentage": match_percentage,
                "matched_count": len(matched_skills),
                "total_required": len(required_skills),
                "matched_skills": matched_skills[:10],
                "missing_skills": missing_skills[:5]
            }
        
        # Find best role match
        best_role_name = max(all_roles.items(), key=lambda x: x[1]["match_percentage"])[0]
        best_role_data = all_roles[best_role_name]
        
        
        
        # Clean up temp file
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        
        return {
    "candidate_name": candidate_name,
    "ats_score": ats_score,
    "extracted_skills": extracted_skills[:30],
    "best_role": {
        "role": best_role_name,
        "match_percentage": best_role_data["match_percentage"],
        "matched_count": best_role_data["matched_count"],
        "total_required": best_role_data["total_required"],
        "matched_skills": best_role_data["matched_skills"],
        "missing_skills": best_role_data["missing_skills"]
    }
}
        
    except Exception as e:
        logger.error(f"Error analyzing student resume: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())  # ✅ Log full traceback for debugging
        
        # Clean up temp file on error
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass
        
        raise HTTPException(status_code=500, detail=f"Error analyzing resume: {str(e)}")

# Run the server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
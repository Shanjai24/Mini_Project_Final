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
    allow_origins=["*"],  # Update with your frontend URL in production
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


# Run the server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
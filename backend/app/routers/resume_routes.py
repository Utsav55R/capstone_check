import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.database import get_db
from app.models import User, StudentProfile, ResumeAnalysis, ReadinessHistory
from app.auth import get_current_user
from app.services.nlp_engine import nlp_analyzer
from app.services.readiness_engine import readiness_engine
from app.services.learning_path_engine import LearningPathEngine, get_learning_path_engine

router = APIRouter(prefix="/resume", tags=["Resume Intelligence"])

# Enough to keep a whole resume, so core-skill matching for the adaptive assessment sees everything
PARSED_TEXT_MAX_CHARS = 20_000

class TextResumeInput(BaseModel):
    text: str
    target_role: Optional[str] = None
    custom_jd: Optional[str] = None  # custom job description for targeted JD matching


@router.post("/analyze-file")
async def analyze_resume_file(
    file: UploadFile = File(...),
    target_role: Optional[str] = Form(None),
    custom_jd: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    engine: LearningPathEngine = Depends(get_learning_path_engine)
):
    """
    Analyze a PDF/DOCX resume file.
    Optionally pass `target_role` and `custom_jd` as form fields.
    """
    contents = await file.read()
    filename = file.filename or "resume.pdf"

    extracted_text = nlp_analyzer.extract_text_from_file(filename, contents)
    if not extracted_text or len(extracted_text.strip()) < 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract readable text from the uploaded file. "
                   "Please ensure it is a valid text-based PDF or DOCX."
        )

    return await _process_and_save_resume(
        extracted_text, filename, current_user, db, engine,
        override_target_role=target_role,
        custom_jd=custom_jd or ""
    )


@router.post("/analyze-text")
async def analyze_resume_text(
    payload: TextResumeInput,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    engine: LearningPathEngine = Depends(get_learning_path_engine)
):
    """
    Analyze resume pasted as plain text.
    Optionally include `target_role` and `custom_jd` in the JSON body.
    """
    if len(payload.text.strip()) < 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume text is too short. Please provide comprehensive resume content."
        )
    return await _process_and_save_resume(
        payload.text, "pasted_resume.txt", current_user, db, engine,
        override_target_role=payload.target_role,
        custom_jd=payload.custom_jd or ""
    )


@router.post("/analyze")
async def analyze_resume_alias(
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    target_role: Optional[str] = Form(None),
    custom_jd: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    engine: LearningPathEngine = Depends(get_learning_path_engine)
):
    """
    Unified endpoint for POST /api/v1/resume/analyze supporting file upload or form text input.
    """
    if file:
        contents = await file.read()
        filename = file.filename or "resume.pdf"
        extracted_text = nlp_analyzer.extract_text_from_file(filename, contents)
    elif text:
        extracted_text = text
        filename = "pasted_resume.txt"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide either a file or resume text to analyze."
        )

    if not extracted_text or len(extracted_text.strip()) < 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume text is too short or unreadable."
        )

    return await _process_and_save_resume(
        extracted_text, filename, current_user, db, engine,
        override_target_role=target_role,
        custom_jd=custom_jd or ""
    )


@router.get("/sample-resume")
async def get_sample_resume():
    """Returns a realistic sample resume for testing the AI/ML Engineer feedback loop."""
    sample = (
        "ALEX CHEN\n"
        "Email: alex.chen@university.edu | Phone: +1-555-0199 | LinkedIn: linkedin.com/in/alexchen-ai | GitHub: github.com/alexchen-ml\n\n"
        "EDUCATION\n"
        "B.Tech in Computer Science & Engineering | CGPA: 8.8/10.0 | Expected 2025\n\n"
        "TECHNICAL SKILLS\n"
        "Languages: Python, SQL, C++, Bash, HTML, CSS\n"
        "ML/Data Science: Machine Learning, Scikit-learn, Pandas, NumPy, Deep Learning, Matplotlib, Seaborn, Feature Engineering\n"
        "Web & Tools: FastAPI, Git, GitHub, REST APIs, Linux, SQLite\n"
        "Foundations: Data Structures, Algorithms, Dynamic Programming, Database Management (SQL)\n\n"
        "PROJECTS\n"
        "1. Predictive Customer Churn Analytics Platform\n"
        "- Engineered supervised classification models using Scikit-Learn Random Forest and XGBoost.\n"
        "- Addressed class imbalance using SMOTE and evaluated models using Precision-Recall AUC.\n"
        "- Served inference API using FastAPI, handling 150 requests per minute with 92% precision.\n\n"
        "2. Algorithmic Trading Backtester\n"
        "- Implemented quantitative strategy simulator in Python evaluating risk-adjusted Sharpe ratios.\n"
        "- Utilized SQL databases for time-series tick retrieval, improving query execution time by 40%.\n\n"
        "EXPERIENCE\n"
        "Machine Learning Intern | DataCore Solutions (Summer 2024)\n"
        "- Developed automated data validation pipelines using Pandas and Scikit-learn.\n"
        "- Collaborated with senior engineers to implement RESTful endpoints in Python."
    )
    return {"sample_text": sample}


async def _process_and_save_resume(
    text: str,
    filename: str,
    user: User,
    db: AsyncSession,
    engine: LearningPathEngine,
    override_target_role: Optional[str] = None,
    custom_jd: str = "",
):
    # Fetch profile to identify role
    stmt = select(StudentProfile).where(StudentProfile.user_id == user.id)
    res = await db.execute(stmt)
    profile = res.scalars().first()
    target_role = override_target_role or (profile.target_role if profile else user.target_role)

    # Run NLP analysis — pass custom_jd through
    analysis = nlp_analyzer.evaluate_ats(text, target_role, custom_jd=custom_jd or None)

    # Save ResumeAnalysis record
    record = ResumeAnalysis(
        user_id=user.id,
        original_filename=filename,
        parsed_text=text[:PARSED_TEXT_MAX_CHARS],
        ats_score=analysis["ats_score"],
        formatting_score=analysis["formatting_score"],
        keyword_score=analysis["keyword_score"],
        extracted_skills=analysis["extracted_skills"],
        matched_skills=analysis["matched_skills"],
        missing_skills=analysis["missing_skills"],
        tech_stack_gaps=analysis["tech_stack_gaps"],
        suggestions=analysis["suggestions"]
    )
    db.add(record)

    # How many of the target field's core skills the resume shows -> skill assessment level
    core_skill_match = None
    field = engine.resolve_field(target_role)
    learning_path = engine.get_learning_path(field) if field else None
    if learning_path:
        # Match the stored (truncated) text, as /assessment/plan does, so the card and the plan agree
        core_skill_match = engine.core_skill_summary(field, learning_path, record.parsed_text, record.extracted_skills)

    # Closed-loop update: sync resume quality into student profile & re-evaluate
    old_readiness = profile.overall_readiness if profile else 68.0
    overall = old_readiness
    if profile:
        profile.resume_quality_score = analysis["ats_score"]

        dims = {
            "python": profile.python_score,
            "sql": profile.sql_score,
            "ml": profile.ml_score,
            "deep_learning": profile.deep_learning_score,
            "dsa": profile.dsa_score,
            "projects": profile.projects_score,
            "resume_quality": profile.resume_quality_score,
            "interview_readiness": profile.interview_readiness_score,
            "comm_readiness": profile.comm_readiness_score,
        }
        overall, tier, priority_actions, _ = readiness_engine.calculate_readiness(
            target_role, dims
        )
        profile.overall_readiness = overall
        profile.readiness_tier = tier
        profile.priority_actions = priority_actions

        # Add history point
        score_change = round(overall - old_readiness, 1)
        history = ReadinessHistory(
            user_id=user.id,
            overall_readiness=overall,
            dimension_scores=dims,
            trigger_event=f"Resume Analyzed ({filename})",
            score_change=score_change
        )
        db.add(history)

    await db.commit()

    return {
        "id": record.id,
        "original_filename": filename,
        "ats_score": analysis["ats_score"],
        "overall_ats_score": analysis["ats_score"],
        "formatting_score": analysis["formatting_score"],
        "keyword_score": analysis["keyword_score"],
        "vector_match_pct": analysis["vector_match_pct"],
        "extracted_skills": analysis["extracted_skills"],
        "matched_skills": analysis["matched_skills"],
        "missing_skills": analysis["missing_skills"],
        "tech_stack_gaps": analysis["tech_stack_gaps"],
        "achievement_metric_gaps": analysis["achievement_metric_gaps"],
        "suggestions": analysis["suggestions"],
        "target_role": target_role,
        "used_custom_jd": analysis.get("used_custom_jd", False),
        "domain_diagnostics": analysis.get("domain_diagnostics", {}),
        "core_skill_match": core_skill_match,
        "updated_overall_readiness": profile.overall_readiness if profile else overall,
    }

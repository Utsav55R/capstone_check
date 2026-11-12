from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Dict, Optional, Tuple, Any

from app.database import get_db
from app.models import User, StudentProfile, AssessmentLog, AssessmentAttempt, ReadinessHistory
from app.auth import get_current_user
from app.schemas import AssessmentSubmitRequest
from app.services.assessment_engine import DEFAULT_LEVEL, LEVEL_MIXES
from app.services.learning_path_engine import (
    FieldNotAvailable, LearningPathEngine, get_learning_path_engine, get_target_role, load_learner_context, utcnow,
)
from app.services.readiness_engine import readiness_engine

router = APIRouter(prefix="/assessment", tags=["AI Skill Assessment"])

# Profile scores each track's assessment feeds in the closed loop:
# (field raised from the overall score, field raised from the Practical Knowledge score)
TRACK_PROFILE_FIELDS = {
    "AI / ML Engineer": ("ml_score", "deep_learning_score"),
    "Full Stack Developer": ("dsa_score", "projects_score"),
    "Cloud / DevOps Engineer": ("projects_score", "python_score"),
    "Game Developer": ("dsa_score", "projects_score"),
    "Data Analyst": ("sql_score", "python_score"),
    "Data Engineer": ("sql_score", "python_score"),
}

def _resolve_track_or_404(engine: LearningPathEngine, track: str) -> str:
    canonical = engine.resolve_field(track)
    if canonical is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No assessment available for track '{track}'")
    return canonical

def _roadmap_field_or_404(engine: LearningPathEngine, track: str) -> Tuple[str, Dict[str, Any]]:
    try:
        return engine.require_field(track)
    except FieldNotAvailable as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

ALREADY_SUBMITTED = "This assessment was already submitted. Load a new assessment plan to retake it."

async def _issued_attempt_or_error(
    engine: LearningPathEngine, db: AsyncSession, user_id: int, payload: AssessmentSubmitRequest
) -> AssessmentAttempt:
    """The open attempt this submission answers: by `attempt_id`, or else the attempt issued with
    exactly these `question_ids`. Only questions a plan issued can be scored or revealed."""
    stmt = select(AssessmentAttempt).where(AssessmentAttempt.user_id == user_id)
    if payload.attempt_id is not None:
        res = await db.execute(stmt.where(AssessmentAttempt.id == payload.attempt_id))
        attempt = res.scalars().first()
        if attempt is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment attempt not found")
        if attempt.submitted_at is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=ALREADY_SUBMITTED)
        return attempt

    track = _resolve_track_or_404(engine, payload.track)
    if not payload.question_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submit the attempt_id or question_ids from GET /assessment/plan",
        )
    wanted = set(payload.question_ids)
    res = await db.execute(stmt.where(AssessmentAttempt.track == track).order_by(AssessmentAttempt.id.desc()))
    matching = [a for a in res.scalars().all() if set(a.question_ids or []) == wanted]
    attempt = next((a for a in matching if a.submitted_at is None), None)
    if attempt is None:
        if matching:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=ALREADY_SUBMITTED)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="These questions were not issued by GET /assessment/plan. Load a new assessment plan.",
        )
    return attempt

@router.get("/questions")
async def get_questions(
    track: str = "AI / ML Engineer",
    engine: LearningPathEngine = Depends(get_learning_path_engine)
):
    """Legacy, unauthenticated: a random draw in the Intermediate mix (3 Easy / 4 Intermediate / 3 Advanced)."""
    track = _resolve_track_or_404(engine, track)
    raw_qs = engine.bank.draw_attempt_questions(track)
    # Strip correct answers before returning to frontend
    safe_qs = []
    for q in raw_qs:
        safe_qs.append({
            "id": q["id"],
            "topic": q["topic"],
            "difficulty": q["difficulty"],
            "dimension": q["dimension"],
            "question": q["question"],
            "options": q["options"]
        })
    return {"track": track, "level": DEFAULT_LEVEL, "total_questions": len(safe_qs), "questions": safe_qs}

@router.get("/plan")
async def get_assessment_plan(
    track: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    engine: LearningPathEngine = Depends(get_learning_path_engine)
):
    """Resume-adaptive 10-question assessment: the question mix follows how many of the field's
    core skills the latest resume shows, and weak steps get more questions."""
    field, lp = _roadmap_field_or_404(engine, track or await get_target_role(db, current_user))
    ctx = await load_learner_context(engine, db, current_user.id, field, lp)
    questions = engine.draw_assessment(
        field, ctx.level, {w["step"] for w in ctx.weak_steps}, ctx.previous_assessment_ids
    )
    # Stored server-side: a submission can only score (and reveal) these questions, once
    attempt = AssessmentAttempt(
        user_id=current_user.id,
        track=field,
        level=ctx.level,
        question_ids=[q["id"] for q in questions],
        issued_at=utcnow(),
    )
    db.add(attempt)
    await db.commit()

    titles = engine.step_titles(lp)
    return {
        "attempt_id": attempt.id,
        "track": field,
        "resume": {
            "has_resume": ctx.resume is not None,
            "filename": ctx.resume.original_filename if ctx.resume else None,
            "analyzed_at": ctx.resume.created_at.isoformat() if ctx.resume and ctx.resume.created_at else None,
        },
        "core_skills": ctx.core_skills,
        "matched_count": ctx.matched_count,
        "total_core_skills": len(ctx.core_skills),
        "level": ctx.level,
        "mix": dict(LEVEL_MIXES[ctx.level]),
        "weak_topics": ctx.weak_steps,
        "total_questions": len(questions),
        "questions": [engine.public_question(q, titles) for q in questions],
    }

@router.post("/submit")
async def submit_assessment(
    payload: AssessmentSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    engine: LearningPathEngine = Depends(get_learning_path_engine)
):
    user_id = current_user.id  # read before any rollback expires the instance
    attempt = await _issued_attempt_or_error(engine, db, user_id, payload)
    track = attempt.track
    issued = list(attempt.question_ids or [])
    try:
        eval_res = engine.bank.evaluate_answers(track, payload.answers, issued)
    except (KeyError, ValueError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Conditional update: of two concurrent submissions only one can win
    res = await db.execute(
        update(AssessmentAttempt)
        .where(AssessmentAttempt.id == attempt.id, AssessmentAttempt.submitted_at.is_(None))
        .values(submitted_at=utcnow())
        .execution_options(synchronize_session=False)
    )
    if res.rowcount != 1:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=ALREADY_SUBMITTED)

    issued_set = set(issued)

    # Per-step score, so the student sees which roadmap steps need work
    lp = engine.get_learning_path(track)
    titles = engine.step_titles(lp) if lp else {}
    by_step: Dict[int, Dict[str, Any]] = {}
    for item in eval_res["question_log"]:
        step = item["step"]
        if not isinstance(step, int):
            continue
        row = by_step.setdefault(step, {"step": step, "title": titles.get(step, f"Step {step}"), "correct": 0, "total": 0})
        row["total"] += 1
        row["correct"] += item["is_correct"]
    step_breakdown = [by_step[s] for s in sorted(by_step)]

    # Save to database; questions_data feeds the weak steps of later plans
    log = AssessmentLog(
        user_id=user_id,
        track=track,
        level=attempt.level,
        questions_data=eval_res["question_log"],
        answers_data={str(qid): choice for qid, choice in payload.answers.items() if qid in issued_set},
        overall_score=eval_res["overall_score"],
        concept_understanding=eval_res["dimension_scores"].get("Concept Understanding"),
        problem_solving=eval_res["dimension_scores"].get("Problem Solving"),
        practical_knowledge=eval_res["dimension_scores"].get("Practical Knowledge"),
        system_design=eval_res["dimension_scores"].get("System Design"),
        tech_communication=eval_res["dimension_scores"].get("Technical Communication"),
        weak_topics=eval_res["weak_topics"],
        strong_topics=eval_res["strong_topics"]
    )
    db.add(log)

    # Closed-loop update into StudentProfile
    stmt = select(StudentProfile).where(StudentProfile.user_id == user_id)
    res = await db.execute(stmt)
    profile = res.scalars().first()

    if profile:
        old_readiness = profile.overall_readiness
        # Update the profile scores this track measures based on assessment performance
        # E.g. for AI / ML the overall score maps to ML and Practical Knowledge maps to DL
        profile_fields = TRACK_PROFILE_FIELDS.get(track)
        if profile_fields:
            overall_field, practical_field = profile_fields
            setattr(profile, overall_field, round(max(getattr(profile, overall_field), eval_res["overall_score"] * 0.9 + 10.0), 1))
            practical_score = eval_res["dimension_scores"].get("Practical Knowledge", 45.0)
            setattr(profile, practical_field, round(max(getattr(profile, practical_field), practical_score * 0.8 + 15.0), 1))

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
            profile.target_role, dims
        )
        profile.overall_readiness = overall
        profile.readiness_tier = tier
        profile.priority_actions = priority_actions

        score_change = round(overall - old_readiness, 1)
        history = ReadinessHistory(
            user_id=user_id,
            overall_readiness=overall,
            dimension_scores=dims,
            trigger_event=f"Skill Assessment Completed ({track})"[:100],
            score_change=score_change
        )
        db.add(history)

    await db.commit()

    return {
        "attempt_id": attempt.id,
        "track": track,
        "level": attempt.level,
        "overall_score": eval_res["overall_score"],
        "dimension_scores": eval_res["dimension_scores"],
        "proficiency_tier": eval_res["proficiency_tier"],
        "weak_topics": eval_res["weak_topics"],
        "strong_topics": eval_res["strong_topics"],
        "correct_answers": eval_res["correct_answers"],
        "total_questions": eval_res["total_questions"],
        "updated_overall_readiness": profile.overall_readiness if profile else eval_res["overall_score"],
        "priority_actions": profile.priority_actions if profile else [],
        "results": eval_res["results"],
        "step_breakdown": step_breakdown,
    }

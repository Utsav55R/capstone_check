from typing import Any, Dict, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models import User, StudentProfile, ReadinessHistory, RoadmapTopicCheck, StepQuizAttempt, ProjectSubmission
from app.auth import get_current_user
from app.schemas import TopicCheckRequest, StepQuizStartRequest, StepQuizSubmitRequest, ProjectSubmissionRequest
from app.services.learning_path_engine import (
    PROJECT_SCORE_GAIN, FieldNotAvailable, LearningPathEngine, build_roadmap_for_user,
    get_learning_path_engine, get_target_role, pass_mark_for, passed_steps, quiz_attempts, utcnow,
)
from app.services.recommendation_engine import recommendation_engine
from app.services.readiness_engine import readiness_engine

router = APIRouter(tags=["Roadmap & Recommendations"])


async def _field_or_404(
    engine: LearningPathEngine, db: AsyncSession, user: User, field: Optional[str]
) -> Tuple[str, Dict[str, Any]]:
    """Requested field (default: the student's target role) + its learning path, or 404."""
    try:
        return engine.require_field(field or await get_target_role(db, user))
    except FieldNotAvailable as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


async def _step_status(engine: LearningPathEngine, db: AsyncSession, user_id: int, field: str, lp: Dict[str, Any], step: int) -> str:
    return engine.step_statuses(lp, await passed_steps(db, user_id, field))[step]


def _dimension_scores(profile: StudentProfile) -> Dict[str, float]:
    return {
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


@router.get("/roadmap")
async def get_roadmap(
    field: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    engine: LearningPathEngine = Depends(get_learning_path_engine),
):
    """5-step roadmap with checklist ticks, gate quiz progress, coding problems and projects."""
    field, lp = await _field_or_404(engine, db, current_user, field)
    return await build_roadmap_for_user(engine, db, current_user.id, field, lp)


@router.put("/roadmap/topics/{topic_id}")
async def set_topic_checked(
    topic_id: str,
    payload: TopicCheckRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    engine: LearningPathEngine = Depends(get_learning_path_engine),
):
    """Tick or untick a checklist topic. Only topics of unlocked steps can change."""
    user_id = current_user.id  # read before any rollback expires the instance
    field, lp = await _field_or_404(engine, db, current_user, payload.field)
    found = engine.find_topic(lp, topic_id)
    if found is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Topic '{topic_id}' is not on the {field} roadmap")
    step, _ = found
    if await _step_status(engine, db, user_id, field, lp, step) == "locked":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Step {step} is locked. Pass the Step {step - 1} quiz first.")

    res = await db.execute(select(RoadmapTopicCheck).where(
        RoadmapTopicCheck.user_id == user_id,
        RoadmapTopicCheck.field == field,
        RoadmapTopicCheck.topic_id == topic_id,
    ))
    existing = res.scalars().first()
    if payload.checked and existing is None:
        db.add(RoadmapTopicCheck(user_id=user_id, field=field, step=step, topic_id=topic_id, checked_at=utcnow()))
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()  # ticked by a concurrent request; the result is the same
    elif not payload.checked and existing is not None:
        await db.delete(existing)
        await db.commit()

    step_topic_ids = {t["id"] for t in engine.find_step(lp, step).get("topics") or []}
    res = await db.execute(select(RoadmapTopicCheck.topic_id).where(
        RoadmapTopicCheck.user_id == user_id, RoadmapTopicCheck.field == field
    ))
    checked = set(res.scalars().all()) & step_topic_ids
    return {
        "field": field,
        "step": step,
        "topic_id": topic_id,
        "checked": topic_id in checked,
        "checked_count": len(checked),
        "total_topics": len(step_topic_ids),
    }


@router.post("/roadmap/steps/{step}/quiz")
async def start_step_quiz(
    step: int,
    payload: StepQuizStartRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    engine: LearningPathEngine = Depends(get_learning_path_engine),
):
    """Start a gate quiz attempt. The attempt is stored server-side, so only its questions are scored."""
    field, lp = await _field_or_404(engine, db, current_user, payload.field)
    if engine.find_step(lp, step) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Step {step} does not exist on the {field} roadmap")
    if await _step_status(engine, db, current_user.id, field, lp, step) == "locked":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Step {step} is locked. Pass the Step {step - 1} quiz first.")

    history = [a.question_ids or [] for a in await quiz_attempts(db, current_user.id, field, step)]
    questions = engine.pick_quiz_questions(field, step, history)
    if not questions:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"The Step {step} quiz for {field} is not available yet")

    attempt = StepQuizAttempt(
        user_id=current_user.id,
        field=field,
        step=step,
        question_ids=[q["id"] for q in questions],
        total=len(questions),
        passed=False,
        started_at=utcnow(),
    )
    db.add(attempt)
    await db.commit()

    titles = engine.step_titles(lp)
    return {
        "attempt_id": attempt.id,
        "field": field,
        "step": step,
        "pass_mark": pass_mark_for(len(questions)),
        "total_questions": len(questions),
        "questions": [engine.public_question(q, titles) for q in questions],
    }


@router.post("/roadmap/quiz/{attempt_id}/submit")
async def submit_step_quiz(
    attempt_id: int,
    payload: StepQuizSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    engine: LearningPathEngine = Depends(get_learning_path_engine),
):
    res = await db.execute(select(StepQuizAttempt).where(
        StepQuizAttempt.id == attempt_id, StepQuizAttempt.user_id == current_user.id
    ))
    attempt = res.scalars().first()
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz attempt not found")
    if attempt.submitted_at is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This quiz attempt was already submitted. Start a new attempt to retake the quiz.")
    try:
        field, lp = engine.require_field(attempt.field)
    except FieldNotAvailable as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    was_completed = attempt.step in await passed_steps(db, current_user.id, field)
    result = engine.score_quiz(field, list(attempt.question_ids or []), payload.answers)
    issued = set(attempt.question_ids or [])
    # Conditional update: of two concurrent submissions only one can win
    res = await db.execute(
        update(StepQuizAttempt)
        .where(StepQuizAttempt.id == attempt.id, StepQuizAttempt.submitted_at.is_(None))
        .values(
            answers={str(qid): choice for qid, choice in payload.answers.items() if qid in issued},
            correct=result["correct"],
            total=result["total"],
            score=result["score"],
            passed=result["passed"],
            submitted_at=utcnow(),
        )
        .execution_options(synchronize_session=False)
    )
    if res.rowcount != 1:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This quiz attempt was already submitted. Start a new attempt to retake the quiz.")
    await db.commit()
    await db.refresh(attempt)  # the bulk UPDATE bypassed the in-session instance

    roadmap = await build_roadmap_for_user(engine, db, current_user.id, field, lp)
    step_row = next(s for s in roadmap["steps"] if s["step"] == attempt.step)
    newly_completed = result["passed"] and not was_completed
    next_step = attempt.step + 1 if newly_completed and engine.find_step(lp, attempt.step + 1) else None
    return {
        "attempt_id": attempt.id,
        "field": field,
        "step": attempt.step,
        "correct": result["correct"],
        "total": result["total"],
        "score": result["score"],
        "pass_mark": pass_mark_for(result["total"]),
        "passed": result["passed"],
        "results": result["results"],
        "step_completed": step_row["status"] == "completed",
        "next_step_unlocked": next_step,
        "roadmap": roadmap,
    }


@router.put("/roadmap/projects/{project_id}")
async def submit_project(
    project_id: str,
    payload: ProjectSubmissionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    engine: LearningPathEngine = Depends(get_learning_path_engine),
):
    """Submit (or update) the student's own GitHub repo for an unlocked project."""
    field, lp = await _field_or_404(engine, db, current_user, payload.field)
    project = engine.get_project(field, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Project '{project_id}' is not on the {field} roadmap")
    unlock_step = project["unlock_after_step"]
    if unlock_step not in await passed_steps(db, current_user.id, field):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Complete Step {unlock_step} to unlock this project.")
    reference_url = ((project.get("reference_repo") or {}).get("url") or "").rstrip("/").lower()
    if payload.repo_url.lower() == reference_url:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Submit your own repository. The reference repo is only for study.",
        )

    res = await db.execute(select(ProjectSubmission).where(
        ProjectSubmission.user_id == current_user.id,
        ProjectSubmission.field == field,
        ProjectSubmission.project_id == project_id,
    ))
    submission = res.scalars().first()
    first_submission = submission is None
    now = utcnow()
    if submission:
        submission.repo_url = payload.repo_url
        submission.notes = payload.notes
        submission.updated_at = now
    else:
        submission = ProjectSubmission(
            user_id=current_user.id, field=field, project_id=project_id,
            repo_url=payload.repo_url, notes=payload.notes, submitted_at=now, updated_at=now,
        )
        db.add(submission)
        try:
            await db.flush()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This project was just submitted. Please retry.")

    res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = res.scalars().first()
    if profile and first_submission:
        # Proof of skill: the first submission of each project raises the projects score once
        old_overall = profile.overall_readiness
        gain = PROJECT_SCORE_GAIN.get(project["level"], 0.0)
        profile.projects_score = round(min(100.0, (profile.projects_score or 0.0) + gain), 1)
        dims = _dimension_scores(profile)
        overall, tier, priority_actions, _ = readiness_engine.calculate_readiness(profile.target_role, dims)
        profile.overall_readiness = overall
        profile.readiness_tier = tier
        profile.priority_actions = priority_actions
        db.add(ReadinessHistory(
            user_id=current_user.id,
            overall_readiness=overall,
            dimension_scores=dims,
            trigger_event=f"Project submitted: {project['title']}"[:100],
            score_change=round(overall - old_overall, 1),
        ))

    await db.commit()
    return {
        "project": engine.project_payload(project, True, submission),
        "first_submission": first_submission,
        "updated_projects_score": profile.projects_score if profile else None,
        "updated_overall_readiness": profile.overall_readiness if profile else None,
    }


@router.get("/recommendations")
async def get_recommendations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    profile = res.scalars().first()

    target_role = profile.target_role if profile else current_user.target_role
    weak_topics = profile.leetcode_weak_topics if profile and profile.leetcode_weak_topics else ["Dynamic Programming"]

    projects = recommendation_engine.get_project_recommendations(target_role, ["Docker", "MLflow", "FastAPI"])
    coding = recommendation_engine.get_coding_recommendations(target_role, weak_topics)

    return {
        "target_role": target_role,
        "recommended_projects": projects,
        "recommended_coding_challenges": coding
    }

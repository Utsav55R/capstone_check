import asyncio
from typing import Dict, List, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.auth import get_current_user
from app.database import get_db
from app.models import CodingSubmission, ReadinessHistory, StudentProfile, User
from app.services.coding_engine import coding_engine
from app.services.readiness_engine import readiness_engine

router = APIRouter(prefix="/coding", tags=["Coding Practice & Evaluation"])

# DSA readiness gained the FIRST time a problem is accepted. Re-solving gives nothing.
DSA_GAIN_BY_DIFFICULTY = {"Easy": 3.0, "Medium": 6.0, "Hard": 10.0}
# A weak topic is cleared once the student has solved this many problems in it.
SOLVES_TO_CLEAR_WEAK_TOPIC = 2


Language = Literal["python", "java", "cpp"]


class CodeRequest(BaseModel):
    problem_id: str
    code: str = Field(..., max_length=20_000)
    language: Language = "python"


async def _evaluate(payload: CodeRequest, mode: str):
    """Runs the judge off the event loop (it blocks for a few seconds); bad language -> 400."""
    try:
        return await asyncio.to_thread(coding_engine.evaluate_code, payload.problem_id, payload.code,
                                       mode, payload.language)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


def _get_problem_or_404(problem_id: str):
    problem = coding_engine.get_problem_by_id(problem_id)
    if problem is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Problem '{problem_id}' does not exist.")
    return problem


async def _get_profile(db: AsyncSession, user_id: int):
    res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == user_id))
    return res.scalars().first()


async def _solved_problem_ids(db: AsyncSession, user_id: int) -> List[str]:
    res = await db.execute(
        select(CodingSubmission.problem_id)
        .where(CodingSubmission.user_id == user_id, CodingSubmission.status == "Accepted")
        .distinct()
    )
    return [row[0] for row in res.all()]


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


@router.get("/problems")
async def get_problems():
    """All problems, without hidden tests or reference solutions, plus which languages can run."""
    return {"problems": coding_engine.get_public_problems(), "languages": coding_engine.languages()}


@router.get("/languages")
async def get_languages():
    """Python is always available; Java and C++ need a JDK / g++ on the server."""
    return {"languages": coding_engine.languages()}


@router.get("/progress")
async def get_progress(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    solved = set(await _solved_problem_ids(db, current_user.id))
    res = await db.execute(
        select(CodingSubmission.problem_id).where(CodingSubmission.user_id == current_user.id).distinct()
    )
    attempted = {row[0] for row in res.all()}

    by_difficulty: Dict[str, Dict[str, int]] = {}
    for p in coding_engine.get_public_problems():
        d = by_difficulty.setdefault(p["difficulty"], {"solved": 0, "total": 0})
        d["total"] += 1
        d["solved"] += p["id"] in solved

    profile = await _get_profile(db, current_user.id)
    return {
        "solved_ids": sorted(solved),
        "attempted_ids": sorted(attempted - solved),
        "by_difficulty": by_difficulty,
        "weak_topics": list(profile.leetcode_weak_topics or []) if profile else [],
        "dsa_score": profile.dsa_score if profile else None,
    }


@router.post("/run")
async def run_examples(payload: CodeRequest, current_user: User = Depends(get_current_user)):
    """Run against the visible examples only. Nothing is saved and no score changes."""
    _get_problem_or_404(payload.problem_id)
    return await _evaluate(payload, "run")


@router.post("/submit")
async def submit_code(
    payload: CodeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    problem = _get_problem_or_404(payload.problem_id)
    already_solved = payload.problem_id in await _solved_problem_ids(db, current_user.id)

    # The sandbox blocks for up to a few seconds, so keep it off the event loop.
    eval_res = await _evaluate(payload, "submit")

    db.add(CodingSubmission(
        user_id=current_user.id,
        problem_id=payload.problem_id,
        problem_title=problem["title"],
        topic=problem["topic"],
        code=payload.code,
        passed_tests=eval_res["passed_tests"],
        total_tests=eval_res["total_tests"],
        status=eval_res["status"],
        score=eval_res["score"],
        language=payload.language,
    ))

    profile = await _get_profile(db, current_user.id)
    first_solve = eval_res["status"] == "Accepted" and not already_solved
    dsa_gain = 0.0
    topic_cleared = None

    if profile and first_solve:
        old_overall = profile.overall_readiness
        old_dsa = profile.dsa_score
        profile.dsa_score = round(min(100.0, old_dsa + DSA_GAIN_BY_DIFFICULTY[problem["difficulty"]]), 1)
        dsa_gain = round(profile.dsa_score - old_dsa, 1)

        # Clear the topic from weak topics once enough problems in it are solved
        solved_ids = set(await _solved_problem_ids(db, current_user.id)) | {payload.problem_id}
        solved_in_topic = sum(
            1 for p in coding_engine.get_public_problems()
            if p["topic"] == problem["topic"] and p["id"] in solved_ids
        )
        weak = list(profile.leetcode_weak_topics or [])
        if problem["topic"] in weak and solved_in_topic >= SOLVES_TO_CLEAR_WEAK_TOPIC:
            weak.remove(problem["topic"])
            profile.leetcode_weak_topics = weak
            topic_cleared = problem["topic"]

        dims = _dimension_scores(profile)
        overall, tier, priority_actions, _ = readiness_engine.calculate_readiness(profile.target_role, dims)
        profile.overall_readiness = overall
        profile.readiness_tier = tier
        profile.priority_actions = priority_actions

        db.add(ReadinessHistory(
            user_id=current_user.id,
            overall_readiness=overall,
            dimension_scores=dims,
            trigger_event=f"Solved {problem['difficulty']} coding problem: {problem['title']}",
            score_change=round(overall - old_overall, 1),
        ))

    await db.commit()

    return {
        **eval_res,
        "first_solve": first_solve,
        "already_solved": already_solved,
        "dsa_gain": dsa_gain,
        "topic_cleared": topic_cleared,
        "updated_dsa_readiness": profile.dsa_score if profile else None,
        "updated_overall_readiness": profile.overall_readiness if profile else None,
        "priority_actions": profile.priority_actions if profile else [],
    }


@router.get("/solution/{problem_id}")
async def get_solution(
    problem_id: str,
    language: Language = "python",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reference solution, unlocked only after the student has solved the problem (in any language)."""
    problem = _get_problem_or_404(problem_id)
    if problem_id not in await _solved_problem_ids(db, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solve this problem first to unlock the reference solution.")
    solution = coding_engine.get_solution(problem, language)
    if solution is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No {language} solution for this problem yet.")
    return {"problem_id": problem_id, "language": language, "solution": solution}

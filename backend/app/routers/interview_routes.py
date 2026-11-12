import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.database import get_db
from app.models import User, StudentProfile, InterviewSession, ReadinessHistory
from app.auth import get_current_user
from app.services.interview_engine import interview_engine
from app.services.readiness_engine import readiness_engine

router = APIRouter(prefix="/interview", tags=["Adaptive Interview Intelligence"])

# --- Request Models ---
class StartSessionRequest(BaseModel):
    target_role: Optional[str] = None
    interview_type: Optional[str] = "technical"

class SendMessageRequest(BaseModel):
    session_id: int
    message: str

class FinishSessionRequest(BaseModel):
    session_id: int

# Backwards compatibility request models
class QuestionRequest(BaseModel):
    interview_type: str = "technical"

class EvaluationRequest(BaseModel):
    session_id: int
    student_response: str


# --- Multi-Stage Conversational Endpoints (Saraswati) ---

@router.post("/start")
async def start_interview_session(
    req: StartSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Starts a 100% text-based multi-turn interview chat session with Saraswati, Senior Technical Recruiter.
    """
    stmt = select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    profile = res.scalars().first()
    role = req.target_role or (profile.target_role if profile else current_user.target_role)

    greeting_text = interview_engine.get_initial_greeting(role, current_user.full_name)
    now_iso = datetime.datetime.utcnow().isoformat()

    initial_messages = [
        {
            "id": 1,
            "sender": "saraswati",
            "text": greeting_text,
            "timestamp": now_iso,
            "stage": 1,
            "eval": None
        }
    ]

    session = InterviewSession(
        user_id=current_user.id,
        interview_type=req.interview_type or "technical",
        target_role=role,
        question=greeting_text,
        context_source="Saraswati AI Recruiter",
        current_stage=1,
        difficulty_level="basic",
        is_completed=False,
        messages=initial_messages
    )

    db.add(session)
    await db.commit()
    await db.refresh(session)

    return {
        "session_id": session.id,
        "target_role": role,
        "current_stage": 1,
        "difficulty_level": "basic",
        "is_completed": False,
        "messages": initial_messages
    }


@router.post("/send-message")
async def send_interview_message(
    req: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Appends candidate text message, evaluates response turn, updates difficulty scaling,
    and returns Saraswati's next conversational response.
    """
    stmt = select(InterviewSession).where(
        InterviewSession.id == req.session_id,
        InterviewSession.user_id == current_user.id
    )
    res = await db.execute(stmt)
    session = res.scalars().first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found."
        )

    if session.is_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This interview session is already completed."
        )

    messages = list(session.messages or [])
    now_iso = datetime.datetime.utcnow().isoformat()

    # 1. Append candidate message
    candidate_msg_id = len(messages) + 1
    candidate_msg = {
        "id": candidate_msg_id,
        "sender": "candidate",
        "text": req.message,
        "timestamp": now_iso,
        "stage": session.current_stage
    }
    messages.append(candidate_msg)

    # 2. Find last question asked by Saraswati for evaluation context
    last_question_text = "Please introduce yourself and explain your technical background."
    for m in reversed(messages[:-1]):
        if m.get("sender") == "saraswati":
            last_question_text = m.get("text", last_question_text)
            break

    # 3. Evaluate candidate turn response
    turn_eval = await interview_engine.evaluate_response(
        question=last_question_text,
        student_response=req.message,
        target_role=session.target_role
    )

    # Attach evaluation to candidate message
    candidate_msg["eval"] = turn_eval

    # 4. Count turns to determine stage & difficulty scaling
    turn_count = len([m for m in messages if m.get("sender") == "candidate"])

    saraswati_turn_result = interview_engine.generate_next_saraswati_turn(
        current_stage=session.current_stage,
        turn_count=turn_count,
        target_role=session.target_role,
        difficulty_level=session.difficulty_level,
        last_turn_score=turn_eval.get("score", 6.0),
        candidate_response=req.message
    )

    session.current_stage = saraswati_turn_result["next_stage"]
    session.difficulty_level = saraswati_turn_result["next_difficulty"]

    # 5. Append Saraswati's response
    saraswati_msg = {
        "id": len(messages) + 1,
        "sender": "saraswati",
        "text": saraswati_turn_result["saraswati_text"],
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "stage": session.current_stage,
        "eval": None
    }
    messages.append(saraswati_msg)

    if saraswati_turn_result["is_conclusion"]:
        session.is_completed = True

    session.messages = messages
    session.student_response = req.message

    await db.commit()

    return {
        "session_id": session.id,
        "current_stage": session.current_stage,
        "difficulty_level": session.difficulty_level,
        "is_completed": session.is_completed,
        "latest_turn_eval": turn_eval,
        "messages": messages
    }


@router.post("/finish")
async def finish_interview_session(
    req: FinishSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Computes overall composite score (0-100), 6-Tier categorical grade,
    parameter breakdown, and 7-day improvement roadmap. Updates profile readiness.
    """
    stmt = select(InterviewSession).where(
        InterviewSession.id == req.session_id,
        InterviewSession.user_id == current_user.id
    )
    res = await db.execute(stmt)
    session = res.scalars().first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found."
        )

    messages = session.messages or []
    turn_evals = [m["eval"] for m in messages if m.get("sender") == "candidate" and m.get("eval")]

    report_matrix = interview_engine.generate_final_report_matrix(
        target_role=session.target_role,
        messages=messages,
        turn_evaluations=turn_evals
    )

    session.is_completed = True
    session.score = report_matrix["overall_composite_score"]
    session.overall_score = report_matrix["overall_composite_score"]
    session.relevance_score = report_matrix["parameter_breakdown"]["relevance_score"]
    session.structure_score = report_matrix["parameter_breakdown"]["structure_score"]
    session.correctness_score = report_matrix["parameter_breakdown"]["correctness_score"]
    session.depth_score = report_matrix["parameter_breakdown"]["depth_score"]
    session.categorical_grade = report_matrix["categorical_grade"]
    session.weak_topics = report_matrix["weak_topics"]
    session.improvement_roadmap = report_matrix["actionable_checklist"]
    session.completed_at = datetime.datetime.utcnow()

    # Closed-loop update to StudentProfile
    stmt_prof = select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    res_prof = await db.execute(stmt_prof)
    profile = res_prof.scalars().first()

    if profile:
        old_readiness = profile.overall_readiness
        new_interview_score = round(min(100.0, profile.interview_readiness_score * 0.3 + report_matrix["overall_composite_score"] * 0.7), 1)
        new_comm_score = round(min(100.0, profile.comm_readiness_score * 0.4 + report_matrix["parameter_breakdown"]["structure_score"] * 0.6), 1)

        profile.interview_readiness_score = new_interview_score
        profile.comm_readiness_score = new_comm_score

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
            user_id=current_user.id,
            overall_readiness=overall,
            dimension_scores=dims,
            trigger_event=f"Saraswati Interview Completed ({session.target_role})",
            score_change=score_change
        )
        db.add(history)

    await db.commit()

    return {
        "session_id": session.id,
        "target_role": session.target_role,
        "overall_composite_score": report_matrix["overall_composite_score"],
        "categorical_grade": report_matrix["categorical_grade"],
        "grade_color": report_matrix["grade_color"],
        "grade_bg": report_matrix["grade_bg"],
        "parameter_breakdown": report_matrix["parameter_breakdown"],
        "weak_topics": report_matrix["weak_topics"],
        "actionable_checklist": report_matrix["actionable_checklist"],
        "messages": messages,
        "updated_overall_readiness": profile.overall_readiness if profile else 70.0
    }


@router.get("/history")
async def get_interview_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns saved past interview chat sessions for the current user.
    """
    stmt = select(InterviewSession).where(InterviewSession.user_id == current_user.id).order_by(InterviewSession.completed_at.desc())
    res = await db.execute(stmt)
    sessions = res.scalars().all()

    history_list = []
    for s in sessions:
        history_list.append({
            "id": s.id,
            "target_role": s.target_role,
            "interview_type": s.interview_type,
            "is_completed": s.is_completed,
            "overall_score": s.overall_score or s.score,
            "categorical_grade": s.categorical_grade or "Moderate",
            "date": s.completed_at.strftime("%Y-%m-%d %H:%M") if s.completed_at else "In Progress",
            "message_count": len(s.messages or [])
        })

    return {"history": history_list}


@router.get("/session/{session_id}")
async def get_interview_session_detail(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns full details, transcript, and report for a specific interview session.
    """
    stmt = select(InterviewSession).where(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    )
    res = await db.execute(stmt)
    session = res.scalars().first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    grade_info = interview_engine.determine_categorical_grade(session.overall_score or session.score or 65.0)

    return {
        "session_id": session.id,
        "target_role": session.target_role,
        "interview_type": session.interview_type,
        "is_completed": session.is_completed,
        "overall_composite_score": session.overall_score or session.score,
        "categorical_grade": session.categorical_grade or grade_info["grade"],
        "grade_color": grade_info["color"],
        "grade_bg": grade_info["bg"],
        "parameter_breakdown": {
            "relevance_score": session.relevance_score or 70.0,
            "structure_score": session.structure_score or 65.0,
            "correctness_score": session.correctness_score or 75.0,
            "depth_score": session.depth_score or 60.0
        },
        "weak_topics": session.weak_topics or ["System Architecture", "Quantitative Metrics"],
        "actionable_checklist": session.improvement_roadmap or [
            "Review role-specific interview concepts.",
            "Practice STAR structure responses."
        ],
        "messages": session.messages or []
    }


# --- Legacy Backwards-Compatible Endpoints ---

@router.post("/generate-question")
async def generate_interview_question(
    req: QuestionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    profile = res.scalars().first()
    target_role = profile.target_role if profile else current_user.target_role

    q_data = interview_engine.generate_question(
        interview_type=req.interview_type,
        target_role=target_role
    )

    session = InterviewSession(
        user_id=current_user.id,
        interview_type=req.interview_type,
        target_role=target_role,
        question=q_data["question"],
        context_source=q_data["context_source"],
        current_stage=1,
        difficulty_level="basic"
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return {
        "session_id": session.id,
        "interview_type": req.interview_type,
        "target_role": target_role,
        "question": session.question,
        "context_source": session.context_source
    }


@router.post("/evaluate")
async def evaluate_interview_response(
    req: EvaluationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(InterviewSession).where(InterviewSession.id == req.session_id, InterviewSession.user_id == current_user.id)
    res = await db.execute(stmt)
    session = res.scalars().first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found."
        )

    eval_result = await interview_engine.evaluate_response(
        question=session.question or "Technical Question",
        student_response=req.student_response,
        target_role=session.target_role
    )

    session.student_response = req.student_response
    session.score = eval_result["score"]
    session.relevance_score = eval_result["relevance_score"]
    session.structure_score = eval_result["structure_score"]
    session.correctness_score = eval_result["correctness_score"]
    session.depth_score = eval_result["depth_score"]
    session.strengths = eval_result["strengths"]
    session.improvements = eval_result["improvements"]
    session.model_answer = eval_result["model_answer"]

    await db.commit()

    return {
        "session_id": session.id,
        "score": eval_result["score"],
        "relevance_score": eval_result["relevance_score"],
        "structure_score": eval_result["structure_score"],
        "correctness_score": eval_result["correctness_score"],
        "depth_score": eval_result["depth_score"],
        "strengths": eval_result["strengths"],
        "improvements": eval_result["improvements"],
        "model_answer": eval_result["model_answer"],
        "updated_interview_readiness": 75.0,
        "updated_overall_readiness": 72.0,
        "priority_actions": []
    }

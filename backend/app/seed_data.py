from sqlalchemy.future import select
from app.database import AsyncSessionLocal
from app.models import User, StudentProfile, ReadinessHistory
from app.auth import get_password_hash
from app.services.readiness_engine import readiness_engine

# Registration-form details for the demo account, so its Candidate Profile is fully populated
PROTOTYPE_PROFILE_DETAILS = {
    "age": 21,
    "college_name": "VIT Bhopal University",
    "course_and_branch": "B.Tech Computer Science & Engineering (AI & ML)",
    "cgpa": 8.65,
    "tenth_percentage": 92.0,
    "twelfth_percentage": 89.5,
    "ug_cgpa": None,
    "work_experience": "Machine Learning Intern, DataWorks Analytics (May 2025 - Jul 2025)\n"
                       "Built a churn-prediction pipeline with scikit-learn and deployed it as a FastAPI service.",
}

async def seed_prototype_user():
    async with AsyncSessionLocal() as db:
        stmt = select(User).where(User.email == "alex.chen@university.edu")
        res = await db.execute(stmt)
        existing = res.scalars().first()
        if existing:
            await _backfill_prototype_details(db, existing)
            return # Already seeded

        user = User(
            email="alex.chen@university.edu",
            hashed_password=get_password_hash("password123"),
            full_name="Alex Chen",
            target_role="AI / ML Engineer",
            is_first_time=False
        )
        db.add(user)
        await db.flush()

        # Exact Slide 07 baseline dimensions
        dims = {
            "python": 85.0,
            "sql": 60.0,
            "ml": 75.0,
            "deep_learning": 45.0,
            "dsa": 55.0,
            "projects": 60.0,
            "resume_quality": 80.0,
            "interview_readiness": 50.0,
            "comm_readiness": 65.0,
        }

        overall, tier, priority_actions, _ = readiness_engine.calculate_readiness(
            user.target_role, dims
        )

        profile = StudentProfile(
            user_id=user.id,
            target_role=user.target_role,
            python_score=dims["python"],
            sql_score=dims["sql"],
            ml_score=dims["ml"],
            deep_learning_score=dims["deep_learning"],
            dsa_score=dims["dsa"],
            projects_score=dims["projects"],
            resume_quality_score=dims["resume_quality"],
            interview_readiness_score=dims["interview_readiness"],
            comm_readiness_score=dims["comm_readiness"],
            overall_readiness=overall,
            readiness_tier=tier,
            leetcode_url="https://leetcode.com/u/alexchen_ml",
            leetcode_total_solved=142,
            leetcode_medium_solved=68,
            leetcode_weak_topics=["Dynamic Programming", "Graphs"],
            github_url="https://github.com/alexchen-ml",
            linkedin_url="https://linkedin.com/in/alexchen-ai",
            priority_actions=priority_actions,
            **PROTOTYPE_PROFILE_DETAILS
        )
        db.add(profile)
        await db.flush()

        history = ReadinessHistory(
            user_id=user.id,
            overall_readiness=overall,
            dimension_scores=dims,
            trigger_event="Prototype Baseline Loaded (Slide 07 Benchmark)",
            score_change=0.0
        )
        db.add(history)
        await db.commit()


async def _backfill_prototype_details(db, user):
    """Databases seeded before the registration form existed have an empty demo profile."""
    res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == user.id))
    profile = res.scalars().first()
    if not profile or profile.college_name:
        return
    for field, value in PROTOTYPE_PROFILE_DETAILS.items():
        setattr(profile, field, value)
    user.is_first_time = False
    await db.commit()

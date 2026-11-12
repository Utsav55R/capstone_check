from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models import User, StudentProfile
from app.schemas import ProfileDetailsUpdate

# Personal & academic columns on StudentProfile that the registration form / Edit Profile can set
PROFILE_DETAIL_FIELDS = (
    "age",
    "college_name",
    "course_and_branch",
    "cgpa",
    "tenth_percentage",
    "twelfth_percentage",
    "ug_cgpa",
    "work_experience",
    "avatar_url",
)


async def get_or_create_profile(db: AsyncSession, user: User) -> StudentProfile:
    res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == user.id))
    profile = res.scalars().first()
    if not profile:
        profile = StudentProfile(user_id=user.id, target_role=user.target_role)
        db.add(profile)
        await db.flush()
    return profile


def apply_profile_details(user: User, profile: StudentProfile, details: ProfileDetailsUpdate) -> None:
    """Copy only the fields the client actually sent, so partial updates don't wipe data."""
    data = details.model_dump(exclude_unset=True)
    if data.get("full_name"):
        user.full_name = data["full_name"]
    for field in PROFILE_DETAIL_FIELDS:
        if field in data:
            setattr(profile, field, data[field])


def serialize_profile(user: User, profile: StudentProfile) -> dict:
    return {
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "target_role": profile.target_role or user.target_role,
        "auth_provider": user.auth_provider or "email",
        "is_first_time": bool(user.is_first_time),
        "member_since": user.created_at.isoformat() if user.created_at else None,
        **{field: getattr(profile, field) for field in PROFILE_DETAIL_FIELDS},
        "overall_readiness": profile.overall_readiness,
        "readiness_tier": profile.readiness_tier,
        "links": {
            "github": profile.github_url,
            "linkedin": profile.linkedin_url,
            "leetcode": profile.leetcode_url,
        },
        "preferences": {
            "theme": user.theme_preference or "light",
            "language": user.language_preference or "en",
        },
    }

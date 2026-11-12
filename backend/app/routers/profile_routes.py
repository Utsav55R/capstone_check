from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.auth import get_current_user
from app.schemas import ProfileDetailsUpdate, AvatarUpdate, PreferencesUpdate
from app.services.profile_service import get_or_create_profile, apply_profile_details, serialize_profile

router = APIRouter(prefix="/profile", tags=["Candidate Profile"])


@router.get("/me")
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    profile = await get_or_create_profile(db, current_user)
    await db.commit()
    return serialize_profile(current_user, profile)


@router.put("/me")
async def update_my_profile(
    details: ProfileDetailsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    profile = await get_or_create_profile(db, current_user)
    apply_profile_details(current_user, profile, details)
    await db.commit()
    return serialize_profile(current_user, profile)


@router.put("/avatar")
async def update_avatar(
    payload: AvatarUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    profile = await get_or_create_profile(db, current_user)
    profile.avatar_url = payload.avatar_url
    await db.commit()
    return serialize_profile(current_user, profile)


@router.put("/preferences")
async def update_preferences(
    payload: PreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if payload.theme is not None:
        current_user.theme_preference = payload.theme
    if payload.language is not None:
        current_user.language_preference = payload.language
    await db.commit()
    return {
        "theme": current_user.theme_preference or "light",
        "language": current_user.language_preference or "en",
    }

import uuid
import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

import models, schemas
from dependencies import get_current_user, get_current_user_allow_blocked, get_db

_ROLE_MAP = {
    "beneficiary": models.RoleEnum.beneficiary,
    "volunteer":   models.RoleEnum.volunteer,
    "donor":       models.RoleEnum.donor,
}

AVATAR_DIR = Path("static/uploads/avatars")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/me", response_model=schemas.UserResponse)
def get_my_profile(current_user: models.User = Depends(get_current_user_allow_blocked)):
    return current_user


@router.patch("/me/role", response_model=schemas.UserResponse)
def update_role(
    data: schemas.RoleUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != models.RoleEnum.pending:
        raise HTTPException(status_code=403, detail="Role has already been set and cannot be changed here.")
    current_user.role = _ROLE_MAP[data.role]
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/me/profile", response_model=schemas.ProfileResponse)
def get_profile(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(models.Profile).filter(models.Profile.user_id == current_user.id).first()
    if not profile:
        return schemas.ProfileResponse()
    return schemas.ProfileResponse(full_name=profile.full_name, phone=profile.phone, bio=profile.skills)


@router.put("/me/profile", response_model=schemas.ProfileResponse)
def update_profile(
    data: schemas.ProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(models.Profile).filter(models.Profile.user_id == current_user.id).first()
    if not profile:
        profile = models.Profile(user_id=current_user.id)
        db.add(profile)
    if data.full_name is not None:
        profile.full_name = data.full_name
    if data.phone is not None:
        profile.phone = data.phone
    if data.bio is not None:
        profile.skills = data.bio
    db.commit()
    db.refresh(profile)
    return schemas.ProfileResponse(full_name=profile.full_name, phone=profile.phone, bio=profile.skills)


@router.post("/me/avatar", response_model=schemas.UploadResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, and GIF images are allowed.")

    ext = Path(file.filename).suffix.lower() or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = AVATAR_DIR / filename

    if current_user.avatar_url:
        old_path = Path(current_user.avatar_url.lstrip("/"))
        if old_path.exists():
            os.remove(old_path)

    contents = await file.read()
    dest.write_bytes(contents)

    url = f"/static/uploads/avatars/{filename}"
    current_user.avatar_url = url
    db.commit()
    db.refresh(current_user)

    return {"url": url}

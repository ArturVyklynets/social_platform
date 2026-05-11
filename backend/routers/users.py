from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

import models, schemas
from dependencies import get_current_user, get_current_user_allow_blocked, get_db
from cloudinary_config import upload_image, delete_image


def _fmt_review(r: models.Review) -> dict:
    author_profile = r.author.profile if r.author else None
    return {
        "id":            r.id,
        "request_id":    r.request_id,
        "volunteer_id":  r.volunteer_id,
        "author_id":     r.author_id,
        "rating":        r.rating,
        "comment":       r.comment,
        "created_at":    r.created_at,
        "author_name":   (author_profile.full_name if author_profile and author_profile.full_name else None) or (r.author.email if r.author else None),
        "request_title": r.help_request.title if r.help_request else None,
    }

_ROLE_MAP = {
    "beneficiary": models.RoleEnum.beneficiary,
    "volunteer":   models.RoleEnum.volunteer,
    "donor":       models.RoleEnum.donor,
}

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/me/stats")
def get_my_stats(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = current_user.role

    if role == models.RoleEnum.beneficiary:
        total  = db.query(func.count(models.HelpRequest.id)).filter(models.HelpRequest.author_id == current_user.id).scalar() or 0
        done   = db.query(func.count(models.HelpRequest.id)).filter(models.HelpRequest.author_id == current_user.id, models.HelpRequest.status == "completed").scalar() or 0
        raised = db.query(func.sum(models.HelpRequest.collected_amount)).filter(models.HelpRequest.author_id == current_user.id).scalar() or 0
        return [
            {"label": "Розміщено запитів", "value": str(int(total))},
            {"label": "Виконано запитів",  "value": str(int(done))},
            {"label": "Зібрано коштів",    "value": f"₴{float(raised):,.0f}".replace(",", " ")},
        ]

    if role == models.RoleEnum.volunteer:
        approved  = db.query(func.count(models.RequestVolunteer.id)).filter(
            models.RequestVolunteer.user_id == current_user.id,
            models.RequestVolunteer.status  == "approved",
        ).scalar() or 0
        completed = (
            db.query(func.count(models.RequestVolunteer.id))
            .join(models.HelpRequest, models.RequestVolunteer.request_id == models.HelpRequest.id)
            .filter(
                models.RequestVolunteer.user_id == current_user.id,
                models.RequestVolunteer.status  == "approved",
                models.HelpRequest.status       == "completed",
            )
            .scalar() or 0
        )
        return [
            {"label": "Підтверджених заявок", "value": str(int(approved))},
            {"label": "Виконаних завдань",     "value": str(int(completed))},
        ]

    if role == models.RoleEnum.donor:
        total_donated = db.query(func.sum(models.DonationTx.amount)).filter(
            models.DonationTx.donor_id == current_user.id,
            models.DonationTx.status   == "success",
        ).scalar() or 0
        count    = db.query(func.count(models.DonationTx.id)).filter(
            models.DonationTx.donor_id == current_user.id,
            models.DonationTx.status   == "success",
        ).scalar() or 0
        projects = db.query(func.count(models.DonationTx.request_id.distinct())).filter(
            models.DonationTx.donor_id == current_user.id,
            models.DonationTx.status   == "success",
        ).scalar() or 0
        return [
            {"label": "Загальна сума",       "value": f"₴{float(total_donated):,.0f}".replace(",", " ")},
            {"label": "Кількість донацій",   "value": str(int(count))},
            {"label": "Підтриманих проєктів","value": str(int(projects))},
        ]

    return []


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

    if current_user.avatar_url:
        delete_image(current_user.avatar_url)

    contents = await file.read()
    url = upload_image(contents, folder="kindlink/avatars")

    current_user.avatar_url = url
    db.commit()
    db.refresh(current_user)

    return {"url": url}


@router.get("/{user_id}/reviews", response_model=list[schemas.ReviewResponse])
def get_user_reviews(user_id: int, db: Session = Depends(get_db)):
    reviews = (
        db.query(models.Review)
        .filter(models.Review.volunteer_id == user_id)
        .options(
            joinedload(models.Review.author).joinedload(models.User.profile),
            joinedload(models.Review.help_request),
        )
        .order_by(models.Review.created_at.desc())
        .all()
    )
    return [_fmt_review(r) for r in reviews]


@router.get("/{user_id}", response_model=schemas.PublicUserResponse)
def get_public_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Користувача не знайдено.")

    profile = (
        db.query(models.Profile).filter(models.Profile.user_id == user_id).first()
    )

    avg = (
        db.query(func.avg(models.Review.rating))
        .filter(models.Review.volunteer_id == user_id)
        .scalar()
    )
    count = (
        db.query(func.count(models.Review.id))
        .filter(models.Review.volunteer_id == user_id)
        .scalar()
    ) or 0

    return {
        "id":             user.id,
        "role":           user.role,
        "avatar_url":     user.avatar_url,
        "full_name":      profile.full_name if profile else None,
        "bio":            profile.skills    if profile else None,
        "average_rating": round(float(avg), 1) if avg else None,
        "reviews_count":  int(count),
    }

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

import models, schemas
from dependencies import get_db, get_current_user

router = APIRouter(prefix="/api/reviews", tags=["Reviews"])


def _fmt(r: models.Review) -> dict:
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


def _load(query):
    return query.options(
        joinedload(models.Review.author).joinedload(models.User.profile),
        joinedload(models.Review.help_request),
    )


@router.post(
    "/{request_id}/volunteer/{volunteer_id}",
    response_model=schemas.ReviewResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_review(
    request_id:   int,
    volunteer_id: int,
    body:         schemas.ReviewCreate,
    current_user: models.User = Depends(get_current_user),
    db:           Session     = Depends(get_db),
):
    if not (1 <= body.rating <= 5):
        raise HTTPException(status_code=400, detail="Оцінка повинна бути від 1 до 5.")

    req = db.query(models.HelpRequest).filter(models.HelpRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Запит не знайдено.")
    if req.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Тільки автор запиту може залишити відгук.")

    application = (
        db.query(models.RequestVolunteer)
        .filter(
            models.RequestVolunteer.request_id == request_id,
            models.RequestVolunteer.user_id    == volunteer_id,
            models.RequestVolunteer.status     == "approved",
        )
        .first()
    )
    if not application:
        raise HTTPException(
            status_code=400,
            detail="Волонтер не має підтвердженої заявки на цей запит.",
        )

    existing = (
        db.query(models.Review)
        .filter(
            models.Review.request_id   == request_id,
            models.Review.volunteer_id == volunteer_id,
            models.Review.author_id    == current_user.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Ви вже залишили відгук для цього волонтера.")

    review = models.Review(
        request_id=request_id,
        volunteer_id=volunteer_id,
        author_id=current_user.id,
        rating=body.rating,
        comment=body.comment,
    )
    db.add(review)
    db.commit()

    review = _load(
        db.query(models.Review).filter(models.Review.id == review.id)
    ).first()

    return _fmt(review)

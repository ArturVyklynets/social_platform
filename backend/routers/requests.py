import uuid
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List

import models, schemas
from dependencies import get_db, get_current_user
from services import calendar_service

REQUEST_IMAGE_DIR = Path("static/uploads/requests")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

router = APIRouter(prefix="/api/requests", tags=["Help Requests"])

@router.get("/platform-stats")
def get_platform_stats(db: Session = Depends(get_db)):
    requests_count = db.query(func.count(models.HelpRequest.id)).scalar() or 0
    volunteers     = db.query(func.count(models.User.id)).filter(
                         models.User.role == "Волонтер"
                     ).scalar() or 0
    collected      = db.query(func.sum(models.HelpRequest.collected_amount)).scalar() or 0
    total_users    = db.query(func.count(models.User.id)).scalar() or 0
    return {
        "requests_count": int(requests_count),
        "volunteers":     int(volunteers),
        "collected_uah":  float(collected),
        "total_users":    int(total_users),
    }

@router.get("/", response_model=List[schemas.HelpRequestResponse])
def get_all_requests(db: Session = Depends(get_db)):
    return db.query(models.HelpRequest).all()

@router.get("/my-applications", response_model=List[schemas.MyApplicationResponse])
def get_my_applications(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != models.RoleEnum.volunteer:
        raise HTTPException(status_code=403, detail="Тільки волонтери мають заявки.")

    applications = (
        db.query(models.RequestVolunteer)
        .filter(models.RequestVolunteer.user_id == current_user.id)
        .options(joinedload(models.RequestVolunteer.help_request))
        .order_by(models.RequestVolunteer.created_at.desc())
        .all()
    )

    return [
        {
            "id": app.id,
            "request_id": app.request_id,
            "request_title": app.help_request.title,
            "request_category": app.help_request.category,
            "scheduled_at": app.scheduled_at,
            "status": app.status,
            "created_at": app.created_at,
        }
        for app in applications
    ]

@router.get("/my-requests")
def get_my_requests(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reqs = (
        db.query(models.HelpRequest)
        .filter(models.HelpRequest.author_id == current_user.id)
        .order_by(models.HelpRequest.id.desc())
        .all()
    )
    return [
        {
            "id":               r.id,
            "title":            r.title,
            "category":         r.category,
            "status":           r.status,
            "goal_amount":      r.goal_amount,
            "collected_amount": r.collected_amount or 0.0,
            "card_number":      r.card_number,
            "image_url":        r.image_url,
            "payout_status":    r.payout_status or "unpaid",
            "payout_at":        r.payout_at.isoformat() if r.payout_at else None,
        }
        for r in reqs
    ]

@router.get("/my-incoming-applications", response_model=List[schemas.IncomingApplicationResponse])
def get_incoming_applications(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != models.RoleEnum.beneficiary:
        raise HTTPException(status_code=403, detail="Тільки бенефіціари можуть переглядати вхідні заявки.")

    applications = (
        db.query(models.RequestVolunteer)
        .join(models.HelpRequest, models.RequestVolunteer.request_id == models.HelpRequest.id)
        .filter(models.HelpRequest.author_id == current_user.id)
        .options(
            joinedload(models.RequestVolunteer.user).joinedload(models.User.profile),
            joinedload(models.RequestVolunteer.help_request),
        )
        .order_by(models.RequestVolunteer.created_at.desc())
        .all()
    )

    return [
        {
            "id": app.id,
            "request_id": app.request_id,
            "request_title": app.help_request.title,
            "scheduled_at": app.scheduled_at,
            "status": app.status,
            "volunteer_email": app.user.email,
            "volunteer_name": app.user.profile.full_name if app.user.profile else None,
            "volunteer_phone": app.user.profile.phone if app.user.profile else None,
        }
        for app in applications
    ]

@router.patch("/applications/{application_id}/status", response_model=schemas.VolunteerApplicationResponse)
def update_application_status(
    application_id: int,
    body: schemas.ApplicationStatusUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    application = (
        db.query(models.RequestVolunteer)
        .options(
            joinedload(models.RequestVolunteer.help_request),
            joinedload(models.RequestVolunteer.user),
        )
        .filter(models.RequestVolunteer.id == application_id)
        .first()
    )

    if not application:
        raise HTTPException(status_code=404, detail="Заявку не знайдено.")

    if application.help_request.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Тільки власник запиту може керувати заявками.")

    if application.status != "pending":
        raise HTTPException(status_code=400, detail="Цю заявку вже було оброблено.")

    application.status = body.status
    db.commit()
    db.refresh(application)

    # Fire calendar sync only on approval
    if body.status == "approved":
        calendar_service.add_volunteer_event(
            title=application.help_request.title,
            description=application.help_request.description,
            scheduled_at=application.scheduled_at,
            volunteer_email=application.user.email,
        )

    return application

@router.post("/", response_model=schemas.HelpRequestResponse, status_code=status.HTTP_201_CREATED)
def create_request(
    request: schemas.HelpRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != models.RoleEnum.beneficiary:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Тільки бенефіціари можуть створювати запити на допомогу.",
        )
    new_request = models.HelpRequest(
        title=request.title,
        description=request.description,
        category=request.category,
        goal_amount=request.goal_amount,
        card_number=request.card_number,
        author_id=current_user.id,
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    return new_request

@router.post("/{request_id}/image", response_model=schemas.UploadResponse)
async def upload_request_image(
    request_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    req = db.query(models.HelpRequest).filter(models.HelpRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
    if req.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own requests.")

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, and GIF images are allowed.")

    ext = Path(file.filename).suffix.lower() or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = REQUEST_IMAGE_DIR / filename

    if req.image_url:
        old_path = Path(req.image_url.lstrip("/"))
        if old_path.exists():
            os.remove(old_path)

    contents = await file.read()
    dest.write_bytes(contents)

    url = f"/static/uploads/requests/{filename}"
    req.image_url = url
    db.commit()
    db.refresh(req)

    return {"url": url}

@router.post("/{request_id}/volunteer", response_model=schemas.VolunteerApplicationResponse, status_code=status.HTTP_201_CREATED)
def volunteer_for_request(
    request_id: int,
    body: schemas.VolunteerApplicationCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != models.RoleEnum.volunteer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Тільки волонтери можуть записуватись на допомогу.",
        )

    req = db.query(models.HelpRequest).filter(models.HelpRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Запит не знайдено.")

    # Normalise to naive UTC
    scheduled = body.scheduled_at
    if scheduled.tzinfo is not None:
        scheduled = scheduled.astimezone(timezone.utc).replace(tzinfo=None)

    if scheduled <= datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Час візиту повинен бути в майбутньому.",
        )

    existing = db.query(models.RequestVolunteer).filter(
        models.RequestVolunteer.user_id == current_user.id,
        models.RequestVolunteer.request_id == request_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Ви вже записались на цей запит.")

    # Status starts as "pending" — calendar fires only after beneficiary approves
    application = models.RequestVolunteer(
        user_id=current_user.id,
        request_id=request_id,
        scheduled_at=scheduled,
        status="pending",
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return application

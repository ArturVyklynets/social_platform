import hashlib
from datetime import datetime, timezone, timedelta, date as date_type
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from fastapi_cache import FastAPICache
from fastapi_cache.decorator import cache

import models, schemas
from dependencies import get_db, get_current_user
from services import calendar_service
from cloudinary_config import upload_image, delete_image

_NS_STATS = "platform_stats"
_NS_LIST  = "requests_list"

def _url_key_builder(func, namespace="", *, request=None, response=None, args=None, kwargs=None):
    """Stable URL-based cache key so SQLAlchemy Session objects don't pollute the key."""
    prefix = FastAPICache.get_prefix()
    url    = str(request.url) if request else f"{func.__module__}:{func.__name__}"
    return f"{prefix}:{namespace}:{hashlib.md5(url.encode()).hexdigest()}"

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

router = APIRouter(prefix="/api/requests", tags=["Help Requests"])

def _as_utc(dt):
    return dt.replace(tzinfo=timezone.utc) if dt else None

@router.get("/platform-stats")
@cache(expire=60, namespace=_NS_STATS, key_builder=_url_key_builder)
async def get_platform_stats(db: Session = Depends(get_db)):
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
@cache(expire=30, namespace=_NS_LIST, key_builder=_url_key_builder)
async def get_all_requests(db: Session = Depends(get_db)):
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
        .options(
            joinedload(models.RequestVolunteer.help_request),
            joinedload(models.RequestVolunteer.report),
        )
        .order_by(models.RequestVolunteer.created_at.desc())
        .all()
    )

    return [
        {
            "id": app.id,
            "request_id": app.request_id,
            "request_title": app.help_request.title,
            "request_category": app.help_request.category,
            "scheduled_at": _as_utc(app.scheduled_at),
            "status": app.status,
            "created_at": app.created_at,
            "has_report": app.report is not None,
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
            "scheduled_at": _as_utc(app.scheduled_at),
            "status": app.status,
            "volunteer_id": app.user.id,
            "volunteer_email": app.user.email,
            "volunteer_name": app.user.profile.full_name if app.user.profile else None,
            "volunteer_phone": app.user.profile.phone if app.user.profile else None,
        }
        for app in applications
    ]

@router.get("/calendar")
def get_calendar(
    volunteer_id: Optional[int] = None,
    exclude_request_id: Optional[int] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == models.RoleEnum.volunteer:
        q = db.query(models.RequestVolunteer).filter(
            models.RequestVolunteer.user_id == current_user.id,
            models.RequestVolunteer.status.in_(["approved", "pending"]),
        )
        if exclude_request_id:
            q = q.filter(models.RequestVolunteer.request_id != exclude_request_id)
        apps = q.options(joinedload(models.RequestVolunteer.help_request)).all()
        return [
            {
                "id": a.id,
                "title": a.help_request.title,
                "scheduled_at": a.scheduled_at.isoformat() + "Z",
                "status": a.status,
            }
            for a in apps
        ]

    if current_user.role == models.RoleEnum.beneficiary and volunteer_id:
        apps = (
            db.query(models.RequestVolunteer)
            .filter(
                models.RequestVolunteer.user_id == volunteer_id,
                models.RequestVolunteer.status.in_(["approved", "pending"]),
            )
            .all()
        )
        return [
            {
                "id": a.id,
                "title": "Зайнято",
                "scheduled_at": a.scheduled_at.isoformat() + "Z",
                "status": "busy",
            }
            for a in apps
        ]

    return []


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
async def create_request(
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
        available_from=request.available_from or None,
        available_to=request.available_to or None,
        available_hour_from=request.available_hour_from,
        available_hour_to=request.available_hour_to,
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    await FastAPICache.clear(namespace=_NS_STATS)
    await FastAPICache.clear(namespace=_NS_LIST)
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

    if req.image_url:
        delete_image(req.image_url)

    contents = await file.read()
    url = upload_image(contents, folder="kindlink/requests")

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
    if req.status != "open":
        raise HTTPException(status_code=400, detail="Цей запит вже закрито і не приймає нових заявок.")

    # Normalise to naive UTC; also extract Kyiv local time for range validation
    scheduled = body.scheduled_at
    KYIV = timezone(timedelta(hours=3))
    if scheduled.tzinfo is not None:
        kyiv_dt   = scheduled.astimezone(KYIV)
        local_hour = kyiv_dt.hour
        local_date = kyiv_dt.date()
        scheduled  = scheduled.astimezone(timezone.utc).replace(tzinfo=None)
    else:
        local_hour = scheduled.hour
        local_date = scheduled.date()

    if scheduled <= datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Час візиту повинен бути в майбутньому.",
        )

    if req.available_from and local_date < date_type.fromisoformat(req.available_from):
        raise HTTPException(status_code=400, detail="Обраний час до початку дозволеного проміжку.")
    if req.available_to and local_date > date_type.fromisoformat(req.available_to):
        raise HTTPException(status_code=400, detail="Обраний час після кінця дозволеного проміжку.")
    if req.available_hour_from is not None and local_hour < req.available_hour_from:
        raise HTTPException(status_code=400, detail=f"Можна обрати не раніше {req.available_hour_from:02d}:00.")
    if req.available_hour_to is not None and local_hour > req.available_hour_to:
        raise HTTPException(status_code=400, detail=f"Можна обрати не пізніше {req.available_hour_to:02d}:00.")

    existing = db.query(models.RequestVolunteer).filter(
        models.RequestVolunteer.user_id == current_user.id,
        models.RequestVolunteer.request_id == request_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Ви вже записались на цей запит.")

    window_start = scheduled - timedelta(hours=1)
    window_end   = scheduled + timedelta(hours=1)
    conflict = db.query(models.RequestVolunteer).filter(
        models.RequestVolunteer.user_id == current_user.id,
        models.RequestVolunteer.status != "rejected",
        models.RequestVolunteer.scheduled_at >= window_start,
        models.RequestVolunteer.scheduled_at <= window_end,
    ).first()
    if conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="У вас вже є заявка в цей час. Мінімальний інтервал між записами — 1 година.",
        )

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

@router.delete("/applications/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_application(
    application_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = db.query(models.RequestVolunteer).filter(
        models.RequestVolunteer.id == application_id
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Заявку не знайдено.")
    if app.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Ви не можете скасувати чужу заявку.")
    if app.status == "approved":
        raise HTTPException(status_code=400, detail="Не можна скасувати підтверджену заявку. Зверніться до бенефіціара.")
    db.delete(app)
    db.commit()

@router.patch("/{request_id}/close")
async def close_request(
    request_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    req = db.query(models.HelpRequest).filter(models.HelpRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Запит не знайдено.")
    if req.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Тільки власник може закрити запит.")
    if req.status == "completed":
        raise HTTPException(status_code=400, detail="Запит вже закрито.")
    req.status = "completed"
    db.commit()
    await FastAPICache.clear(namespace=_NS_LIST)
    return {"status": "completed"}

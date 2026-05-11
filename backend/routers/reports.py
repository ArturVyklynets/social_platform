from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

import models, schemas
from dependencies import get_db, get_current_user
from cloudinary_config import upload_image

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.post("/{request_id}", response_model=schemas.ReportResponse, status_code=status.HTTP_201_CREATED)
async def submit_report(
    request_id: int,
    comment: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != models.RoleEnum.volunteer:
        raise HTTPException(status_code=403, detail="Тільки волонтери можуть надсилати звіти.")

    req = db.query(models.HelpRequest).filter(models.HelpRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Запит не знайдено.")

    application = db.query(models.RequestVolunteer).filter(
        models.RequestVolunteer.user_id == current_user.id,
        models.RequestVolunteer.request_id == request_id,
        models.RequestVolunteer.status == "approved",
    ).first()
    if not application:
        raise HTTPException(status_code=403, detail="У вас немає підтвердженої заявки на цей запит.")

    existing = db.query(models.Report).filter(
        models.Report.application_id == application.id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Звіт для цієї заявки вже надіслано.")

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Лише JPEG, PNG, WebP або GIF зображення.")

    contents = await file.read()
    photo_url = upload_image(contents, folder="kindlink/reports")

    report = models.Report(
        application_id=application.id,
        volunteer_id=current_user.id,
        request_id=request_id,
        photo_url=photo_url,
        comment=comment,
    )
    db.add(report)
    req.status = "completed"
    db.commit()
    db.refresh(report)
    return report


@router.get("/{request_id}", response_model=schemas.ReportResponse)
def get_report(
    request_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    report = db.query(models.Report).filter(
        models.Report.request_id == request_id
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Звіт не знайдено.")
    return report

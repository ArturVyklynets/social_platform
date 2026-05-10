from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from dependencies import get_db, get_current_user

router = APIRouter(prefix="/api/bookings", tags=["Bookings (Volunteers)"])

@router.post("/", response_model=schemas.BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    booking: schemas.BookingCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.RoleEnum.volunteer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Тільки волонтери можуть відгукуватися на запити."
        )
    
    request = db.query(models.HelpRequest).filter(models.HelpRequest.id == booking.request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Запит не знайдено.")

    new_booking = models.Booking(
        request_id=booking.request_id,
        volunteer_id=current_user.id,
        scheduled_time=booking.scheduled_time
    )
    db.add(new_booking)
    
    request.status = "in_progress"
    
    db.commit()
    db.refresh(new_booking)
    return new_booking
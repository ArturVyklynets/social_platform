from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from dependencies import get_db, get_current_user

router = APIRouter(prefix="/api/donations", tags=["Donations (Donors)"])

@router.post("/", response_model=schemas.DonationResponse, status_code=status.HTTP_201_CREATED)
def make_donation(
    donation: schemas.DonationCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.RoleEnum.donor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Тільки донори можуть фінансувати запити."
        )
    
    request = db.query(models.HelpRequest).filter(models.HelpRequest.id == donation.request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Запит не знайдено.")

    new_donation = models.DonationTx(
        request_id=donation.request_id,
        donor_id=current_user.id,
        amount=donation.amount,
        status="success"
    )
    db.add(new_donation)
    db.commit()
    db.refresh(new_donation)
    
    return new_donation
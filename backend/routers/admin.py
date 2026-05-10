from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

import models
from dependencies import get_current_admin, get_db

router = APIRouter(prefix="/api/admin", tags=["Admin"])

VALID_ROLES = {"Бенефіціар", "Волонтер", "Донор", "Адмін"}


class RoleUpdateRequest(BaseModel):
    role: str

@router.get("/users")
def list_users(
    _: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    users = (
        db.query(models.User)
        .options(joinedload(models.User.profile))
        .order_by(models.User.id)
        .all()
    )
    return [
        {
            "id":         u.id,
            "email":      u.email,
            "role":       u.role,
            "avatar_url": u.avatar_url,
            "is_blocked": u.is_blocked,
            "full_name":  u.profile.full_name if u.profile else None,
            "phone":      u.profile.phone     if u.profile else None,
        }
        for u in users
    ]


@router.get("/users/{user_id}")
def get_user_detail(
    user_id: int,
    _: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = (
        db.query(models.User)
        .options(joinedload(models.User.profile))
        .filter(models.User.id == user_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="Користувача не знайдено.")

    requests_count = db.query(func.count(models.HelpRequest.id)).filter(
        models.HelpRequest.author_id == user_id
    ).scalar()

    donations_count = db.query(func.count(models.DonationTx.id)).filter(
        models.DonationTx.donor_id == user_id,
        models.DonationTx.status == "success",
    ).scalar()

    total_donated = db.query(func.sum(models.DonationTx.amount)).filter(
        models.DonationTx.donor_id == user_id,
        models.DonationTx.status == "success",
    ).scalar() or 0.0

    volunteer_count = db.query(func.count(models.RequestVolunteer.id)).filter(
        models.RequestVolunteer.user_id == user_id
    ).scalar()

    return {
        "id":         user.id,
        "email":      user.email,
        "role":       user.role,
        "avatar_url": user.avatar_url,
        "is_blocked": user.is_blocked,
        "full_name":  user.profile.full_name if user.profile else None,
        "phone":      user.profile.phone     if user.profile else None,
        "bio":        user.profile.skills    if user.profile else None,
        "stats": {
            "requests_count":  requests_count,
            "donations_count": donations_count,
            "total_donated":   float(total_donated),
            "volunteer_count": volunteer_count,
        },
    }


@router.patch("/users/{user_id}/block")
def toggle_block(
    user_id: int,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Адміністратор не може заблокувати себе.")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Користувача не знайдено.")
    user.is_blocked = not user.is_blocked
    db.commit()
    return {"id": user.id, "is_blocked": user.is_blocked}


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    body: RoleUpdateRequest,
    _: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if body.role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Недійсна роль. Допустимі: {', '.join(sorted(VALID_ROLES))}",
        )
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Користувача не знайдено.")
    user.role = body.role
    db.commit()
    return {"id": user.id, "email": user.email, "role": user.role}


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Адміністратор не може видалити власний акаунт.")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Користувача не знайдено.")
    db.delete(user)
    db.commit()

@router.get("/requests")
def list_all_requests(
    _: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    reqs = (
        db.query(models.HelpRequest)
        .options(
            joinedload(models.HelpRequest.author)
            .joinedload(models.User.profile)
        )
        .order_by(models.HelpRequest.id.desc())
        .all()
    )
    return [
        {
            "id":               r.id,
            "title":            r.title,
            "description":      r.description,
            "category":         r.category,
            "status":           r.status,
            "goal_amount":      r.goal_amount,
            "collected_amount": r.collected_amount or 0.0,
            "card_number":      r.card_number,
            "image_url":        r.image_url,
            "payout_status":    r.payout_status or "unpaid",
            "payout_at":        r.payout_at.isoformat() if r.payout_at else None,
            "author": {
                "id":        r.author.id,
                "email":     r.author.email,
                "full_name": r.author.profile.full_name if r.author and r.author.profile else None,
            } if r.author else None,
        }
        for r in reqs
    ]


@router.patch("/requests/{request_id}/payout")
def mark_payout(
    request_id: int,
    _: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    req = db.query(models.HelpRequest).filter(models.HelpRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Запит не знайдено.")
    if not req.collected_amount or req.collected_amount <= 0:
        raise HTTPException(status_code=400, detail="Немає зібраних коштів для виплати.")
    req.payout_status = "paid"
    req.payout_at = datetime.utcnow()
    req.status = "completed"
    db.commit()
    return {
        "id":            req.id,
        "payout_status": req.payout_status,
        "payout_at":     req.payout_at.isoformat(),
    }


@router.delete("/requests/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_request(
    request_id: int,
    _: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    req = db.query(models.HelpRequest).filter(models.HelpRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Запит не знайдено.")

    db.query(models.RequestVolunteer).filter(models.RequestVolunteer.request_id == request_id).delete()
    db.query(models.DonationTx).filter(models.DonationTx.request_id == request_id).delete()
    db.query(models.Booking).filter(models.Booking.request_id == request_id).delete()

    db.delete(req)
    db.commit()

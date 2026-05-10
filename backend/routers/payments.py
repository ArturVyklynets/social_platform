import os
from datetime import datetime

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

import models
from dependencies import get_current_user, get_db

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

router = APIRouter(prefix="/api/payments", tags=["Payments"])


class CheckoutRequest(BaseModel):
    request_id: int
    amount: float


class CheckoutResponse(BaseModel):
    checkout_session_url: str


@router.post("/create-checkout-session", response_model=CheckoutResponse)
def create_checkout_session(
    body: CheckoutRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not stripe.api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe is not configured. Set STRIPE_SECRET_KEY.",
        )

    req = db.query(models.HelpRequest).filter(models.HelpRequest.id == body.request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Запит не знайдено.")

    if body.amount < 1:
        raise HTTPException(status_code=400, detail="Сума повинна бути не менше ₴1.")

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "uah",
                    "product_data": {"name": f"Donation for Request #{body.request_id}"},
                    "unit_amount": int(body.amount * 100),
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{frontend_url}/dashboard?payment=success",
            cancel_url=f"{frontend_url}/dashboard?payment=cancel",
            metadata={"request_id": str(body.request_id), "user_id": str(current_user.id)},
        )
    except stripe.StripeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return {"checkout_session_url": session.url}


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    payload        = await request.body()
    sig_header     = request.headers.get("stripe-signature", "")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")

    if not webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="STRIPE_WEBHOOK_SECRET is not configured.",
        )

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except stripe.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid Stripe webhook signature.")
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed webhook payload.")

    if event["type"] == "checkout.session.completed":
        session    = event["data"]["object"]
        request_id = int(session["metadata"]["request_id"])
        user_id    = int(session["metadata"].get("user_id", 0))
        amount_uah = round(session["amount_total"] / 100, 2)

        req = db.query(models.HelpRequest).filter(models.HelpRequest.id == request_id).first()
        if req:
            req.collected_amount = round((req.collected_amount or 0.0) + amount_uah, 2)

            if user_id:
                db.add(models.DonationTx(
                    donor_id=user_id,
                    request_id=request_id,
                    amount=amount_uah,
                    stripe_session_id=session["id"],
                    status="success",
                    created_at=datetime.utcnow(),
                ))

            db.commit()

    return {"status": "ok"}


@router.get("/my-donations")
def get_my_donations(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    donations = (
        db.query(models.DonationTx)
        .options(joinedload(models.DonationTx.help_request))
        .filter(
            models.DonationTx.donor_id == current_user.id,
            models.DonationTx.status == "success",
        )
        .order_by(models.DonationTx.id.desc())
        .all()
    )
    return [
        {
            "id":            d.id,
            "amount":        float(d.amount),
            "request_id":    d.request_id,
            "request_title": d.help_request.title if d.help_request else "—",
            "created_at":    d.created_at.isoformat() if d.created_at else None,
        }
        for d in donations
    ]

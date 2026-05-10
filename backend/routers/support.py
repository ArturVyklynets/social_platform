from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

import models
from models import Profile
from dependencies import get_current_user, get_current_user_allow_blocked, get_current_admin, get_db

router = APIRouter(prefix="/api/support", tags=["Support"])


class TicketCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=120)
    body:  str = Field(..., min_length=10, max_length=2000)


class ReplyBody(BaseModel):
    reply: str = Field(..., min_length=1, max_length=2000)


class MessageCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000)


def _serialize(t: models.SupportTicket) -> dict:
    return {
        "id":          t.id,
        "title":       t.title,
        "body":        t.body,
        "status":      t.status,
        "admin_reply": t.admin_reply,
        "replied_at":  t.replied_at.isoformat() if t.replied_at else None,
        "created_at":  t.created_at.isoformat() if t.created_at else None,
        "user": {
            "id":        t.user.id,
            "email":     t.user.email,
            "full_name": t.user.profile.full_name if t.user and t.user.profile else None,
        } if t.user else None,
    }


@router.post("/tickets", status_code=201)
def create_ticket(
    data: TicketCreate,
    current_user: models.User = Depends(get_current_user_allow_blocked),
    db: Session = Depends(get_db),
):
    ticket = models.SupportTicket(
        user_id=current_user.id,
        title=data.title,
        body=data.body,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return {"id": ticket.id, "status": ticket.status}


@router.get("/my-tickets")
def get_my_tickets(
    current_user: models.User = Depends(get_current_user_allow_blocked),
    db: Session = Depends(get_db),
):
    tickets = (
        db.query(models.SupportTicket)
        .filter(models.SupportTicket.user_id == current_user.id)
        .order_by(models.SupportTicket.created_at.desc())
        .all()
    )
    return [
        {
            "id":          t.id,
            "title":       t.title,
            "body":        t.body,
            "status":      t.status,
            "admin_reply": t.admin_reply,
            "replied_at":  t.replied_at.isoformat() if t.replied_at else None,
            "created_at":  t.created_at.isoformat() if t.created_at else None,
        }
        for t in tickets
    ]

@router.get("/tickets")
def list_tickets(
    _: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    tickets = (
        db.query(models.SupportTicket)
        .options(joinedload(models.SupportTicket.user).joinedload(models.User.profile))
        .order_by(models.SupportTicket.created_at.desc())
        .all()
    )
    return [_serialize(t) for t in tickets]

@router.patch("/tickets/{ticket_id}/reply")
def reply_to_ticket(
    ticket_id: int,
    data: ReplyBody,
    _: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    ticket = db.query(models.SupportTicket).filter(models.SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Звернення не знайдено.")
    ticket.admin_reply = data.reply
    ticket.replied_at  = datetime.utcnow()
    db.commit()
    return _serialize(ticket)

@router.patch("/tickets/{ticket_id}/resolve")
def resolve_ticket(
    ticket_id: int,
    _: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    ticket = db.query(models.SupportTicket).filter(models.SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Звернення не знайдено.")
    ticket.status = "resolved"
    db.commit()
    return {"id": ticket.id, "status": ticket.status}

@router.post("/tickets/{ticket_id}/messages", status_code=201)
def post_message(
    ticket_id: int,
    data: MessageCreate,
    current_user: models.User = Depends(get_current_user_allow_blocked),
    db: Session = Depends(get_db),
):
    ticket = db.query(models.SupportTicket).filter(models.SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Звернення не знайдено.")
    if current_user.role != "Адмін" and ticket.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Доступ заборонено.")
    if ticket.status == "resolved":
        raise HTTPException(status_code=400, detail="Звернення закрито. Нові повідомлення неможливі.")
    msg = models.TicketMessage(
        ticket_id=ticket_id,
        sender_id=current_user.id,
        body=data.body,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    sender_profile = db.query(models.Profile).filter(models.Profile.user_id == current_user.id).first()
    return {
        "id":          msg.id,
        "sender_id":   msg.sender_id,
        "sender_role": current_user.role,
        "sender_name": sender_profile.full_name if sender_profile else None,
        "sender_email": current_user.email,
        "body":        msg.body,
        "created_at":  msg.created_at.isoformat() if msg.created_at else None,
    }

@router.get("/tickets/{ticket_id}/messages")
def get_ticket_messages(
    ticket_id: int,
    current_user: models.User = Depends(get_current_user_allow_blocked),
    db: Session = Depends(get_db),
):
    ticket = db.query(models.SupportTicket).filter(models.SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Звернення не знайдено.")
    if current_user.role != "Адмін" and ticket.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Доступ заборонено.")
    messages = (
        db.query(models.TicketMessage)
        .options(joinedload(models.TicketMessage.sender).joinedload(models.User.profile))
        .filter(models.TicketMessage.ticket_id == ticket_id)
        .order_by(models.TicketMessage.created_at)
        .all()
    )
    return [
        {
            "id":           m.id,
            "sender_id":    m.sender_id,
            "sender_role":  m.sender.role,
            "sender_name":  m.sender.profile.full_name if m.sender.profile else None,
            "sender_email": m.sender.email,
            "body":         m.body,
            "created_at":   m.created_at.isoformat() if m.created_at else None,
        }
        for m in messages
    ]

@router.delete("/tickets/{ticket_id}", status_code=204)
def delete_ticket(
    ticket_id: int,
    _: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    ticket = db.query(models.SupportTicket).filter(models.SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Звернення не знайдено.")
    db.delete(ticket)
    db.commit()

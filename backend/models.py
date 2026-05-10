from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, Numeric, DateTime, Float, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base

class RoleEnum(str, enum.Enum):
    pending     = "pending"
    beneficiary = "Бенефіціар"
    volunteer   = "Волонтер"
    donor       = "Донор"
    admin       = "Адмін"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(String, default=RoleEnum.pending)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    is_blocked = Column(Boolean, default=False, nullable=False)

    profile = relationship("Profile", back_populates="user", uselist=False)
    requests = relationship("HelpRequest", back_populates="author")
    bookings = relationship("Booking", back_populates="volunteer")
    donations = relationship("DonationTx", back_populates="donor")
    volunteer_applications = relationship("RequestVolunteer", back_populates="user")
    support_tickets        = relationship("SupportTicket", back_populates="user")

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    full_name = Column(String)
    phone = Column(String)
    skills = Column(Text)

    user = relationship("User", back_populates="profile")

class HelpRequest(Base):
    __tablename__ = "help_requests"

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String, nullable=True)
    goal_amount = Column(Float, nullable=True)
    collected_amount = Column(Float, default=0.0)
    card_number = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    status = Column(String, default="open")
    payout_status = Column(String, default="unpaid")
    payout_at = Column(DateTime, nullable=True)

    author = relationship("User", back_populates="requests")
    bookings = relationship("Booking", back_populates="help_request")
    donations = relationship("DonationTx", back_populates="help_request")
    volunteer_applications = relationship("RequestVolunteer", back_populates="help_request")

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("help_requests.id"))
    volunteer_id = Column(Integer, ForeignKey("users.id"))
    scheduled_time = Column(DateTime)
    status = Column(String, default="pending")

    help_request = relationship("HelpRequest", back_populates="bookings")
    volunteer = relationship("User", back_populates="bookings")
    report = relationship("Report", back_populates="booking", uselist=False)

class DonationTx(Base):
    __tablename__ = "donation_tx"

    id = Column(Integer, primary_key=True, index=True)
    donor_id = Column(Integer, ForeignKey("users.id"))
    request_id = Column(Integer, ForeignKey("help_requests.id"))
    amount = Column(Numeric(10, 2))
    stripe_session_id = Column("liqpay_order_id", String)
    status = Column(String, default="pending")
    created_at = Column(DateTime, nullable=True, default=datetime.utcnow)

    donor = relationship("User", back_populates="donations")
    help_request = relationship("HelpRequest", back_populates="donations")

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"))
    photo_url = Column(Text)
    review = Column(Text)
    rating = Column(Integer)

    booking = relationship("Booking", back_populates="report")


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    title      = Column(String, nullable=False)
    body       = Column(Text, nullable=False)
    status      = Column(String, default="open")
    admin_reply = Column(Text, nullable=True)
    replied_at  = Column(DateTime, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)

    user     = relationship("User", back_populates="support_tickets")
    messages = relationship("TicketMessage", back_populates="ticket", order_by="TicketMessage.created_at")


class TicketMessage(Base):
    __tablename__ = "ticket_messages"

    id         = Column(Integer, primary_key=True, index=True)
    ticket_id  = Column(Integer, ForeignKey("support_tickets.id"), nullable=False)
    sender_id  = Column(Integer, ForeignKey("users.id"), nullable=False)
    body       = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    ticket = relationship("SupportTicket", back_populates="messages")
    sender = relationship("User")


class RequestVolunteer(Base):
    __tablename__ = "request_volunteers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    request_id = Column(Integer, ForeignKey("help_requests.id"), nullable=False)
    scheduled_at = Column(DateTime, nullable=False)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="volunteer_applications")
    help_request = relationship("HelpRequest", back_populates="volunteer_applications")
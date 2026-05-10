from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

class Token(BaseModel):
    access_token: str
    token_type: str

class UserCreate(BaseModel):
    email: str
    password: str
    role: str = "Бенефіціар"
    captcha_token: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    avatar_url: Optional[str] = None
    is_blocked: bool = False

    class Config:
        from_attributes = True
    
class HelpRequestBase(BaseModel):
    title: str
    description: str
    category: Optional[str] = None
    goal_amount: Optional[float] = None
    image_url: Optional[str] = None
    card_number: Optional[str] = None

class HelpRequestCreate(HelpRequestBase):
    pass

class HelpRequestResponse(HelpRequestBase):
    id: int
    author_id: int
    status: str
    collected_amount: float = 0.0

    class Config:
        from_attributes = True

# --- СХЕМИ ДЛЯ ВОЛОНТЕРІВ (БРОНЮВАННЯ) ---
class BookingCreate(BaseModel):
    request_id: int
    scheduled_time: datetime

class BookingResponse(BaseModel):
    id: int
    request_id: int
    volunteer_id: int
    scheduled_time: datetime
    status: str

    class Config:
        from_attributes = True

class RoleUpdate(BaseModel):
    role: Literal["beneficiary", "volunteer", "donor"]

class ProfileUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    bio: str | None = None

class ProfileResponse(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    bio: str | None = None

    class Config:
        from_attributes = True

class DonationCreate(BaseModel):
    request_id: int
    amount: Decimal

class DonationResponse(BaseModel):
    id: int
    request_id: int
    donor_id: int
    amount: Decimal
    status: str

    class Config:
        from_attributes = True

class UploadResponse(BaseModel):
    url: str

class VolunteerApplicationCreate(BaseModel):
    scheduled_at: datetime

class VolunteerApplicationResponse(BaseModel):
    id: int
    user_id: int
    request_id: int
    scheduled_at: datetime
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class ApplicationStatusUpdate(BaseModel):
    status: Literal["approved", "rejected"]

class IncomingApplicationResponse(BaseModel):
    id: int
    request_id: int
    request_title: str
    scheduled_at: datetime
    status: str
    volunteer_email: str
    volunteer_name: Optional[str] = None
    volunteer_phone: Optional[str] = None

class MyApplicationResponse(BaseModel):
    id: int
    request_id: int
    request_title: str
    request_category: Optional[str] = None
    scheduled_at: datetime
    status: str
    created_at: datetime


class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


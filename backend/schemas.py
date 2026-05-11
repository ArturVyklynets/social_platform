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
    available_from: Optional[str] = None
    available_to: Optional[str] = None
    available_hour_from: Optional[int] = None
    available_hour_to: Optional[int] = None

class HelpRequestCreate(HelpRequestBase):
    pass

class HelpRequestResponse(HelpRequestBase):
    id: int
    author_id: int
    status: str
    collected_amount: float = 0.0

    class Config:
        from_attributes = True

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
    volunteer_id: int
    volunteer_email: str
    volunteer_name: Optional[str] = None
    volunteer_phone: Optional[str] = None


class ReviewCreate(BaseModel):
    rating: int
    comment: Optional[str] = None

class ReviewResponse(BaseModel):
    id: int
    request_id: int
    volunteer_id: int
    author_id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    author_name: Optional[str] = None
    request_title: Optional[str] = None


class PublicUserResponse(BaseModel):
    id: int
    role: str
    avatar_url: Optional[str] = None
    full_name: Optional[str] = None
    bio: Optional[str] = None
    average_rating: Optional[float] = None
    reviews_count: int = 0

class MyApplicationResponse(BaseModel):
    id: int
    request_id: int
    request_title: str
    request_category: Optional[str] = None
    scheduled_at: datetime
    status: str
    created_at: datetime
    has_report: bool = False


class ReportResponse(BaseModel):
    id: int
    application_id: int
    volunteer_id: int
    request_id: int
    photo_url: Optional[str] = None
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


import os
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from sqlalchemy.orm import Session

import models, schemas, security
from dependencies import get_db
from email_config import send_reset_email

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

TOKEN_MAX_AGE_SECONDS = 15 * 60


def _get_serializer() -> URLSafeTimedSerializer:
    secret = os.getenv("SECRET_KEY", "fallback-dev-secret-change-me")
    return URLSafeTimedSerializer(secret, salt="password-reset")


def verify_captcha(token: str) -> bool:
    secret = os.getenv("RECAPTCHA_SECRET_KEY", "")
    if not secret:
        return True
    response = httpx.post(
        "https://www.google.com/recaptcha/api/siteverify",
        data={"secret": secret, "response": token},
    )
    return response.json().get("success", False)


@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if user.captcha_token:
        if not verify_captcha(user.captcha_token):
            raise HTTPException(status_code=400, detail="Invalid captcha. Please try again.")

    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Цей email вже зареєстровано!")

    hashed_password = security.get_password_hash(user.password)
    new_user = models.User(email=user.email, password_hash=hashed_password, role=user.role)

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Невірний email або пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = security.create_access_token(data={"sub": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(
    body: schemas.ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.email == body.email).first()

    if not user:
        return {"message": "If that email is registered, you will receive a reset link shortly."}

    token = _get_serializer().dumps(user.email)
    reset_link = f"http://localhost:5173/reset-password?token={token}"

    background_tasks.add_task(send_reset_email, user.email, reset_link)

    return {"message": "If that email is registered, you will receive a reset link shortly."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(body: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    s = _get_serializer()
    try:
        email = s.loads(body.token, max_age=TOKEN_MAX_AGE_SECONDS)
    except SignatureExpired:
        raise HTTPException(status_code=400, detail="Reset link has expired. Please request a new one.")
    except BadSignature:
        raise HTTPException(status_code=400, detail="Invalid reset link.")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid reset link.")

    user.password_hash = security.get_password_hash(body.new_password)
    db.commit()

    return {"message": "Password updated successfully. You can now sign in."}

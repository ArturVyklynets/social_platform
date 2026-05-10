import os
import secrets
import httpx
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

import models, security
from dependencies import get_db

router = APIRouter(prefix="/api/auth", tags=["Google OAuth"])

GOOGLE_REDIRECT_URI  = "http://localhost:8000/api/auth/google/callback"
FRONTEND_URL         = "http://localhost:5173"

GOOGLE_AUTH_URL     = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL    = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


@router.get("/google/login")
def google_login():
    client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    if not client_id:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured on the server.")
    params = {
        "client_id":     client_id,
        "redirect_uri":  GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope":         "openid email profile",
        "access_type":   "online",
    }
    return {"url": f"{GOOGLE_AUTH_URL}?{urlencode(params)}"}


@router.get("/google/callback")
def google_callback(code: str, db: Session = Depends(get_db)):
    client_id     = os.getenv("GOOGLE_CLIENT_ID", "")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "")
    with httpx.Client() as client:
        token_resp = client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code":          code,
                "client_id":     client_id,
                "client_secret": client_secret,
                "redirect_uri":  GOOGLE_REDIRECT_URI,
                "grant_type":    "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code with Google.")

        google_access_token = token_resp.json().get("access_token")

        userinfo_resp = client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {google_access_token}"},
        )
        if userinfo_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch user info from Google.")

    google_user = userinfo_resp.json()
    email = google_user.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Google account did not provide an email address.")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        user = models.User(
            email=email,
            password_hash=security.get_password_hash(secrets.token_hex(32)),
            role=models.RoleEnum.pending,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    jwt_token = security.create_access_token(data={"sub": user.email, "role": user.role})
    return RedirectResponse(url=f"{FRONTEND_URL}/?token={jwt_token}")

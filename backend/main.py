from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from database import engine, Base
from routers import auth, users, requests, bookings, donations, google_auth, payments, admin, support

Base.metadata.create_all(bind=engine)

with engine.connect() as _conn:
    _conn.execute(text(
        "ALTER TABLE donation_tx ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()"
    ))
    _conn.execute(text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE"
    ))
    _conn.execute(text(
        "ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS admin_reply TEXT"
    ))
    _conn.execute(text(
        "ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP"
    ))
    _conn.execute(text(
        "ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS payout_status VARCHAR DEFAULT 'unpaid'"
    ))
    _conn.execute(text(
        "ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS payout_at TIMESTAMP"
    ))
    _conn.execute(text("""
        CREATE TABLE IF NOT EXISTS ticket_messages (
            id         SERIAL PRIMARY KEY,
            ticket_id  INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
            sender_id  INTEGER NOT NULL REFERENCES users(id),
            body       TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """))
    _conn.commit()

app = FastAPI(
    title="Social Volunteer Platform API",
    description="АРІ для платформи соціального волонтерства",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(requests.router)
app.include_router(bookings.router)
app.include_router(donations.router)
app.include_router(google_auth.router)
app.include_router(payments.router)
app.include_router(admin.router)
app.include_router(support.router)

@app.get("/")
async def root():
    return {"message": "Сервер працює! Архітектура ідеально структурована."}

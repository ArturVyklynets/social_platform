import os
from pathlib import Path
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from redis import asyncio as aioredis
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from database import engine, Base
from routers import auth, users, requests, bookings, donations, google_auth, payments, admin, support, reviews, reports

Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(_app: FastAPI):
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    redis = aioredis.from_url(redis_url)
    FastAPICache.init(RedisBackend(redis), prefix="kindlink-cache")
    yield

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
    _conn.execute(text("ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS available_from VARCHAR"))
    _conn.execute(text("ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS available_to VARCHAR"))
    _conn.execute(text("ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS available_hour_from INTEGER"))
    _conn.execute(text("ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS available_hour_to INTEGER"))
    _conn.execute(text("""
        CREATE TABLE IF NOT EXISTS reviews (
            id           SERIAL PRIMARY KEY,
            request_id   INTEGER NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
            volunteer_id INTEGER NOT NULL REFERENCES users(id),
            author_id    INTEGER NOT NULL REFERENCES users(id),
            rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
            comment      TEXT,
            created_at   TIMESTAMP DEFAULT NOW(),
            UNIQUE (request_id, volunteer_id, author_id)
        )
    """))
    _conn.execute(text("DROP TABLE IF EXISTS reports"))
    _conn.execute(text("""
        CREATE TABLE IF NOT EXISTS reports (
            id             SERIAL PRIMARY KEY,
            application_id INTEGER NOT NULL UNIQUE REFERENCES request_volunteers(id) ON DELETE CASCADE,
            volunteer_id   INTEGER NOT NULL REFERENCES users(id),
            request_id     INTEGER NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
            photo_url      TEXT,
            comment        TEXT,
            created_at     TIMESTAMP DEFAULT NOW()
        )
    """))
    _conn.commit()

app = FastAPI(
    title="Social Volunteer Platform API",
    description="АРІ для платформи соціального волонтерства",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(requests.router)
app.include_router(bookings.router)
app.include_router(donations.router)
app.include_router(google_auth.router)
app.include_router(payments.router)
app.include_router(admin.router)
app.include_router(support.router)
app.include_router(reviews.router)
app.include_router(reports.router)

@app.get("/")
async def root():
    return {"message": "Сервер працює! Архітектура ідеально структурована."}

"""
Pytest configuration for the KindLink backend test suite.

Strategy
--------
`main.py` contains module-level code that connects to a live PostgreSQL
instance and to Redis, so we never import it.  Instead we:

  1. Inject mock versions of every external module (FastAPICache, Redis,
     Cloudinary, Google Calendar, e-mail) into sys.modules *before* any
     application code is imported.
  2. Replace the `database` module with a thin fake that points at an
     in-memory SQLite database backed by a StaticPool (single shared
     connection) so every SQLAlchemy session sees the same data.
  3. Build a minimal FastAPI test application that includes only the
     routers under test (auth, payments, requests).
  4. Expose pytest fixtures: client, db, test_user, blocked_user,
     auth_headers, blocked_headers, test_request.
"""

import os
import sys
import types
from unittest.mock import AsyncMock, MagicMock

# ── 1. Test environment variables ─────────────────────────────────────────────
# Must be set before any application module is imported.
os.environ["RECAPTCHA_SECRET_KEY"]  = ""               # disables captcha check
os.environ["STRIPE_WEBHOOK_SECRET"] = "whsec_test_secret"
os.environ["STRIPE_SECRET_KEY"]     = "sk_test_dummy"
os.environ["SECRET_KEY"]            = "test-secret-key"

# ── 2. Mock FastAPICache (fastapi_cache + sub-modules) ────────────────────────
# @cache becomes a transparent no-op; FastAPICache.clear() is an AsyncMock.
_fc_cls = MagicMock()
_fc_cls.clear      = AsyncMock(return_value=None)
_fc_cls.get_prefix = MagicMock(return_value="test")

_fc_mod  = types.ModuleType("fastapi_cache")
_fc_mod.FastAPICache = _fc_cls

_fcd_mod = types.ModuleType("fastapi_cache.decorator")
_fcd_mod.cache = lambda *a, **kw: (lambda fn: fn)   # no-op decorator

_fcr_mod = types.ModuleType("fastapi_cache.backends.redis")
_fcr_mod.RedisBackend = MagicMock()

sys.modules["fastapi_cache"]                = _fc_mod
sys.modules["fastapi_cache.decorator"]      = _fcd_mod
sys.modules["fastapi_cache.backends.redis"] = _fcr_mod

# ── 3. Mock Cloudinary ────────────────────────────────────────────────────────
_cloud_mod = types.ModuleType("cloudinary_config")
_cloud_mod.upload_image = AsyncMock(return_value="http://cdn.test/img.jpg")
_cloud_mod.delete_image = AsyncMock(return_value=None)
sys.modules["cloudinary_config"] = _cloud_mod

# ── 4. Mock Google Calendar service ──────────────────────────────────────────
_cal_mod = types.ModuleType("services.calendar_service")
_cal_mod.add_event    = MagicMock(return_value=None)
_cal_mod.delete_event = MagicMock(return_value=None)

_svc_mod = types.ModuleType("services")
_svc_mod.calendar_service = _cal_mod

sys.modules["services"]                  = _svc_mod
sys.modules["services.calendar_service"] = _cal_mod

# ── 5. Mock e-mail config ─────────────────────────────────────────────────────
_email_mod = types.ModuleType("email_config")
_email_mod.send_reset_email = AsyncMock(return_value=None)
sys.modules["email_config"] = _email_mod

# ── 6. Inject a test `database` module ───────────────────────────────────────
# database.py has a hardcoded PostgreSQL URL, so we replace the whole module
# before any router imports it.
#
# LOCAL  → SQLite in-memory  (fast, no external deps)
# CI/CD  → PostgreSQL        (set TEST_DATABASE_URL env var in the workflow)
import pytest  # noqa: E402 – delayed until after env setup
from sqlalchemy import create_engine                       # noqa: E402
from sqlalchemy.orm import sessionmaker, declarative_base  # noqa: E402

_DB_URL = os.environ.get("TEST_DATABASE_URL", "sqlite:///:memory:")

if _DB_URL.startswith("sqlite"):
    from sqlalchemy.pool import StaticPool
    _engine = create_engine(
        _DB_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,   # all sessions share one in-memory connection
    )
else:
    # PostgreSQL in CI — use default connection pool
    _engine = create_engine(_DB_URL)

_SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
_Base         = declarative_base()

_db_mod = types.ModuleType("database")
_db_mod.SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
_db_mod.engine       = _engine
_db_mod.SessionLocal = _SessionLocal
_db_mod.Base         = _Base
sys.modules["database"] = _db_mod

# ── 7. Import application code (now uses the mocked modules above) ────────────
import models      # noqa: E402
import security    # noqa: E402
from dependencies import get_db  # noqa: E402

# Create all ORM-defined tables in the in-memory SQLite DB.
_Base.metadata.create_all(bind=_engine)

# ── 8. Build a minimal test FastAPI application ───────────────────────────────
from fastapi import FastAPI                    # noqa: E402
from fastapi.testclient import TestClient      # noqa: E402
from routers import auth      as _auth_router  # noqa: E402
from routers import payments  as _pay_router   # noqa: E402
from routers import requests  as _req_router   # noqa: E402

_test_app = FastAPI()
_test_app.include_router(_auth_router.router)
_test_app.include_router(_pay_router.router)
_test_app.include_router(_req_router.router)


def _override_get_db():
    """DB dependency override: yields a session against the SQLite test DB."""
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()


_test_app.dependency_overrides[get_db] = _override_get_db


# ── Fixtures ───────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def isolate_db():
    """Drop and recreate all tables before every test for full isolation."""
    _Base.metadata.drop_all(bind=_engine)
    _Base.metadata.create_all(bind=_engine)
    yield
    _Base.metadata.drop_all(bind=_engine)


@pytest.fixture
def client():
    """HTTP test client wired to the minimal test application."""
    with TestClient(_test_app) as c:
        yield c


@pytest.fixture
def db():
    """Raw SQLAlchemy session for seeding data and asserting DB state."""
    session = _SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def test_user(db):
    """A normal, active Beneficiary user with a known password."""
    user = models.User(
        email="beneficiary@test.com",
        password_hash=security.get_password_hash("Testpass1!"),
        role=models.RoleEnum.beneficiary,
        is_blocked=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def blocked_user(db):
    """A Beneficiary whose account has been blocked by an admin."""
    user = models.User(
        email="blocked@test.com",
        password_hash=security.get_password_hash("Testpass1!"),
        role=models.RoleEnum.beneficiary,
        is_blocked=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user):
    """Bearer-token Authorization headers for the test_user."""
    token = security.create_access_token(
        {"sub": test_user.email, "role": test_user.role}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def blocked_headers(blocked_user):
    """Bearer-token Authorization headers for the blocked_user."""
    token = security.create_access_token(
        {"sub": blocked_user.email, "role": blocked_user.role}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_request(db, test_user):
    """A HelpRequest owned by test_user, used in payment/webhook tests."""
    req = models.HelpRequest(
        title="Test Help Request",
        description="Used to verify financial logic in tests.",
        goal_amount=1000.0,
        collected_amount=0.0,
        author_id=test_user.id,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req

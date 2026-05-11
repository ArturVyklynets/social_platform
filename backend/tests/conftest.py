import os
import sys
import types
from unittest.mock import AsyncMock, MagicMock

os.environ["RECAPTCHA_SECRET_KEY"]  = ""
os.environ["STRIPE_WEBHOOK_SECRET"] = "whsec_test_secret"
os.environ["STRIPE_SECRET_KEY"]     = "sk_test_dummy"
os.environ["SECRET_KEY"]            = "test-secret-key"

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

_cloud_mod = types.ModuleType("cloudinary_config")
_cloud_mod.upload_image = AsyncMock(return_value="http://cdn.test/img.jpg")
_cloud_mod.delete_image = AsyncMock(return_value=None)
sys.modules["cloudinary_config"] = _cloud_mod

_cal_mod = types.ModuleType("services.calendar_service")
_cal_mod.add_event    = MagicMock(return_value=None)
_cal_mod.delete_event = MagicMock(return_value=None)

_svc_mod = types.ModuleType("services")
_svc_mod.calendar_service = _cal_mod

sys.modules["services"]                  = _svc_mod
sys.modules["services.calendar_service"] = _cal_mod

_email_mod = types.ModuleType("email_config")
_email_mod.send_reset_email = AsyncMock(return_value=None)
sys.modules["email_config"] = _email_mod

import pytest  # noqa: E402 – delayed until after env setup
from sqlalchemy import create_engine                       # noqa: E402
from sqlalchemy.orm import sessionmaker, declarative_base  # noqa: E402

_DB_URL = os.environ.get("TEST_DATABASE_URL", "sqlite:///:memory:")

if _DB_URL.startswith("sqlite"):
    from sqlalchemy.pool import StaticPool
    _engine = create_engine(
        _DB_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    _engine = create_engine(_DB_URL)

_SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
_Base         = declarative_base()

_db_mod = types.ModuleType("database")
_db_mod.SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
_db_mod.engine       = _engine
_db_mod.SessionLocal = _SessionLocal
_db_mod.Base         = _Base
sys.modules["database"] = _db_mod

import models      # noqa: E402
import security    # noqa: E402
from dependencies import get_db  # noqa: E402

_Base.metadata.create_all(bind=_engine)

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

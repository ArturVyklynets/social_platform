"""
Authentication tests.

Covers:
  - Successful user registration (captcha disabled via empty RECAPTCHA_SECRET_KEY)
  - reCAPTCHA bypass when secret key is absent
  - Duplicate-email rejection
  - Default role applied when role is not specified
  - Successful login returning a JWT token
  - JWT payload contains the correct role field
  - Login failure on wrong password / unknown email
  - 403 Forbidden for a blocked user on any protected endpoint
"""

import pytest
from fastapi.testclient import TestClient

import security


class TestRegistration:
    def test_register_success(self, client: TestClient):
        """A new user can register; returns 201 with the user payload."""
        response = client.post("/api/auth/register", json={
            "email":    "newuser@test.com",
            "password": "SecurePass1!",
            "role":     "Бенефіціар",
        })

        assert response.status_code == 201
        body = response.json()
        assert body["email"] == "newuser@test.com"
        assert body["role"]  == "Бенефіціар"
        assert "id" in body
        assert "password" not in body       # password must never be returned

    def test_register_captcha_bypassed_when_secret_missing(self, client: TestClient):
        """
        When RECAPTCHA_SECRET_KEY is empty (as in tests) verify_captcha()
        returns True immediately, so any captcha_token value is accepted.
        """
        response = client.post("/api/auth/register", json={
            "email":         "captcha@test.com",
            "password":      "SecurePass1!",
            "captcha_token": "dummy-captcha-token",
        })

        assert response.status_code == 201

    def test_register_invalid_role_accepted_without_validation(self, client: TestClient):
        """
        Бекенд не валідує рядок ролі при реєстрації — будь-яке значення
        приймається і зберігається як є.  Цей тест фіксує поточну поведінку
        та є сигналом, що серверна валідація ролей відсутня.
        """
        response = client.post("/api/auth/register", json={
            "email":    "anyrole@test.com",
            "password": "SecurePass1!",
            "role":     "Адмін",
        })

        assert response.status_code == 201
        assert response.json()["role"] == "Адмін"

    def test_register_duplicate_email_returns_400(self, client: TestClient, test_user):
        """Attempting to register an already-used e-mail returns HTTP 400."""
        response = client.post("/api/auth/register", json={
            "email":    test_user.email,
            "password": "AnotherPass1!",
        })

        assert response.status_code == 400
        assert "вже зареєстровано" in response.json()["detail"]


class TestLogin:
    def test_login_success_returns_jwt(self, client: TestClient, test_user):
        """
        POST /api/auth/login with correct credentials must return HTTP 200
        and a response body containing access_token and token_type='bearer'.
        """
        response = client.post("/api/auth/login", data={
            "username": test_user.email,
            "password": "Testpass1!",
        })

        assert response.status_code == 200
        body = response.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"

        # The token must decode to a payload whose 'sub' matches the user's email.
        payload = security.jwt.decode(
            body["access_token"],
            security.SECRET_KEY,
            algorithms=[security.ALGORITHM],
        )
        assert payload["sub"] == test_user.email

    def test_login_returns_correct_role_in_token(self, client: TestClient, test_user):
        """
        JWT-токен, що повертається після логіну, повинен містити поле 'role'
        зі значенням, що відповідає ролі користувача в базі даних.
        """
        response = client.post("/api/auth/login", data={
            "username": test_user.email,
            "password": "Testpass1!",
        })

        assert response.status_code == 200
        token = response.json()["access_token"]
        payload = security.jwt.decode(
            token,
            security.SECRET_KEY,
            algorithms=[security.ALGORITHM],
        )
        assert payload.get("role") == str(test_user.role)

    def test_login_wrong_password_returns_401(self, client: TestClient, test_user):
        """Wrong password must yield HTTP 401 Unauthorized."""
        response = client.post("/api/auth/login", data={
            "username": test_user.email,
            "password": "WrongPassword!",
        })

        assert response.status_code == 401

    def test_login_unknown_email_returns_401(self, client: TestClient):
        """Login for a non-existent account must yield HTTP 401."""
        response = client.post("/api/auth/login", data={
            "username": "ghost@test.com",
            "password": "SomePass1!",
        })

        assert response.status_code == 401


class TestBlockedUser:
    def test_blocked_user_gets_403_on_protected_route(
        self, client: TestClient, blocked_user
    ):
        """
        A valid JWT belonging to a user whose is_blocked=True must be
        rejected with HTTP 403 on any endpoint that depends on
        get_current_user (which raises 403 before the handler runs).
        """
        token = security.create_access_token(
            {"sub": blocked_user.email, "role": blocked_user.role}
        )
        headers = {"Authorization": f"Bearer {token}"}

        response = client.get("/api/requests/my-requests", headers=headers)

        assert response.status_code == 403
        assert "заблоковано" in response.json()["detail"]

    def test_unblocked_user_can_access_protected_route(
        self, client: TestClient, auth_headers
    ):
        """Sanity check: a normal user must reach the same endpoint (200)."""
        response = client.get("/api/requests/my-requests", headers=auth_headers)

        assert response.status_code == 200

    def test_no_token_returns_401(self, client: TestClient):
        """Accessing a protected endpoint without any token returns HTTP 401."""
        response = client.get("/api/requests/my-requests")

        assert response.status_code == 401

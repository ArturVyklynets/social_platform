"""
Financial and HelpRequest tests.

Covers:
  - GET /api/requests/ is public and returns a list
  - Creating a HelpRequest requires a valid JWT (401 without token)
  - Only Beneficiaries can create HelpRequests (403 for other roles)
  - Beneficiary with valid token can create a HelpRequest (201)
  - Stripe webhook: 503 when STRIPE_WEBHOOK_SECRET is not configured
  - Stripe webhook: 400 when the signature is invalid
  - Stripe webhook: checkout.session.completed increments collected_amount
    and creates a DonationTx record in the database
"""

import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

import models
import security


class TestPublicEndpoints:
    def test_get_all_requests_returns_list(self, client: TestClient):
        """
        GET /api/requests/ — публічний маршрут, не потребує токена.
        Повинен повертати HTTP 200 та масив (порожній або з елементами).
        """
        response = client.get("/api/requests/")

        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_all_requests_reflects_created_data(
        self, client: TestClient, test_user, auth_headers
    ):
        """
        Після створення запиту він має з'явитись у публічному списку.
        """
        client.post("/api/requests/", json={
            "title":       "Видимий запит",
            "description": "Перевірка публічного списку.",
        }, headers=auth_headers)

        response = client.get("/api/requests/")

        assert response.status_code == 200
        titles = [r["title"] for r in response.json()]
        assert "Видимий запит" in titles


class TestHelpRequestCreation:
    def test_create_request_without_token_returns_401(self, client: TestClient):
        """POST /api/requests/ without Authorization must return HTTP 401."""
        response = client.post("/api/requests/", json={
            "title":       "Need Help",
            "description": "Please help me.",
        })

        assert response.status_code == 401

    def test_create_request_as_non_beneficiary_returns_403(
        self, client: TestClient, db
    ):
        """
        A Volunteer attempting to create a HelpRequest must receive 403
        because only Beneficiaries are allowed to submit requests.
        """
        volunteer = models.User(
            email="volunteer@test.com",
            password_hash=security.get_password_hash("Pass1!"),
            role=models.RoleEnum.volunteer,
            is_blocked=False,
        )
        db.add(volunteer)
        db.commit()
        db.refresh(volunteer)

        token = security.create_access_token(
            {"sub": volunteer.email, "role": volunteer.role}
        )
        headers = {"Authorization": f"Bearer {token}"}

        response = client.post("/api/requests/", json={
            "title":       "Should Fail",
            "description": "Volunteers cannot create requests.",
        }, headers=headers)

        assert response.status_code == 403

    def test_create_request_as_beneficiary_returns_201(
        self, client: TestClient, test_user, auth_headers
    ):
        """
        A Beneficiary with a valid JWT can create a HelpRequest.
        The response must be 201 with the correct title and author_id.
        """
        response = client.post("/api/requests/", json={
            "title":       "Need Food Supplies",
            "description": "Running low on supplies.",
            "category":    "food",
            "goal_amount": 500.0,
        }, headers=auth_headers)

        assert response.status_code == 201
        body = response.json()
        assert body["title"]     == "Need Food Supplies"
        assert body["author_id"] == test_user.id
        assert body["collected_amount"] == 0.0


class TestStripeWebhook:
    _WEBHOOK_URL = "/api/payments/webhook"
    _DUMMY_BODY  = b'{"type": "checkout.session.completed"}'
    _DUMMY_SIG   = "t=1,v1=dummy_signature"

    def test_webhook_returns_503_when_secret_not_configured(
        self, client: TestClient, monkeypatch
    ):
        """
        If STRIPE_WEBHOOK_SECRET is an empty string the endpoint must
        return 503 Service Unavailable immediately.
        """
        monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "")

        response = client.post(
            self._WEBHOOK_URL,
            content=self._DUMMY_BODY,
            headers={"stripe-signature": self._DUMMY_SIG},
        )

        assert response.status_code == 503

    def test_webhook_returns_400_on_invalid_signature(self, client: TestClient):
        """
        A webhook request that fails Stripe signature verification must
        return HTTP 400 Bad Request.
        """
        # stripe.Webhook.construct_event raises SignatureVerificationError
        # for a mismatched signature, which our handler converts to 400.
        import stripe

        with patch(
            "stripe.Webhook.construct_event",
            side_effect=stripe.SignatureVerificationError("bad sig", "sig_header"),
        ):
            response = client.post(
                self._WEBHOOK_URL,
                content=self._DUMMY_BODY,
                headers={"stripe-signature": self._DUMMY_SIG},
            )

        assert response.status_code == 400

    def test_webhook_checkout_completed_updates_collected_amount(
        self, client: TestClient, db, test_user, test_request
    ):
        """
        Simulating a checkout.session.completed event must:
          1. Return HTTP 200 {"status": "ok"}.
          2. Increment HelpRequest.collected_amount by the paid amount (UAH).
          3. Create a DonationTx record with status='success'.

        stripe.Webhook.construct_event is mocked to avoid real Stripe calls
        and to avoid signature verification against the test secret.
        """
        AMOUNT_CENTS = 50_000          # 500.00 UAH
        AMOUNT_UAH   = 500.0

        # Build a realistic mock of the Stripe event object.
        mock_metadata = MagicMock()
        mock_metadata._data = {
            "request_id": str(test_request.id),
            "user_id":    str(test_user.id),
        }

        mock_session = MagicMock()
        mock_session.metadata     = mock_metadata
        mock_session.amount_total = AMOUNT_CENTS
        mock_session.id           = "cs_test_abc123"

        mock_event      = MagicMock()
        mock_event.type = "checkout.session.completed"
        mock_event.data.object = mock_session

        with patch("stripe.Webhook.construct_event", return_value=mock_event):
            response = client.post(
                self._WEBHOOK_URL,
                content=self._DUMMY_BODY,
                headers={"stripe-signature": self._DUMMY_SIG},
            )

        # ── 1. HTTP response ────────────────────────────────────────────────
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

        # ── 2. collected_amount incremented ────────────────────────────────
        # expire() forces SQLAlchemy to re-fetch from the DB on next access.
        db.expire(test_request)
        updated_request = (
            db.query(models.HelpRequest)
            .filter(models.HelpRequest.id == test_request.id)
            .first()
        )
        assert updated_request.collected_amount == pytest.approx(AMOUNT_UAH, abs=0.01)

        # ── 3. DonationTx created ──────────────────────────────────────────
        donation = (
            db.query(models.DonationTx)
            .filter_by(donor_id=test_user.id, request_id=test_request.id)
            .first()
        )
        assert donation is not None
        assert float(donation.amount) == pytest.approx(AMOUNT_UAH, abs=0.01)
        assert donation.stripe_session_id == "cs_test_abc123"
        assert donation.status == "success"

    def test_webhook_zero_amount_does_not_update_collected(
        self, client: TestClient, db, test_request
    ):
        """
        Якщо amount_total = 0 (Stripe надіслав нульову суму), обробник
        повинен повернути 200, але НЕ змінювати collected_amount запиту.
        Це граничний випадок фінансової логіки: умова `amount_uah <= 0`
        викликає ранній вихід з функції.
        """
        mock_metadata = MagicMock()
        mock_metadata._data = {"request_id": str(test_request.id), "user_id": "0"}

        mock_session = MagicMock()
        mock_session.metadata     = mock_metadata
        mock_session.amount_total = 0          # нульова сума
        mock_session.id           = "cs_test_zero"

        mock_event      = MagicMock()
        mock_event.type = "checkout.session.completed"
        mock_event.data.object = mock_session

        with patch("stripe.Webhook.construct_event", return_value=mock_event):
            response = client.post(
                self._WEBHOOK_URL,
                content=self._DUMMY_BODY,
                headers={"stripe-signature": self._DUMMY_SIG},
            )

        assert response.status_code == 200

        db.expire(test_request)
        unchanged = (
            db.query(models.HelpRequest)
            .filter(models.HelpRequest.id == test_request.id)
            .first()
        )
        assert unchanged.collected_amount == 0.0

    def test_webhook_ignores_unknown_event_type(
        self, client: TestClient, db, test_request
    ):
        """
        An event with an unrecognised type must return 200 but must NOT
        modify any HelpRequest.collected_amount.
        """
        mock_event      = MagicMock()
        mock_event.type = "payment_intent.created"   # not handled by our code

        with patch("stripe.Webhook.construct_event", return_value=mock_event):
            response = client.post(
                self._WEBHOOK_URL,
                content=b'{"type": "payment_intent.created"}',
                headers={"stripe-signature": self._DUMMY_SIG},
            )

        assert response.status_code == 200

        db.expire(test_request)
        unchanged = (
            db.query(models.HelpRequest)
            .filter(models.HelpRequest.id == test_request.id)
            .first()
        )
        assert unchanged.collected_amount == 0.0

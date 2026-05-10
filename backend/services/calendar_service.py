"""
Google Calendar integration service.

Current state: structured simulation that logs events and returns a response
matching the shape of the real Google Calendar API.

To wire up real OAuth2:
  1. pip install google-auth google-auth-oauthlib google-api-python-client
  2. Create OAuth2 credentials in Google Cloud Console (Calendar API scope).
  3. Store per-user access_token / refresh_token in the DB (e.g. a UserToken model).
  4. Replace the placeholder block below with the commented-out real implementation.
"""

import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Duration of a volunteer visit in minutes (used for the calendar event end time)
DEFAULT_VISIT_DURATION_MINUTES = 60


def add_volunteer_event(
    *,
    title: str,
    description: str,
    scheduled_at: datetime,
    volunteer_email: str,
) -> dict:
    """
    Add a volunteer visit event to the volunteer's primary Google Calendar.

    Returns a dict that mirrors the Google Calendar Events resource:
    https://developers.google.com/calendar/api/v3/reference/events

    Args:
        title:           Title of the help request.
        description:     Full description of the help request.
        scheduled_at:    Naive UTC datetime of the planned visit.
        volunteer_email: Email of the authenticated volunteer (calendar owner).
    """
    end_at = scheduled_at + timedelta(minutes=DEFAULT_VISIT_DURATION_MINUTES)

    event_body = {
        "summary": f"Волонтерство: {title}",
        "description": description,
        "start": {
            "dateTime": scheduled_at.isoformat() + "Z",  # UTC
            "timeZone": "Europe/Kyiv",
        },
        "end": {
            "dateTime": end_at.isoformat() + "Z",
            "timeZone": "Europe/Kyiv",
        },
        "attendees": [{"email": volunteer_email}],
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "email",  "minutes": 24 * 60},
                {"method": "popup",  "minutes": 30},
            ],
        },
    }

    logger.info(
        "[CalendarService] Event scheduled for %s at %s — '%s'",
        volunteer_email,
        scheduled_at.isoformat(),
        title,
    )

    # ── Real implementation (uncomment when OAuth tokens are available) ─────────
    #
    # from google.oauth2.credentials import Credentials
    # from googleapiclient.discovery import build
    # from db_helpers import get_user_google_tokens   # your token store
    #
    # tokens = get_user_google_tokens(volunteer_email)
    # creds  = Credentials(
    #     token=tokens.access_token,
    #     refresh_token=tokens.refresh_token,
    #     token_uri="https://oauth2.googleapis.com/token",
    #     client_id=os.getenv("GOOGLE_CLIENT_ID"),
    #     client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    # )
    # service = build("calendar", "v3", credentials=creds)
    # created = service.events().insert(calendarId="primary", body=event_body).execute()
    # return created
    # ────────────────────────────────────────────────────────────────────────────

    # Simulated response (same shape as the real API)
    return {
        "id": f"simulated-{volunteer_email}-{int(scheduled_at.timestamp())}",
        "status": "confirmed",
        "htmlLink": "https://calendar.google.com/",
        **event_body,
    }

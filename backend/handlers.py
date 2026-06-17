from fastapi_cache import FastAPICache

from email_config import send_donation_email
from events import on


@on("payment_success")
async def notify_donor(*, donor_email: str, amount_uah: float, request_title: str, **_):
    if donor_email:
        await send_donation_email(donor_email, amount_uah, request_title)


@on("payment_success")
async def invalidate_requests_cache(**_):
    await FastAPICache.clear(namespace="platform_stats")
    await FastAPICache.clear(namespace="requests_list")


def register() -> None:
    """Called at startup — importing this module already registered the handlers above."""

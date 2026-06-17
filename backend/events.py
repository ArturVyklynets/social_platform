import asyncio
import logging

logger = logging.getLogger(__name__)

_handlers: dict = {}


def on(event_name: str):
    def decorator(fn):
        _handlers.setdefault(event_name, []).append(fn)
        return fn
    return decorator


async def emit(event_name: str, **kwargs):
    for handler in _handlers.get(event_name, []):
        try:
            if asyncio.iscoroutinefunction(handler):
                await handler(**kwargs)
            else:
                handler(**kwargs)
        except Exception as exc:
            logger.error(
                "Event handler '%s' failed for event '%s': %s",
                handler.__name__, event_name, exc,
            )

"""Emergent-managed push notification relay (SuprSend passthrough).
Backend-only: the frontend never calls the upstream directly."""
import os

import httpx

from config import logger

PUSH_BASE_URL = "https://integrations.emergentagent.com"
PUSH_KEY = os.environ.get("EMERGENT_PUSH_KEY", "placeholder")

_client = httpx.AsyncClient(
    base_url=PUSH_BASE_URL,
    headers={"X-Push-Key": PUSH_KEY},
    timeout=10.0,
)


async def register_device(user_id: str, platform: str, device_token: str):
    resp = await _client.post(
        "/api/v1/push/users/register",
        json={"user_id": user_id, "platform": platform, "device_token": device_token},
    )
    resp.raise_for_status()
    return {"status": "registered"}


async def send_push(recipients, data: dict, idempotency_key: str | None = None) -> None:
    """Send a push to user IDs. Raises on failure so callers can audit; wrap in
    try/except at call sites so push never blocks the primary operation."""
    if not recipients:
        return
    if len(recipients) > 100:
        raise ValueError("max 100 recipients per /trigger call; chunk before sending")
    if "title" not in data or "message" not in data:
        raise ValueError("data must include title and message")
    payload: dict = {"recipients": list(recipients), "data": data}
    if idempotency_key:
        payload["$idempotency_key"] = idempotency_key
    resp = await _client.post("/api/v1/push/trigger", json=payload)
    resp.raise_for_status()

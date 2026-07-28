"""Notification fan-out: in-app record + realtime broadcast + push, with a
delivery audit log for every channel attempt (success and failure)."""
from datetime import datetime, timezone

from database import db
from config import logger
from services.realtime import manager
from services.push import send_push


async def _audit(user_id: str, channel: str, title: str, body: str,
                 booking_id, status: str, error: str = None):
    await db.notification_audit.insert_one({
        "user_id": user_id, "channel": channel, "title": title, "body": body,
        "booking_id": booking_id, "status": status, "error": error,
        "at": datetime.now(timezone.utc).isoformat(),
    })


async def notify_user(user_id: str, title: str, body: str, ntype: str,
                      booking_id=None, action_url=None, push: bool = True):
    """Deliver a notification across in-app + realtime + push channels and
    record every attempt in notification_audit."""
    now = datetime.now(timezone.utc).isoformat()

    # 1. In-app record
    notif = {
        "user_id": user_id, "title": title, "body": body, "type": ntype,
        "booking_id": booking_id, "action_url": action_url,
        "read": False, "created_at": now,
    }
    try:
        res = await db.notifications.insert_one(dict(notif))
        notif["id"] = str(res.inserted_id)
        await _audit(user_id, "in_app", title, body, booking_id, "success")
    except Exception as e:
        logger.warning(f"in-app notify failed for {user_id}: {e}")
        await _audit(user_id, "in_app", title, body, booking_id, "failure", str(e))

    # 2. Realtime broadcast (best-effort)
    try:
        await manager.send(user_id, {
            "event": "notification", "type": ntype,
            "title": title, "body": body, "booking_id": booking_id,
            "action_url": action_url, "created_at": now,
        })
    except Exception as e:
        logger.warning(f"realtime notify failed for {user_id}: {e}")

    # 3. Push (never blocks the primary operation)
    if push:
        data = {"title": title, "message": body}
        if action_url:
            data["action_url"] = action_url
        try:
            await send_push([user_id], data,
                            idempotency_key=(f"{booking_id}:{ntype}" if booking_id else None))
            await _audit(user_id, "push", title, body, booking_id, "success")
        except Exception as e:
            logger.warning(f"push notify failed for {user_id}: {e}")
            await _audit(user_id, "push", title, body, booking_id, "failure", str(e))


async def broadcast_booking(user_id: str, event: str, booking: dict):
    """Realtime-only booking event for a psychologist/user dashboard."""
    try:
        await manager.send(user_id, {"event": event, "booking": booking})
    except Exception as e:
        logger.warning(f"booking broadcast failed for {user_id}: {e}")

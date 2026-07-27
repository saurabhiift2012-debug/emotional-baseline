"""User-shaping helpers (public projection, default consents, phone masking)."""
from typing import Optional

from catalog import CONSENT_KEYS


def public_user(u: dict) -> dict:
    return {
        "id": str(u['_id']),
        "phone": u.get('phone'),
        "email": u.get('email'),
        "name": u.get('name', 'there'),
        "language": u.get('language', 'en'),
        "consents": u.get('consents', {}),
        "health_connected": u.get('health_connected', {}),
        "emergency_contact": u.get('emergency_contact'),
        "agreement": u.get('agreement'),
        "assigned_resources": u.get('assigned_resources', []),
    }


def default_consents() -> dict:
    on_by_default = {"mood_history", "health_data", "sleep_data", "activity_data",
                     "heart_data", "personal_insights"}
    return {k: (k in on_by_default) for k in CONSENT_KEYS}


def mask_phone(phone: Optional[str]) -> str:
    if not phone:
        return "—"
    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) < 4:
        return "••••"
    return "+91 •••••" + digits[-4:]

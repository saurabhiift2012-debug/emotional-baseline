"""Psychologist catalogue + management. Profiles are admin-managed (real people
only). Each profile carries a `login_phone`; logging in with that number gives
the user a `psychologist` role linked to the profile and routes booking
notifications to them."""
import re
import uuid
from datetime import datetime, timezone, timedelta

from fastapi import HTTPException

from database import db

# weekday(): Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
# Default seeded real profile. `login_phone` is the psychologist's own login.
DEFAULT_PSYCHOLOGISTS = [
    {"slug": "ruchi-sharma", "name": "Dr. Ruchi Sharma", "verified": True,
     "login_phone": "+919999900001",
     "qualifications": "Registered Clinical Psychologist, RCI",
     "specializations": ["Anxiety", "Stress", "Relationships", "Low mood",
                         "Children behaviour", "Post partum", "Low confidence"],
     "languages": ["English", "Hindi"],
     "session_types": ["15-min Call"], "price": 1000, "short_call_price": 1000, "currency": "INR",
     "bio": "Evidence-based support for anxiety, stress, relationships, children & post partum.",
     "available_days": [0, 2, 4, 5, 6],
     "slot_hours": [10, 11, 12, 13, 19, 20]},
]

# Legacy auto-generated / fake slugs to purge once (non-destructive to admin adds).
_LEGACY_FAKE_SLUGS = ["aisha-verma", "rohan-mehta", "sara-khan", "vikram-nair", "neha-gupta"]


def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    return s or f"psy-{uuid.uuid4().hex[:6]}"


async def link_psychologist_user(psychologist_id: str, login_phone: str, name: str):
    """Ensure a user account exists for the psychologist's login phone, marked
    with the psychologist role and linked to the profile. Idempotent."""
    from services.otp import ensure_indian_phone
    from services.users import default_consents
    phone = ensure_indian_phone(login_phone)
    await db.users.update_one(
        {"phone": phone},
        {"$set": {"role": "psychologist", "psychologist_id": psychologist_id, "name": name},
         "$setOnInsert": {
             "email": None, "date_of_birth": None, "language": "en",
             "consents": default_consents(), "consent_version": 1,
             "health_connected": {"sleep": True, "activity": True, "steps": True, "heart": True},
             "created_at": datetime.now(timezone.utc).isoformat(),
         }},
        upsert=True,
    )
    return phone


async def unlink_psychologist_user(psychologist_id: str):
    await db.users.update_one(
        {"psychologist_id": psychologist_id, "role": "psychologist"},
        {"$set": {"role": "user"}, "$unset": {"psychologist_id": ""}},
    )


async def psychologist_user_id(psychologist_id: str):
    """The user_id of the psychologist login account for a profile (or None)."""
    u = await db.users.find_one({"psychologist_id": psychologist_id, "role": "psychologist"})
    return str(u["_id"]) if u else None


async def seed_psychologists():
    """Upsert the default real profile(s) and link their login accounts.
    Non-destructive: admin-added profiles are preserved."""
    for p in DEFAULT_PSYCHOLOGISTS:
        await db.psychologists.update_one(
            {"slug": p["slug"]},
            {"$set": {**p, "is_demo": False},
             "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
        prof = await db.psychologists.find_one({"slug": p["slug"]})
        if prof and p.get("login_phone"):
            await link_psychologist_user(str(prof["_id"]), p["login_phone"], p["name"])
    # one-time cleanup of known legacy fake slugs
    await db.psychologists.delete_many({"slug": {"$in": _LEGACY_FAKE_SLUGS}})


def gen_availability(psy: dict):
    """Upcoming 15-min slots honouring the weekly schedule. Future slots only."""
    days = psy.get("available_days") or [0, 1, 2, 3, 4]
    hours = psy.get("slot_hours") or [10, 11, 12]
    slots = []
    now = datetime.now()
    for offset in range(0, 21):
        d = (now + timedelta(days=offset)).date()
        if d.weekday() not in days:
            continue
        for h in hours:
            if offset == 0 and h <= now.hour:
                continue  # skip past/current hours today
            slots.append({"id": f"{d.isoformat()}T{h:02d}:00",
                          "date": d.isoformat(), "time": f"{h:02d}:00",
                          "label": d.strftime("%a %d %b") + f" · {h:02d}:00"})
        if len(slots) >= 18:
            break
    return slots


def resolve_booking(p: dict, slot_id: str, session_type: str):
    slots = gen_availability(p)
    slot = next((s for s in slots if s["id"] == slot_id), None)
    if not slot:
        raise HTTPException(status_code=400, detail="That slot is no longer available")
    if session_type not in p.get("session_types", []):
        raise HTTPException(status_code=400, detail="Unsupported session type")
    price = p.get("short_call_price", p["price"]) if session_type == "15-min Call" else p["price"]
    return slot, price


def uuid_hex():
    return uuid.uuid4().hex[:12].upper()

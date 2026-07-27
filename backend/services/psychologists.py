"""Psychologist catalogue (real, admin-supplied only — no fake profiles),
availability generation and booking resolution."""
import uuid
from datetime import datetime, timezone, timedelta

from fastapi import HTTPException

from database import db

# weekday(): Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
DEMO_PSYCHOLOGISTS = [
    {"slug": "ruchi-sharma", "name": "Dr. Ruchi Sharma", "verified": True,
     "qualifications": "Registered Clinical Psychologist, RCI",
     "specializations": ["Anxiety", "Stress", "Relationships", "Low mood",
                         "Children behaviour", "Post partum", "Low confidence"],
     "languages": ["English", "Hindi"],
     "session_types": ["15-min Call"], "price": 1000, "short_call_price": 1000, "currency": "INR",
     "bio": "Evidence-based support for anxiety, stress, relationships, children & post partum.",
     # Availability: 10:00–14:00 and 19:00–21:00 on Mon, Wed, Fri, Sat, Sun.
     "available_days": [0, 2, 4, 5, 6],
     "slot_hours": [10, 11, 12, 13, 19, 20]},
]


async def seed_psychologists():
    # Upsert the real profile(s) by slug…
    for p in DEMO_PSYCHOLOGISTS:
        await db.psychologists.update_one(
            {"slug": p["slug"]},
            {"$set": {**p, "is_demo": False},
             "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
    # …and remove any legacy/fake profiles that are no longer listed.
    keep = [p["slug"] for p in DEMO_PSYCHOLOGISTS]
    await db.psychologists.delete_many({"slug": {"$nin": keep}})
    return


def gen_availability(psy: dict):
    """Upcoming 15-min slots for the psychologist, honouring their weekly
    schedule (available_days + slot_hours). Only future slots are returned."""
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

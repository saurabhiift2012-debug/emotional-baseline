"""Check-in routes and observation feedback."""
from datetime import datetime, date, timezone

from fastapi import APIRouter, Depends, HTTPException

from database import db
from catalog import MOOD_BY_KEY, CONTEXT_TAGS
from models import CheckinIn, ObservationFeedbackIn
from security import get_current_user
from services.health import ensure_health_day

router = APIRouter()


@router.post("/checkins")
async def create_checkin(body: CheckinIn, user: dict = Depends(get_current_user)):
    if body.mood not in MOOD_BY_KEY:
        raise HTTPException(status_code=400, detail="Unknown mood")
    m = MOOD_BY_KEY[body.mood]
    today = date.today().isoformat()
    now = datetime.now(timezone.utc)
    doc = {
        "user_id": user['id'], "date": today, "mood": m['key'],
        "mood_value": m['value'], "group": m['group'],
        "context": [c for c in body.context if c in CONTEXT_TAGS],
        "note": (body.note or "").strip()[:500] or None,
        "timezone": body.timezone,
        "created_at": now.isoformat(), "seeded": False,
    }
    # Allow multiple check-ins per day — each selection is its own entry.
    await db.checkins.insert_one(dict(doc))
    # health for the day reflects the latest mood
    existing_hd = await db.health_days.find_one({"user_id": user['id'], "date": today})
    if not existing_hd:
        await ensure_health_day(user['id'], today, m['value'])
    doc.pop('_id', None)
    # count today's entries for the response
    todays_count = await db.checkins.count_documents({"user_id": user['id'], "date": today})
    return {"checkin": doc, "message": "Thanks for checking in.",
            "low_mood": m['value'] <= 2, "todays_count": todays_count}


@router.get("/checkins/today")
async def today_checkin(user: dict = Depends(get_current_user)):
    today = date.today().isoformat()
    c = await db.checkins.find_one({"user_id": user['id'], "date": today})
    if c:
        c.pop('_id', None)
    return {"checkin": c}


@router.get("/checkins")
async def list_checkins(user: dict = Depends(get_current_user), limit: int = 200):
    items = await db.checkins.find({"user_id": user['id']}).sort("date", -1).to_list(limit)
    for c in items:
        c.pop('_id', None)
    return {"checkins": items}


@router.post("/feedback")
async def observation_feedback(body: ObservationFeedbackIn, user: dict = Depends(get_current_user)):
    await db.feedback.insert_one({
        "user_id": user['id'], "checkin_id": body.checkin_id,
        "insight_key": body.insight_key, "response": body.response,
        "at": datetime.now(timezone.utc).isoformat()})
    return {"ok": True}

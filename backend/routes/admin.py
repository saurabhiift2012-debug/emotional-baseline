"""Admin: hidden usage dashboard (passcode-gated, PII masked)."""
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
import hmac

from database import db
from config import ADMIN_PASSCODE
from catalog import RESOURCE_CATALOG, RESOURCE_KEYS
from models import AdminAuthIn, AdminResourcesIn
from security import get_admin, create_admin_token
from services.users import mask_phone

router = APIRouter()


@router.post("/admin/auth")
async def admin_auth(body: AdminAuthIn):
    if not ADMIN_PASSCODE:
        raise HTTPException(status_code=503, detail="Admin access is not configured.")
    if not hmac.compare_digest((body.passcode or "").strip(), ADMIN_PASSCODE):
        raise HTTPException(status_code=401, detail="Incorrect passcode.")
    return {"admin_token": create_admin_token()}


@router.get("/admin/metrics")
async def admin_metrics(_: dict = Depends(get_admin)):
    now = datetime.now(timezone.utc)
    d7 = (now - timedelta(days=7)).date().isoformat()
    d30 = (now - timedelta(days=30)).date().isoformat()

    total_users = await db.users.count_documents({})
    total_checkins = await db.checkins.count_documents({})
    checkins_7d = await db.checkins.count_documents({"date": {"$gte": d7}})
    checkins_30d = await db.checkins.count_documents({"date": {"$gte": d30}})

    active_7d = len(await db.checkins.distinct("user_id", {"date": {"$gte": d7}}))
    active_30d = len(await db.checkins.distinct("user_id", {"date": {"$gte": d30}}))

    total_bookings = await db.bookings.count_documents({})
    confirmed_bookings = await db.bookings.count_documents({"status": "confirmed"})
    pending_bookings = await db.bookings.count_documents({"status": "pending"})

    revenue = 0.0
    currency = "INR"
    async for b in db.bookings.find({"status": "confirmed"}):
        revenue += float(b.get("price", 0) or 0)
        currency = b.get("currency", currency)

    # New users per day for the last 7 days (trend)
    trend = []
    for i in range(6, -1, -1):
        day = (now - timedelta(days=i)).date().isoformat()
        c = await db.checkins.count_documents({"date": day})
        au = len(await db.checkins.distinct("user_id", {"date": day}))
        trend.append({"date": day, "checkins": c, "active_users": au})

    return {
        "totals": {
            "users": total_users,
            "checkins": total_checkins,
            "bookings": total_bookings,
            "confirmed_bookings": confirmed_bookings,
            "pending_bookings": pending_bookings,
        },
        "activity": {
            "active_users_7d": active_7d,
            "active_users_30d": active_30d,
            "checkins_7d": checkins_7d,
            "checkins_30d": checkins_30d,
        },
        "revenue": {"amount": round(revenue, 2), "currency": currency},
        "trend": trend,
    }


@router.get("/admin/users")
async def admin_list_users(_: dict = Depends(get_admin), q: Optional[str] = None, limit: int = 100):
    query = {}
    if q:
        digits = "".join(ch for ch in q if ch.isdigit())
        if digits:
            query = {"phone": {"$regex": digits}}
    users = await db.users.find(query).sort("created_at", -1).to_list(limit)
    out = []
    for u in users:
        uid = str(u["_id"])
        cnt = await db.checkins.count_documents({"user_id": uid})
        out.append({
            "id": uid,
            "phone_masked": mask_phone(u.get("phone")),
            "created_at": u.get("created_at"),
            "checkins": cnt,
            "assigned_resources": u.get("assigned_resources", []),
        })
    return {"users": out, "resources": RESOURCE_CATALOG}


@router.put("/admin/users/{uid}/resources")
async def admin_set_resources(uid: str, body: AdminResourcesIn, _: dict = Depends(get_admin)):
    try:
        oid = ObjectId(uid)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id")
    assigned = [r for r in body.assigned_resources if r in RESOURCE_KEYS]
    result = await db.users.update_one({"_id": oid}, {"$set": {"assigned_resources": assigned}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"assigned_resources": assigned}

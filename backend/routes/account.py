"""Account routes: profile, consents, language, health connections,
export and deletion."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from bson import ObjectId

from database import db
from catalog import CONSENT_KEYS
from models import ConsentIn
from security import get_current_user
from services.users import public_user
from services.analytics import load_frames

router = APIRouter()


@router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@router.put("/me/language")
async def set_language(body: dict, user: dict = Depends(get_current_user)):
    lang = body.get('language', 'en')
    await db.users.update_one({"_id": ObjectId(user['id'])}, {"$set": {"language": lang}})
    return {"language": lang}


@router.put("/me/consents")
async def update_consents(body: ConsentIn, user: dict = Depends(get_current_user)):
    consents = user.get('consents', {})
    consents.update({k: bool(v) for k, v in body.consents.items() if k in CONSENT_KEYS})
    await db.users.update_one({"_id": ObjectId(user['id'])},
                              {"$set": {"consents": consents},
                               "$inc": {"consent_version": 1}})
    await db.consent_audit.insert_one({
        "user_id": user['id'], "consents": consents,
        "at": datetime.now(timezone.utc).isoformat()})
    return {"consents": consents}


@router.put("/me/health-connections")
async def health_connections(body: dict, user: dict = Depends(get_current_user)):
    hc = user.get('health_connected', {})
    hc.update({k: bool(v) for k, v in body.items() if k in ("sleep", "activity", "steps", "heart")})
    await db.users.update_one({"_id": ObjectId(user['id'])}, {"$set": {"health_connected": hc}})
    return {"health_connected": hc}


@router.delete("/me/data")
async def delete_data(scope: str = "all", user: dict = Depends(get_current_user)):
    uid = user['id']
    if scope in ("all", "mood"):
        await db.checkins.delete_many({"user_id": uid})
    if scope in ("all", "health"):
        await db.health_days.delete_many({"user_id": uid})
    if scope == "account":
        await db.checkins.delete_many({"user_id": uid})
        await db.health_days.delete_many({"user_id": uid})
        await db.users.delete_one({"_id": ObjectId(uid)})
    return {"deleted": scope}


@router.get("/me/export")
async def export_data(user: dict = Depends(get_current_user)):
    checkins, healths, _ = await load_frames(user['id'])
    return {"user": public_user(user), "checkins": checkins, "health_days": healths}

"""User-facing in-app notification inbox."""
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId

from database import db
from security import get_current_user

router = APIRouter()


@router.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user), limit: int = 50):
    items = await db.notifications.find({"user_id": user["id"]}) \
        .sort("created_at", -1).to_list(limit)
    for n in items:
        n["id"] = str(n.pop("_id"))
    unread = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"notifications": items, "unread": unread}


@router.get("/notifications/unread-count")
async def unread_count(user: dict = Depends(get_current_user)):
    unread = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"unread": unread}


@router.post("/notifications/{nid}/read")
async def mark_read(nid: str, user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(nid)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    await db.notifications.update_one({"_id": oid, "user_id": user["id"]},
                                      {"$set": {"read": True}})
    return {"ok": True}


@router.post("/notifications/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False},
                                       {"$set": {"read": True}})
    return {"ok": True}

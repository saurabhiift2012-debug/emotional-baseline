"""Psychologist discovery routes."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId

from database import db
from security import get_current_user
from services.psychologists import gen_availability

router = APIRouter()


@router.get("/psychologists")
async def list_psychologists(language: Optional[str] = None,
                             specialization: Optional[str] = None,
                             session_type: Optional[str] = None,
                             user: dict = Depends(get_current_user)):
    q: dict = {}
    if language:
        q["languages"] = language
    if session_type:
        q["session_types"] = session_type
    items = await db.psychologists.find(q).to_list(100)
    out = []
    for p in items:
        p["id"] = str(p.pop("_id"))
        if specialization and specialization not in p.get("specializations", []):
            continue
        out.append(p)
    return {"psychologists": out}


@router.get("/psychologists/{pid}")
async def get_psychologist(pid: str, user: dict = Depends(get_current_user)):
    try:
        p = await db.psychologists.find_one({"_id": ObjectId(pid)})
    except Exception:
        p = None
    if not p:
        raise HTTPException(status_code=404, detail="Psychologist not found")
    p["id"] = str(p.pop("_id"))
    p["availability"] = gen_availability(p)
    return p

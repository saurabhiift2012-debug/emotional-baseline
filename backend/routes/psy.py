"""Psychologist portal: the logged-in psychologist sees their bookings in
realtime and can Accept / Decline / Reschedule. Every status change notifies
the user (in-app + realtime + push) and is recorded in the audit log."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId

from database import db
from models import RescheduleIn
from security import get_psychologist
from services.psychologists import gen_availability
from services.notifications import notify_user, broadcast_booking

router = APIRouter()

# Statuses a psychologist should see on their dashboard.
PSY_VISIBLE = ["awaiting_confirmation", "accepted", "rescheduled"]


def _clean(b: dict) -> dict:
    b["id"] = str(b.pop("_id"))
    return b


async def _load_booking(pid: str, bid: str) -> dict:
    try:
        b = await db.bookings.find_one({"_id": ObjectId(bid), "psychologist_id": pid})
    except Exception:
        b = None
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    return b


async def _set_status(booking: dict, status: str, extra: dict = None):
    patch = {"status": status, f"{status}_at": datetime.now(timezone.utc).isoformat()}
    if extra:
        patch.update(extra)
    await db.bookings.update_one(
        {"_id": booking["_id"]},
        {"$set": patch,
         "$push": {"status_history": {"status": status, "at": patch[f"{status}_at"]}}},
    )
    updated = await db.bookings.find_one({"_id": booking["_id"]})
    return _clean(updated)


@router.get("/psy/me")
async def psy_me(psy: dict = Depends(get_psychologist)):
    prof = await db.psychologists.find_one({"_id": ObjectId(psy["psychologist_id"])})
    if prof:
        prof["id"] = str(prof.pop("_id"))
    return {"psychologist": prof, "name": psy.get("name")}


@router.get("/psy/bookings")
async def psy_bookings(psy: dict = Depends(get_psychologist)):
    items = await db.bookings.find(
        {"psychologist_id": psy["psychologist_id"], "status": {"$in": PSY_VISIBLE + ["declined", "cancelled"]}}
    ).sort("created_at", -1).to_list(200)
    return {"bookings": [_clean(b) for b in items]}


@router.post("/psy/bookings/{bid}/accept")
async def psy_accept(bid: str, psy: dict = Depends(get_psychologist)):
    b = await _load_booking(psy["psychologist_id"], bid)
    if b["status"] not in ("awaiting_confirmation", "rescheduled"):
        raise HTTPException(status_code=400, detail="This booking can no longer be accepted.")
    updated = await _set_status(b, "accepted")
    await notify_user(
        b["user_id"],
        title="Your session is confirmed",
        body=f"{b['psychologist_name']} accepted your {b['slot_label']} session.",
        ntype="booking_accepted", booking_id=bid, action_url="/appointments",
    )
    await broadcast_booking(b["user_id"], "booking_updated", updated)
    return {"booking": updated}


@router.post("/psy/bookings/{bid}/decline")
async def psy_decline(bid: str, psy: dict = Depends(get_psychologist)):
    b = await _load_booking(psy["psychologist_id"], bid)
    if b["status"] in ("declined", "cancelled"):
        raise HTTPException(status_code=400, detail="This booking is already closed.")
    updated = await _set_status(b, "declined")
    # release the reserved slot so it can be booked again
    await db.slot_locks.delete_one({"psychologist_id": b["psychologist_id"], "slot_id": b["slot_id"]})
    await notify_user(
        b["user_id"],
        title="Session could not be confirmed",
        body=f"{b['psychologist_name']} couldn't take your {b['slot_label']} slot. Any payment will be refunded.",
        ntype="booking_declined", booking_id=bid, action_url="/appointments",
    )
    await broadcast_booking(b["user_id"], "booking_updated", updated)
    return {"booking": updated}


@router.post("/psy/bookings/{bid}/reschedule")
async def psy_reschedule(bid: str, body: RescheduleIn, psy: dict = Depends(get_psychologist)):
    b = await _load_booking(psy["psychologist_id"], bid)
    if b["status"] in ("declined", "cancelled"):
        raise HTTPException(status_code=400, detail="This booking is closed.")
    prof = await db.psychologists.find_one({"_id": ObjectId(psy["psychologist_id"])})
    slots = gen_availability(prof or {})
    new_slot = next((s for s in slots if s["id"] == body.new_slot_id), None)
    if not new_slot:
        raise HTTPException(status_code=400, detail="That slot is not available.")
    # move the reservation atomically: claim the new slot first (unique index),
    # then release the old one.
    try:
        await db.slot_locks.insert_one({
            "psychologist_id": b["psychologist_id"], "slot_id": new_slot["id"],
            "booking_id": bid, "created_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception:
        raise HTTPException(status_code=409, detail="That slot was just taken.")
    await db.slot_locks.delete_one({"psychologist_id": b["psychologist_id"], "slot_id": b["slot_id"]})
    updated = await _set_status(b, "rescheduled", extra={
        "slot_id": new_slot["id"], "slot_label": new_slot["label"],
        "slot_date": new_slot["date"], "slot_time": new_slot["time"],
    })
    await notify_user(
        b["user_id"],
        title="Your session was rescheduled",
        body=f"{b['psychologist_name']} moved your session to {new_slot['label']}. Please confirm in the app.",
        ntype="booking_rescheduled", booking_id=bid, action_url="/appointments",
    )
    await broadcast_booking(b["user_id"], "booking_updated", updated)
    return {"booking": updated}

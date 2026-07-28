"""Booking routes: atomic, idempotent slot reservation + real Razorpay order
creation and signature verification. On payment the booking is routed to the
psychologist for Accept/Decline/Reschedule."""
import hmac
import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from database import db
from config import logger, RAZORPAY_ENABLED, razorpay_client, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
from models import BookingOrderIn, BookingVerifyIn
from security import get_current_user
from services.psychologists import resolve_booking, uuid_hex, psychologist_user_id
from services.notifications import notify_user, broadcast_booking

router = APIRouter()

# Statuses shown to the user in "My appointments".
USER_VISIBLE = ["awaiting_confirmation", "accepted", "rescheduled", "declined", "cancelled"]


def _order_response(user: dict, p: dict, amount_paise: int, currency: str,
                    order_id: str, booking_id: str, session_type: str) -> dict:
    return {
        "booking_id": booking_id,
        "order_id": order_id,
        "amount": amount_paise,
        "currency": currency,
        "key_id": RAZORPAY_KEY_ID,
        "name": "TherapiShots",
        "description": f"{session_type} with {p['name']}",
        "prefill": {"name": user.get("name", ""),
                    "contact": (user.get("phone") or "").replace("+", ""),
                    "email": user.get("email") or ""},
    }


@router.post("/bookings/order")
async def create_booking_order(body: BookingOrderIn, user: dict = Depends(get_current_user)):
    """Reserve the slot (atomic), create a Razorpay order + pending booking.
    Idempotent: replaying with the same idempotency_key returns the same order."""
    if not RAZORPAY_ENABLED:
        raise HTTPException(status_code=503, detail="Payments are not configured.")

    # Idempotency: return the existing order for a replayed key.
    if body.idempotency_key:
        existing = await db.bookings.find_one({
            "user_id": user["id"], "idempotency_key": body.idempotency_key,
            "status": {"$nin": ["failed", "cancelled", "declined"]},
        })
        if existing:
            p = await db.psychologists.find_one({"_id": ObjectId(existing["psychologist_id"])})
            return _order_response(user, p or {"name": existing["psychologist_name"]},
                                   int(round(existing["price"] * 100)), existing.get("currency", "INR"),
                                   existing["razorpay_order_id"], str(existing["_id"]),
                                   existing["session_type"])

    try:
        p = await db.psychologists.find_one({"_id": ObjectId(body.psychologist_id)})
    except Exception:
        p = None
    if not p:
        raise HTTPException(status_code=404, detail="Psychologist not found")
    slot, price = resolve_booking(p, body.slot_id, body.session_type)
    currency = p.get("currency", "INR")
    amount_paise = int(round(price * 100))

    # Atomic slot reservation — unique index on (psychologist_id, slot_id)
    # prevents double-booking under concurrent requests.
    try:
        await db.slot_locks.insert_one({
            "psychologist_id": body.psychologist_id, "slot_id": slot["id"],
            "user_id": user["id"], "created_at": datetime.now(timezone.utc).isoformat(),
        })
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="That slot was just taken. Please choose another time.")

    try:
        order = razorpay_client.order.create({
            "amount": amount_paise, "currency": currency,
            "receipt": f"ts_{str(user['_id'])[-8:]}_{uuid_hex()[:8]}"[:40], "payment_capture": 1,
        })
    except Exception as e:
        # release the reservation if we couldn't start payment
        await db.slot_locks.delete_one({"psychologist_id": body.psychologist_id, "slot_id": slot["id"]})
        logger.warning(f"Razorpay order failed: {e}")
        raise HTTPException(status_code=502, detail="Could not start payment. Please try again.")

    doc = {
        "user_id": user["id"], "psychologist_id": body.psychologist_id,
        "psychologist_name": p["name"], "slot_id": slot["id"],
        "slot_label": slot["label"], "slot_date": slot["date"], "slot_time": slot["time"],
        "session_type": body.session_type, "price": price, "currency": currency,
        "status": "pending", "razorpay_order_id": order["id"],
        "idempotency_key": body.idempotency_key,
        "status_history": [{"status": "pending", "at": datetime.now(timezone.utc).isoformat()}],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        res = await db.bookings.insert_one(dict(doc))
    except DuplicateKeyError:
        # concurrent replay of the same idempotency_key
        await db.slot_locks.delete_one({"psychologist_id": body.psychologist_id, "slot_id": slot["id"]})
        existing = await db.bookings.find_one({"user_id": user["id"], "idempotency_key": body.idempotency_key})
        return _order_response(user, p, amount_paise, currency,
                               existing["razorpay_order_id"], str(existing["_id"]), body.session_type)
    return _order_response(user, p, amount_paise, currency, order["id"], str(res.inserted_id), body.session_type)


@router.post("/bookings/verify")
async def verify_booking_payment(body: BookingVerifyIn, user: dict = Depends(get_current_user)):
    """Verify the Razorpay signature server-side, mark the booking paid and route
    it to the psychologist for confirmation. Idempotent on repeat calls."""
    try:
        booking = await db.bookings.find_one({"_id": ObjectId(body.booking_id), "user_id": user["id"]})
    except Exception:
        booking = None
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Idempotent: if already paid/routed, just return it.
    if booking.get("status") in ("awaiting_confirmation", "accepted", "rescheduled"):
        booking["id"] = str(booking.pop("_id"))
        return {"booking": booking, "message": "Payment already recorded."}

    if booking.get("razorpay_order_id") != body.razorpay_order_id:
        raise HTTPException(status_code=400, detail="Order mismatch")
    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, body.razorpay_signature):
        await db.bookings.update_one({"_id": booking["_id"]}, {"$set": {"status": "failed"}})
        await db.slot_locks.delete_one({"psychologist_id": booking["psychologist_id"], "slot_id": booking["slot_id"]})
        raise HTTPException(status_code=400, detail="Payment verification failed.")

    payment = {
        "status": "paid", "provider": "razorpay",
        "amount": booking["price"], "currency": booking.get("currency", "INR"),
        "razorpay_order_id": body.razorpay_order_id,
        "razorpay_payment_id": body.razorpay_payment_id,
    }
    now = datetime.now(timezone.utc).isoformat()
    await db.bookings.update_one(
        {"_id": booking["_id"]},
        {"$set": {"status": "awaiting_confirmation", "payment": payment, "paid_at": now},
         "$push": {"status_history": {"status": "awaiting_confirmation", "at": now}}},
    )
    booking = await db.bookings.find_one({"_id": booking["_id"]})
    booking["id"] = str(booking.pop("_id"))

    # Notify the psychologist (new booking) — realtime + in-app + push.
    psy_uid = await psychologist_user_id(booking["psychologist_id"])
    if psy_uid:
        await notify_user(
            psy_uid,
            title="New booking request",
            body=f"A client booked your {booking['slot_label']} slot. Review to accept.",
            ntype="new_booking", booking_id=booking["id"], action_url="/psy-dashboard",
        )
        await broadcast_booking(psy_uid, "booking_new", booking)
    # Confirm to the user that payment landed and it's awaiting confirmation.
    await notify_user(
        user["id"],
        title="Payment received",
        body=f"We've sent your {booking['slot_label']} request to {booking['psychologist_name']}.",
        ntype="payment_received", booking_id=booking["id"], action_url="/appointments",
    )
    return {"booking": booking, "message": "Payment received — awaiting confirmation."}


@router.get("/bookings")
async def list_bookings(user: dict = Depends(get_current_user)):
    items = await db.bookings.find(
        {"user_id": user["id"], "status": {"$in": USER_VISIBLE}}
    ).sort("created_at", -1).to_list(100)
    for b in items:
        b["id"] = str(b.pop("_id"))
    return {"bookings": items}


@router.post("/bookings/{bid}/cancel")
async def cancel_booking(bid: str, user: dict = Depends(get_current_user)):
    try:
        b = await db.bookings.find_one({"_id": ObjectId(bid), "user_id": user["id"]})
    except Exception:
        b = None
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    now = datetime.now(timezone.utc).isoformat()
    await db.bookings.update_one(
        {"_id": ObjectId(bid)},
        {"$set": {"status": "cancelled", "cancelled_at": now},
         "$push": {"status_history": {"status": "cancelled", "at": now}}},
    )
    await db.slot_locks.delete_one({"psychologist_id": b["psychologist_id"], "slot_id": b["slot_id"]})
    # let the psychologist know in realtime
    psy_uid = await psychologist_user_id(b["psychologist_id"])
    if psy_uid:
        await notify_user(
            psy_uid,
            title="Booking cancelled",
            body=f"A client cancelled the {b['slot_label']} session.",
            ntype="booking_cancelled", booking_id=bid, action_url="/psy-dashboard",
        )
    return {"ok": True, "status": "cancelled"}

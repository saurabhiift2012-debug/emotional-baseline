"""Booking routes with real Razorpay order creation + signature verification."""
import hmac
import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId

from database import db
from config import logger, RAZORPAY_ENABLED, razorpay_client, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
from models import BookingOrderIn, BookingVerifyIn
from security import get_current_user
from services.psychologists import resolve_booking, uuid_hex

router = APIRouter()


@router.post("/bookings/order")
async def create_booking_order(body: BookingOrderIn, user: dict = Depends(get_current_user)):
    """Create a Razorpay order and a pending booking. Returns checkout params."""
    if not RAZORPAY_ENABLED:
        raise HTTPException(status_code=503, detail="Payments are not configured.")
    try:
        p = await db.psychologists.find_one({"_id": ObjectId(body.psychologist_id)})
    except Exception:
        p = None
    if not p:
        raise HTTPException(status_code=404, detail="Psychologist not found")
    slot, price = resolve_booking(p, body.slot_id, body.session_type)
    currency = p.get("currency", "INR")
    amount_paise = int(round(price * 100))
    receipt = f"ts_{str(user['_id'])[-8:]}_{uuid_hex()[:8]}"[:40]
    try:
        order = razorpay_client.order.create({
            "amount": amount_paise, "currency": currency,
            "receipt": receipt, "payment_capture": 1,
        })
    except Exception as e:
        logger.warning(f"Razorpay order failed: {e}")
        raise HTTPException(status_code=502, detail="Could not start payment. Please try again.")
    doc = {
        "user_id": user["id"], "psychologist_id": body.psychologist_id,
        "psychologist_name": p["name"], "slot_id": slot["id"],
        "slot_label": slot["label"], "slot_date": slot["date"], "slot_time": slot["time"],
        "session_type": body.session_type, "price": price, "currency": currency,
        "status": "pending", "razorpay_order_id": order["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.bookings.insert_one(dict(doc))
    return {
        "booking_id": str(res.inserted_id),
        "order_id": order["id"],
        "amount": amount_paise,
        "currency": currency,
        "key_id": RAZORPAY_KEY_ID,
        "name": "TherapiShots",
        "description": f"{body.session_type} with {p['name']}",
        "prefill": {"name": user.get("name", ""), "contact": (user.get("phone") or "").replace("+", ""),
                    "email": user.get("email") or ""},
    }


@router.post("/bookings/verify")
async def verify_booking_payment(body: BookingVerifyIn, user: dict = Depends(get_current_user)):
    """Verify Razorpay payment signature server-side, then confirm the booking."""
    try:
        booking = await db.bookings.find_one({"_id": ObjectId(body.booking_id), "user_id": user["id"]})
    except Exception:
        booking = None
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.get("razorpay_order_id") != body.razorpay_order_id:
        raise HTTPException(status_code=400, detail="Order mismatch")
    # HMAC-SHA256(order_id|payment_id, key_secret)
    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, body.razorpay_signature):
        await db.bookings.update_one({"_id": booking["_id"]}, {"$set": {"status": "failed"}})
        raise HTTPException(status_code=400, detail="Payment verification failed.")
    payment = {
        "status": "paid", "provider": "razorpay",
        "amount": booking["price"], "currency": booking.get("currency", "INR"),
        "razorpay_order_id": body.razorpay_order_id,
        "razorpay_payment_id": body.razorpay_payment_id,
    }
    await db.bookings.update_one(
        {"_id": booking["_id"]},
        {"$set": {"status": "confirmed", "payment": payment,
                  "confirmed_at": datetime.now(timezone.utc).isoformat()}},
    )
    booking["id"] = str(booking.pop("_id"))
    booking["status"] = "confirmed"
    booking["payment"] = payment
    return {"booking": booking, "message": "Your session is confirmed."}


@router.get("/bookings")
async def list_bookings(user: dict = Depends(get_current_user)):
    items = await db.bookings.find(
        {"user_id": user["id"], "status": {"$in": ["confirmed", "cancelled"]}}
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
    await db.bookings.update_one({"_id": ObjectId(bid)}, {"$set": {"status": "cancelled"}})
    return {"ok": True, "status": "cancelled"}

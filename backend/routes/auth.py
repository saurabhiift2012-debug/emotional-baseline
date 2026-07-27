"""Auth routes: phone + OTP request/verify (Indian numbers only)."""
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException

from database import db
from config import TEST_PHONES, AGREEMENT_VERSION
from models import RequestOtpIn, VerifyOtpIn
from security import create_token
from services.otp import (ensure_indian_phone, send_otp_sms, check_otp_sms, validate_18)
from services.users import public_user, default_consents

router = APIRouter()


@router.post("/auth/request-otp")
async def request_otp(body: RequestOtpIn):
    phone = ensure_indian_phone(body.phone)
    existing = await db.users.find_one({"phone": phone})
    pending = None
    if body.mode == "register":
        if existing:
            raise HTTPException(status_code=400, detail="This mobile number is already registered. Please log in.")
        if not body.name or not body.date_of_birth:
            raise HTTPException(status_code=400, detail="Name and date of birth are required.")
        validate_18(body.date_of_birth)
        if not (body.emergency_contact_name and body.emergency_contact_relationship and body.emergency_contact_phone):
            raise HTTPException(status_code=400, detail="Emergency contact name, relationship and number are required.")
        ec_phone = ensure_indian_phone(body.emergency_contact_phone)
        if not body.agreement_accepted:
            raise HTTPException(status_code=400, detail="Please read and accept the safety agreement to continue.")
        pending = {
            "name": body.name.strip() or "there",
            "date_of_birth": body.date_of_birth,
            "email": (body.email or "").strip().lower() or None,
            "language": body.language,
            "emergency_contact": {
                "name": body.emergency_contact_name.strip(),
                "relationship": body.emergency_contact_relationship.strip(),
                "phone": ec_phone,
            },
            "agreement": {
                "accepted": True,
                "version": AGREEMENT_VERSION,
                "accepted_at": datetime.now(timezone.utc).isoformat(),
                "consents": body.consents or {},
            },
        }
    else:  # login
        if not existing:
            raise HTTPException(status_code=404, detail="No account found for this number. Please register.")

    # basic rate limit: 20s cooldown between sends
    prior = await db.otps.find_one({"phone": phone})
    if prior:
        try:
            sent = datetime.fromisoformat(prior.get("sent_at"))
            if (datetime.now(timezone.utc) - sent).total_seconds() < 20:
                raise HTTPException(status_code=429, detail="Please wait a few seconds before requesting another code.")
        except HTTPException:
            raise
        except Exception:
            pass

    now = datetime.now(timezone.utc)
    is_test = phone in TEST_PHONES
    record = {"sent_at": now.isoformat(), "attempts": 0, "pending": pending,
              "expires_at": (now + timedelta(minutes=10)).isoformat()}
    if is_test:
        record["test_code"] = TEST_PHONES[phone]
    else:
        send_otp_sms(phone)
    await db.otps.update_one({"phone": phone}, {"$set": record}, upsert=True)
    resp = {"message": "Verification code sent."}
    if is_test:
        resp["dev_code"] = TEST_PHONES[phone]  # test numbers only
    return resp


@router.post("/auth/verify-otp")
async def verify_otp(body: VerifyOtpIn):
    phone = ensure_indian_phone(body.phone)
    rec = await db.otps.find_one({"phone": phone})
    if not rec:
        raise HTTPException(status_code=400, detail="Code expired or not found. Please request a new one.")
    try:
        if datetime.fromisoformat(rec["expires_at"]) < datetime.now(timezone.utc):
            await db.otps.delete_one({"_id": rec["_id"]})
            raise HTTPException(status_code=400, detail="Code expired. Please request a new one.")
    except HTTPException:
        raise
    except Exception:
        pass
    if rec.get("attempts", 0) >= 5:
        await db.otps.delete_one({"_id": rec["_id"]})
        raise HTTPException(status_code=429, detail="Too many attempts. Please request a new code.")

    code = body.code.strip()
    if "test_code" in rec:
        ok = code == rec["test_code"]
    else:
        ok = check_otp_sms(phone, code)
    if not ok:
        await db.otps.update_one({"_id": rec["_id"]}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=401, detail="Incorrect code. Please try again.")

    user = await db.users.find_one({"phone": phone})
    if not user:
        pending = rec.get("pending") or {}
        doc = {
            "phone": phone,
            "email": pending.get("email"),
            "name": pending.get("name", "there"),
            "date_of_birth": pending.get("date_of_birth"),
            "language": pending.get("language", "en"),
            "emergency_contact": pending.get("emergency_contact"),
            "agreement": pending.get("agreement"),
            "consents": default_consents(),
            "consent_version": 1,
            "health_connected": {"sleep": True, "activity": True, "steps": True, "heart": True},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        res = await db.users.insert_one(doc)
        user = await db.users.find_one({"_id": res.inserted_id})
    await db.otps.delete_one({"_id": rec["_id"]})
    token = create_token(str(user['_id']))
    return {"token": token, "user": public_user(user)}

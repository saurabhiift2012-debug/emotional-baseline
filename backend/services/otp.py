"""Phone normalisation, age gate, and Twilio Verify OTP send/check."""
from datetime import datetime, date

from fastapi import HTTPException

from config import (logger, TWILIO_ENABLED, twilio_client, TWILIO_VERIFY_SERVICE_SID)


def norm_phone(phone: str) -> str:
    return "".join(ch for ch in (phone or "") if ch.isdigit() or ch == "+")


def ensure_indian_phone(phone: str) -> str:
    """Normalise to E.164 for India (+91XXXXXXXXXX). Accepts a 10-digit number,
    a 91-prefixed number, or an already +91-prefixed number. Rejects anything else."""
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    if digits.startswith("0091"):
        digits = digits[4:]
    elif digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    if len(digits) != 10 or digits[0] not in "6789":
        raise HTTPException(status_code=400,
                            detail="Please enter a valid Indian mobile number (10 digits).")
    return "+91" + digits


def send_otp_sms(phone: str):
    """Send an OTP via Twilio Verify. Test numbers are handled by the caller."""
    if not TWILIO_ENABLED:
        raise HTTPException(status_code=503, detail="SMS service is not configured.")
    try:
        twilio_client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID) \
            .verifications.create(to=phone, channel="sms")
    except HTTPException:
        raise
    except Exception as e:
        code = getattr(e, "code", None)
        logger.warning(f"Twilio send failed for {phone}: {e}")
        if code == 21608:
            # Trial Twilio account: recipient number must be verified in the console.
            raise HTTPException(status_code=400, detail=(
                "We couldn't text a code to this number yet. Our SMS line is on a trial plan, "
                "so it can only message numbers verified in Twilio. Please verify this number in "
                "the Twilio console (or upgrade the Twilio account) and try again."))
        if code in (21211, 21214, 60200):
            raise HTTPException(status_code=400, detail="That mobile number looks invalid. Please check it and try again.")
        if code == 60203:
            raise HTTPException(status_code=429, detail="Too many code requests for this number. Please wait a little while and try again.")
        raise HTTPException(status_code=400, detail="We couldn't send the verification code right now. Please try again in a moment.")


def check_otp_sms(phone: str, code: str) -> bool:
    if not TWILIO_ENABLED:
        return False
    try:
        check = twilio_client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID) \
            .verification_checks.create(to=phone, code=code)
        return check.status == "approved"
    except Exception as e:
        logger.warning(f"Twilio check failed for {phone}: {e}")
        return False


def validate_18(dob_str: str):
    try:
        dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Date of birth must be YYYY-MM-DD")
    today = date.today()
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    if age < 18:
        raise HTTPException(status_code=403, detail="You must be 18 or older to use TherapiShots.")

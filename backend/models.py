"""Pydantic request models shared across routers."""
from typing import List, Optional

from pydantic import BaseModel


class CheckinIn(BaseModel):
    mood: str
    context: List[str] = []
    note: Optional[str] = None
    timezone: str = "UTC"


class ObservationFeedbackIn(BaseModel):
    checkin_id: Optional[str] = None
    insight_key: Optional[str] = None
    response: str  # yes | maybe | not_really


class ConsentIn(BaseModel):
    consents: dict


class RequestOtpIn(BaseModel):
    phone: str
    mode: str = "login"  # "login" | "register"
    name: Optional[str] = None
    date_of_birth: Optional[str] = None
    email: Optional[str] = None
    language: str = "en"
    # Emergency contact + safety agreement (register only)
    emergency_contact_name: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    agreement_accepted: Optional[bool] = None
    consents: Optional[dict] = None


class VerifyOtpIn(BaseModel):
    phone: str
    code: str


class BookingOrderIn(BaseModel):
    psychologist_id: str
    slot_id: str
    session_type: str


class BookingVerifyIn(BaseModel):
    booking_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class AdminAuthIn(BaseModel):
    passcode: str


class AdminResourcesIn(BaseModel):
    assigned_resources: List[str]

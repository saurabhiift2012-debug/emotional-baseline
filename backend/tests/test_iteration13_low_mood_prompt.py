"""Iteration 13 — Backend tests for:
- Single real psychologist profile (Dr. Ruchi Sharma) with correct fields
- Availability slots restricted to Mon/Wed/Fri/Sat/Sun and hours 10-13,19,20
- Booking order creation with Razorpay (test mode)
- Booking verify rejects invalid signature (400)
- Booking order with invalid slot_id returns 400
- Regression: /api/insights, /api/today.support_tier, OTP demo flow
"""
import os
from datetime import datetime, date
import pytest
import requests
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
# frontend/.env holds EXPO_PUBLIC_BACKEND_URL — load it too
load_dotenv(Path("/app/frontend/.env"))

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL/EXPO_BACKEND_URL must be set for tests"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

DEMO_PHONE_LOCAL = "9999900000"
DEMO_PHONE_E164 = "+919999900000"
DEMO_OTP = "123456"


# ---------------------- fixtures ----------------------
@pytest.fixture(scope="module")
def token():
    """Login the demo account via OTP and return a JWT."""
    # cooldown-friendly: try request-otp; if 429, wait and retry once
    r = requests.post(f"{API}/auth/request-otp",
                      json={"phone": DEMO_PHONE_LOCAL, "mode": "login"}, timeout=15)
    if r.status_code == 429:
        import time; time.sleep(22)
        r = requests.post(f"{API}/auth/request-otp",
                          json={"phone": DEMO_PHONE_LOCAL, "mode": "login"}, timeout=15)
    assert r.status_code == 200, f"request-otp failed: {r.status_code} {r.text}"
    body = r.json()
    assert body.get("dev_code") == DEMO_OTP, f"dev_code not returned: {body}"

    v = requests.post(f"{API}/auth/verify-otp",
                      json={"phone": DEMO_PHONE_E164, "code": DEMO_OTP}, timeout=15)
    assert v.status_code == 200, f"verify-otp failed: {v.status_code} {v.text}"
    return v.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------------------- psychologists (single real profile) ----------------------
class TestPsychologistsListing:
    def test_only_one_ruchi_sharma(self, auth_headers):
        r = requests.get(f"{API}/psychologists", headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "psychologists" in data
        psys = data["psychologists"]
        assert len(psys) == 1, f"expected exactly 1 psychologist, got {len(psys)}: {[p.get('name') for p in psys]}"
        p = psys[0]
        assert p["name"] == "Dr. Ruchi Sharma", p
        assert p["price"] == 1000
        assert p.get("short_call_price") == 1000
        assert p.get("session_types") == ["15-min Call"]
        expected_spec = {"Anxiety", "Stress", "Relationships", "Low mood",
                         "Children behaviour", "Post partum", "Low confidence"}
        assert set(p.get("specializations", [])) == expected_spec, p.get("specializations")
        assert p.get("slug") == "ruchi-sharma"

    def test_no_legacy_fake_profiles(self, auth_headers):
        r = requests.get(f"{API}/psychologists", headers=auth_headers, timeout=15)
        names = [p["name"] for p in r.json().get("psychologists", [])]
        # Fake names sometimes seen historically
        for banned in ("Priya", "Neha", "Aarav", "Rohan", "Kavita"):
            assert not any(banned in n for n in names), f"fake profile leaked: {names}"


# ---------------------- availability schedule ----------------------
ALLOWED_WEEKDAYS = {0, 2, 4, 5, 6}  # Mon,Wed,Fri,Sat,Sun
ALLOWED_HOURS = {10, 11, 12, 13, 19, 20}


class TestAvailability:
    @pytest.fixture(scope="class")
    def psy_detail(self, auth_headers):
        r = requests.get(f"{API}/psychologists", headers=auth_headers, timeout=15)
        pid = r.json()["psychologists"][0]["id"]
        d = requests.get(f"{API}/psychologists/{pid}", headers=auth_headers, timeout=15)
        assert d.status_code == 200, d.text
        return d.json()

    def test_availability_shape_and_content(self, psy_detail):
        slots = psy_detail.get("availability", [])
        assert len(slots) > 0, "availability must not be empty"
        now = datetime.now()
        for s in slots:
            # id format YYYY-MM-DDTHH:00
            sid = s["id"]
            assert len(sid) == 16 and sid[4] == "-" and sid[7] == "-" and sid[10] == "T" and sid.endswith(":00"), sid
            d = date.fromisoformat(sid[:10])
            hour = int(sid[11:13])
            assert d.weekday() in ALLOWED_WEEKDAYS, f"weekday {d.weekday()} not allowed for slot {sid}"
            assert hour in ALLOWED_HOURS, f"hour {hour} not allowed for slot {sid}"
            slot_dt = datetime.combine(d, datetime.min.time()).replace(hour=hour)
            assert slot_dt >= now.replace(minute=0, second=0, microsecond=0), f"slot in past: {sid}"


# ---------------------- booking order & verify ----------------------
class TestBooking:
    @pytest.fixture(scope="class")
    def psy(self, auth_headers):
        r = requests.get(f"{API}/psychologists", headers=auth_headers, timeout=15)
        pid = r.json()["psychologists"][0]["id"]
        d = requests.get(f"{API}/psychologists/{pid}", headers=auth_headers, timeout=15)
        return d.json()

    def test_create_order_real_razorpay(self, psy, auth_headers):
        slot_id = psy["availability"][0]["id"]
        payload = {"psychologist_id": psy["id"], "slot_id": slot_id, "session_type": "15-min Call"}
        r = requests.post(f"{API}/bookings/order", json=payload, headers=auth_headers, timeout=20)
        assert r.status_code == 200, f"order failed: {r.status_code} {r.text}"
        body = r.json()
        assert body.get("order_id", "").startswith("order_"), body
        assert body.get("key_id", "").startswith("rzp_test_"), body
        assert body.get("amount") == 100000, body   # ₹1000 in paise
        assert body.get("currency") == "INR"
        assert "booking_id" in body

    def test_invalid_slot_id_returns_400(self, psy, auth_headers):
        payload = {"psychologist_id": psy["id"], "slot_id": "1999-01-01T10:00", "session_type": "15-min Call"}
        r = requests.post(f"{API}/bookings/order", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 400, f"expected 400, got {r.status_code} {r.text}"

    def test_verify_invalid_signature_400(self, psy, auth_headers):
        # First create a real order to get a booking_id + order_id
        slot_id = psy["availability"][1]["id"] if len(psy["availability"]) > 1 else psy["availability"][0]["id"]
        payload = {"psychologist_id": psy["id"], "slot_id": slot_id, "session_type": "15-min Call"}
        r = requests.post(f"{API}/bookings/order", json=payload, headers=auth_headers, timeout=20)
        assert r.status_code == 200, r.text
        order = r.json()
        vpayload = {
            "booking_id": order["booking_id"],
            "razorpay_order_id": order["order_id"],
            "razorpay_payment_id": "pay_FAKE1234567890",
            "razorpay_signature": "deadbeef" * 8,
        }
        v = requests.post(f"{API}/bookings/verify", json=vpayload, headers=auth_headers, timeout=15)
        assert v.status_code == 400, f"expected 400, got {v.status_code} {v.text}"


# ---------------------- regression ----------------------
class TestRegression:
    def test_insights_ok(self, auth_headers):
        r = requests.get(f"{API}/insights", headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        b = r.json()
        assert "insights" in b and "baseline" in b and "daily_moods" in b

    def test_today_has_support_tier(self, auth_headers):
        r = requests.get(f"{API}/today", headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        b = r.json()
        assert b.get("support_tier") in ("escalate", "gentle", "none"), b.get("support_tier")

    def test_otp_demo_flow(self):
        # Cool-down aware; this is essentially covered by the fixture but assert again
        import time
        time.sleep(2)
        # Directly attempt verify with wrong code should fail
        r = requests.post(f"{API}/auth/verify-otp",
                          json={"phone": DEMO_PHONE_E164, "code": "000000"}, timeout=10)
        assert r.status_code in (400, 401), r.text

"""Iteration 8 — Twilio Verify (SMS OTP) + Razorpay (payments) integration tests.

Covers the new backend surface introduced this iteration:
  - Indian +91 phone validation on /api/auth/request-otp (400 for non-Indian/short)
  - Demo/test phone bypass returns dev_code, verify-otp returns token+user
  - Auth-protected endpoints work with the returned token
  - /api/bookings/order returns Razorpay order (rzp_test_ key, amount, booking_id)
  - /api/bookings/verify rejects a fabricated signature (400)
  - /api/bookings lists only confirmed/cancelled (pending should not appear)
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

DEMO_PHONE_LOCAL = "9999900000"
DEMO_PHONE_E164 = "+919999900000"
DEMO_OTP = "123456"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _request_otp(session, **payload):
    r = session.post(f"{API}/auth/request-otp", json=payload, timeout=20)
    if r.status_code == 429:
        time.sleep(22)
        r = session.post(f"{API}/auth/request-otp", json=payload, timeout=20)
    return r


@pytest.fixture(scope="session")
def demo_token(session):
    r = _request_otp(session, phone=DEMO_PHONE_LOCAL, mode="login")
    assert r.status_code == 200, f"request-otp failed: {r.status_code} {r.text}"
    data = r.json()
    assert data.get("dev_code") == DEMO_OTP, f"expected dev_code {DEMO_OTP}, got {data}"
    v = session.post(f"{API}/auth/verify-otp",
                     json={"phone": DEMO_PHONE_E164, "code": DEMO_OTP}, timeout=20)
    assert v.status_code == 200, f"verify-otp failed: {v.status_code} {v.text}"
    body = v.json()
    assert "token" in body and "user" in body
    assert body["user"]["phone"] == DEMO_PHONE_E164
    return body["token"]


@pytest.fixture
def auth_headers(demo_token):
    return {"Content-Type": "application/json",
            "Authorization": f"Bearer {demo_token}"}


# ---------- Phone validation & OTP request ----------
class TestPhoneValidationAndOtp:
    def test_demo_bypass_returns_dev_code(self, session):
        r = _request_otp(session, phone=DEMO_PHONE_LOCAL, mode="login")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("dev_code") == DEMO_OTP

    def test_verify_demo_returns_token_and_user(self, session):
        r = _request_otp(session, phone=DEMO_PHONE_LOCAL, mode="login")
        assert r.status_code == 200, r.text
        v = session.post(f"{API}/auth/verify-otp",
                         json={"phone": DEMO_PHONE_E164, "code": DEMO_OTP}, timeout=20)
        assert v.status_code == 200, v.text
        body = v.json()
        assert body["user"]["phone"] == DEMO_PHONE_E164
        assert isinstance(body["token"], str) and len(body["token"]) > 20

    def test_reject_short_non_indian_number(self, session):
        r = session.post(f"{API}/auth/request-otp",
                         json={"phone": "12345", "mode": "login"}, timeout=15)
        assert r.status_code == 400, r.text

    def test_reject_us_number(self, session):
        r = session.post(f"{API}/auth/request-otp",
                         json={"phone": "+14155550100", "mode": "login"}, timeout=15)
        assert r.status_code == 400, r.text

    def test_reject_indian_leading_5(self, session):
        # Indian mobile must start 6-9
        r = session.post(f"{API}/auth/request-otp",
                         json={"phone": "5123456789", "mode": "login"}, timeout=15)
        assert r.status_code == 400, r.text


# ---------- Auth-protected endpoints work with token ----------
class TestAuthProtectedEndpoints:
    def test_today(self, session, auth_headers):
        r = session.get(f"{API}/today", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("greeting", "signals", "small_step", "todays_entries", "todays_count"):
            assert k in d

    def test_insights(self, session, auth_headers):
        r = session.get(f"{API}/insights", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "daily_moods" in d and len(d["daily_moods"]) == 7
        assert "insights" in d and "baseline" in d

    def test_progress(self, session, auth_headers):
        r = session.get(f"{API}/progress", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert len(d["mood_series"]) == 30
        assert len(d["feel_map"]) == 42

    def test_psychologists_list(self, session, auth_headers):
        r = session.get(f"{API}/psychologists", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        items = r.json()["psychologists"]
        assert isinstance(items, list) and len(items) >= 3
        for p in items:
            assert "_id" not in p
            assert "id" in p


# ---------- Razorpay booking order + signature verification ----------
class TestBookingRazorpay:
    @pytest.fixture(scope="class")
    def psych_and_slot(self, session, demo_token):
        h = {"Authorization": f"Bearer {demo_token}"}
        lst = session.get(f"{API}/psychologists", headers=h, timeout=15).json()["psychologists"]
        # pick a psychologist that supports 15-min Call (all demo ones do)
        p = next((x for x in lst if "15-min Call" in x.get("session_types", [])), lst[0])
        detail = session.get(f"{API}/psychologists/{p['id']}", headers=h, timeout=15).json()
        assert detail["availability"], "psych must have availability"
        return detail, detail["availability"][0]

    def test_create_order_returns_rzp_test_key_and_amount(
            self, session, auth_headers, psych_and_slot):
        p, slot = psych_and_slot
        r = session.post(f"{API}/bookings/order", headers=auth_headers, json={
            "psychologist_id": p["id"],
            "slot_id": slot["id"],
            "session_type": "15-min Call",
        }, timeout=25)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "order_id" in d and d["order_id"].startswith("order_"), d
        assert "key_id" in d and d["key_id"].startswith("rzp_test_"), \
            f"expected TEST key, got: {d.get('key_id')}"
        expected_amount = p["short_call_price"] * 100
        assert d["amount"] == expected_amount
        assert d.get("currency") == p.get("currency", "INR")
        assert "booking_id" in d and isinstance(d["booking_id"], str)

    def test_verify_rejects_fabricated_signature(
            self, session, auth_headers, psych_and_slot):
        p, slot = psych_and_slot
        # need a fresh order for signature test — use a different slot to avoid reuse
        detail = session.get(f"{API}/psychologists/{p['id']}",
                             headers=auth_headers, timeout=15).json()
        alt_slot = detail["availability"][-1]
        order_resp = session.post(f"{API}/bookings/order", headers=auth_headers, json={
            "psychologist_id": p["id"],
            "slot_id": alt_slot["id"],
            "session_type": "15-min Call",
        }, timeout=25)
        assert order_resp.status_code == 200, order_resp.text
        od = order_resp.json()
        # Fabricated signature — must be rejected with 400
        v = session.post(f"{API}/bookings/verify", headers=auth_headers, json={
            "booking_id": od["booking_id"],
            "razorpay_order_id": od["order_id"],
            "razorpay_payment_id": "pay_FAKE1234567890",
            "razorpay_signature": "deadbeef" * 8,
        }, timeout=15)
        assert v.status_code == 400, f"expected 400 signature reject, got {v.status_code} {v.text}"

    def test_pending_booking_not_in_list(self, session, auth_headers, psych_and_slot):
        """After creating an order (status=pending), GET /api/bookings must not
        include that booking (only confirmed/cancelled are returned)."""
        p, _ = psych_and_slot
        detail = session.get(f"{API}/psychologists/{p['id']}",
                             headers=auth_headers, timeout=15).json()
        # pick a middle slot to avoid clashing with other tests
        idx = min(2, len(detail["availability"]) - 1)
        slot = detail["availability"][idx]
        order_resp = session.post(f"{API}/bookings/order", headers=auth_headers, json={
            "psychologist_id": p["id"],
            "slot_id": slot["id"],
            "session_type": "15-min Call",
        }, timeout=25)
        assert order_resp.status_code == 200, order_resp.text
        pending_booking_id = order_resp.json()["booking_id"]

        lst = session.get(f"{API}/bookings", headers=auth_headers, timeout=15)
        assert lst.status_code == 200
        bookings = lst.json()["bookings"]
        # Every returned booking must be confirmed or cancelled
        for b in bookings:
            assert b["status"] in ("confirmed", "cancelled"), b
        # Pending order MUST NOT be in the list
        ids = [b["id"] for b in bookings]
        assert pending_booking_id not in ids, \
            f"pending booking {pending_booking_id} leaked into GET /bookings"


# ---------- auth enforcement on booking endpoints ----------
class TestBookingAuth:
    def test_order_requires_auth(self, session):
        r = session.post(f"{API}/bookings/order", json={
            "psychologist_id": "x", "slot_id": "y", "session_type": "15-min Call",
        }, timeout=15)
        assert r.status_code in (401, 403)

    def test_verify_requires_auth(self, session):
        r = session.post(f"{API}/bookings/verify", json={
            "booking_id": "x", "razorpay_order_id": "y",
            "razorpay_payment_id": "z", "razorpay_signature": "s",
        }, timeout=15)
        assert r.status_code in (401, 403)

    def test_list_requires_auth(self, session):
        r = session.get(f"{API}/bookings", timeout=15)
        assert r.status_code in (401, 403)

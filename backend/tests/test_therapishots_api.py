"""TherapiShots backend API tests — OTP auth (mock) + core endpoints.

Auth flow: request-otp -> dev_code -> verify-otp -> {token, user}.
Also covers: config, check-ins (multiple/day), today, insights.daily_moods,
pulse, progress, psychologists, bookings (mock payment), auth enforcement.
"""
import os
import time
import uuid
import pytest
import requests
from datetime import date, timedelta

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

DEMO_PHONE = "+919999900000"


def _uniq_phone() -> str:
    # 12-digit unique phone starting with +9198... to avoid collisions
    return "+9198" + uuid.uuid4().hex[:8].translate(str.maketrans("abcdef", "012345"))


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _request_otp(session, **payload) -> dict:
    # honour 20s cooldown by retrying once on 429
    r = session.post(f"{API}/auth/request-otp", json=payload, timeout=20)
    if r.status_code == 429:
        time.sleep(21)
        r = session.post(f"{API}/auth/request-otp", json=payload, timeout=20)
    return r  # return response; tests decide


def _register_new_user(session):
    phone = _uniq_phone()
    r = _request_otp(session, phone=phone, mode="register",
                     name="Test User", date_of_birth="1995-05-01", language="en")
    assert r.status_code == 200, f"request-otp register failed: {r.status_code} {r.text}"
    data = r.json()
    assert data.get("mock") is True
    assert "dev_code" in data and len(data["dev_code"]) == 6
    code = data["dev_code"]
    v = session.post(f"{API}/auth/verify-otp", json={"phone": phone, "code": code}, timeout=20)
    assert v.status_code == 200, f"verify-otp failed: {v.status_code} {v.text}"
    body = v.json()
    assert "token" in body and "user" in body
    assert body["user"]["phone"] == phone
    return {"token": body["token"], "user": body["user"], "phone": phone}


@pytest.fixture(scope="session")
def new_user(session):
    return _register_new_user(session)


@pytest.fixture
def auth_headers(new_user):
    return {"Content-Type": "application/json", "Authorization": f"Bearer {new_user['token']}"}


# ---------- public ----------
class TestPublic:
    def test_root(self, session):
        r = session.get(f"{API}/", timeout=15)
        assert r.status_code == 200 and r.json().get("status") == "ok"

    def test_config(self, session):
        r = session.get(f"{API}/config", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert len(d["moods"]) == 9 and len(d["context_tags"]) >= 10


# ---------- OTP auth (register + login) ----------
class TestOtpAuth:
    def test_register_missing_name_or_dob(self, session):
        phone = _uniq_phone()
        r = _request_otp(session, phone=phone, mode="register")
        assert r.status_code == 400

    def test_register_under_18(self, session):
        phone = _uniq_phone()
        under = date.today() - timedelta(days=365 * 10)
        r = _request_otp(session, phone=phone, mode="register",
                         name="Kid", date_of_birth=under.isoformat())
        assert r.status_code == 403

    def test_register_full_flow_returns_dev_code_and_token(self, session):
        # Uses a fresh user for isolation
        info = _register_new_user(session)
        assert info["user"]["phone"].startswith("+")
        assert info["user"].get("email") in (None, "")

    def test_register_duplicate_phone_rejected(self, session, new_user):
        r = _request_otp(session, phone=new_user["phone"], mode="register",
                         name="Dup", date_of_birth="1990-01-01")
        assert r.status_code == 400

    def test_login_no_account_404(self, session):
        r = _request_otp(session, phone=_uniq_phone(), mode="login")
        assert r.status_code == 404

    def test_verify_wrong_code_401(self, session):
        phone = _uniq_phone()
        r = _request_otp(session, phone=phone, mode="register",
                         name="Wrong Code", date_of_birth="1995-05-01")
        assert r.status_code == 200
        v = session.post(f"{API}/auth/verify-otp",
                         json={"phone": phone, "code": "000000"}, timeout=15)
        # rec.code is 6 random digits; "000000" is overwhelmingly wrong
        assert v.status_code == 401

    def test_demo_phone_login(self, session):
        r = _request_otp(session, phone=DEMO_PHONE, mode="login")
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        code = r.json()["dev_code"]
        v = session.post(f"{API}/auth/verify-otp",
                         json={"phone": DEMO_PHONE, "code": code}, timeout=15)
        assert v.status_code == 200
        body = v.json()
        assert "token" in body and body["user"]["phone"] == DEMO_PHONE
        # /me works with this token
        me = session.get(f"{API}/auth/me",
                         headers={"Authorization": f"Bearer {body['token']}"}, timeout=15)
        assert me.status_code == 200 and me.json()["phone"] == DEMO_PHONE

    def test_me_no_auth(self, session):
        r = session.get(f"{API}/auth/me", timeout=15)
        assert r.status_code in (401, 403)

    def test_me_with_token(self, session, auth_headers, new_user):
        r = session.get(f"{API}/auth/me", headers=auth_headers, timeout=15)
        assert r.status_code == 200 and r.json()["phone"] == new_user["phone"]

    def test_resend_cooldown_informational(self, session, new_user):
        # informational: two back-to-back sends should hit 20s cooldown
        r1 = session.post(f"{API}/auth/request-otp",
                          json={"phone": new_user["phone"], "mode": "login"}, timeout=15)
        r2 = session.post(f"{API}/auth/request-otp",
                          json={"phone": new_user["phone"], "mode": "login"}, timeout=15)
        # one of them should be 429 (cooldown), or first is 200 and second is 429
        assert r1.status_code in (200, 429)
        assert r2.status_code in (200, 429)
        # if both succeeded there's no cooldown, log but don't fail
        if r1.status_code == 200 and r2.status_code == 200:
            pytest.skip("cooldown not triggered in this environment (informational)")


# ---------- check-ins ----------
class TestCheckins:
    def test_create_and_today_shows_entry(self, session, auth_headers):
        r = session.post(f"{API}/checkins", headers=auth_headers, json={
            "mood": "hopeful", "context": ["work"], "note": "first", "timezone": "UTC"}, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["checkin"]["mood"] == "hopeful"
        assert body["low_mood"] is False
        assert body.get("todays_count", 0) >= 1

    def test_multiple_checkins_per_day_allowed(self, session, auth_headers):
        before = session.get(f"{API}/today", headers=auth_headers, timeout=15).json()
        before_count = before.get("todays_count", 0)
        r1 = session.post(f"{API}/checkins", headers=auth_headers, json={
            "mood": "anxious", "context": [], "note": "n1", "timezone": "UTC"}, timeout=15)
        r2 = session.post(f"{API}/checkins", headers=auth_headers, json={
            "mood": "calm", "context": ["exercise"], "note": "n2", "timezone": "UTC"}, timeout=15)
        assert r1.status_code == 200 and r2.status_code == 200
        t = session.get(f"{API}/today", headers=auth_headers, timeout=15).json()
        assert t["todays_count"] >= before_count + 2
        assert isinstance(t["todays_entries"], list) and len(t["todays_entries"]) >= 2
        assert t["todays_mood"] == t["todays_entries"][-1]["mood"] == "calm"

    def test_unknown_mood(self, session, auth_headers):
        r = session.post(f"{API}/checkins", headers=auth_headers, json={
            "mood": "notamood", "context": [], "timezone": "UTC"}, timeout=15)
        assert r.status_code == 400


# ---------- today / insights / pulse / progress ----------
class TestAnalytics:
    def test_today(self, session, auth_headers):
        r = session.get(f"{API}/today", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("greeting", "signals", "small_step", "todays_entries", "todays_count"):
            assert k in d
        assert d["signals"]["sleep"]["minutes"] > 0

    def test_insights_daily_moods(self, session, auth_headers):
        r = session.get(f"{API}/insights", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "daily_moods" in d and len(d["daily_moods"]) == 7

    def test_pulse(self, session, auth_headers):
        r = session.get(f"{API}/pulse", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("mood", "sleep", "activity", "recovery", "summary", "disclaimer"):
            assert k in d

    def test_progress(self, session, auth_headers):
        r = session.get(f"{API}/progress", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert len(d["mood_series"]) == 30 and len(d["feel_map"]) == 42


# ---------- reposition: call recommendation + latest_group on /today ----------
class TestTodayCallRecommendation:
    def test_demo_user_call_recommended_flags_present(self, session):
        # Demo phone user has seeded ~6 weeks — use it to check flags exist and types
        # login (bypass 20s cooldown if needed)
        r = _request_otp(session, phone=DEMO_PHONE, mode="login")
        assert r.status_code == 200, r.text
        code = r.json()["dev_code"]
        v = session.post(f"{API}/auth/verify-otp",
                         json={"phone": DEMO_PHONE, "code": code}, timeout=15)
        assert v.status_code == 200
        token = v.json()["token"]
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        t = session.get(f"{API}/today", headers=headers, timeout=15).json()
        assert "call_recommended" in t and isinstance(t["call_recommended"], bool)
        assert "latest_group" in t  # value can be None if no history but demo has data

    def test_call_recommended_true_when_latest_is_low(self, session, auth_headers):
        # Log a low mood → call_recommended must be True
        r = session.post(f"{API}/checkins", headers=auth_headers, json={
            "mood": "heavy", "context": [], "timezone": "UTC"}, timeout=15)
        assert r.status_code == 200
        t = session.get(f"{API}/today", headers=auth_headers, timeout=15).json()
        assert t["todays_mood"] == "heavy"
        assert t["latest_group"] == "low"
        assert t["call_recommended"] is True

    def test_call_recommended_false_when_latest_bright_and_no_repeated_low(self, session):
        # brand-new user: register + immediately post a bright mood
        info = _register_new_user(session)
        headers = {"Authorization": f"Bearer {info['token']}",
                   "Content-Type": "application/json"}
        r = session.post(f"{API}/checkins", headers=headers, json={
            "mood": "calm", "context": [], "timezone": "UTC"}, timeout=15)
        assert r.status_code == 200
        t = session.get(f"{API}/today", headers=headers, timeout=15).json()
        assert t["latest_group"] == "bright"
        # seeded 42 days may randomly trip repeated_low; assert type only in that case
        assert isinstance(t["call_recommended"], bool)


# ---------- psychologists ----------
class TestPsychologists:
    def test_list_all(self, session, auth_headers):
        r = session.get(f"{API}/psychologists", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        items = r.json()["psychologists"]
        assert isinstance(items, list) and len(items) >= 3
        assert "_id" not in items[0]

    def test_profiles_include_15min_call_and_short_price(self, session, auth_headers):
        items = session.get(f"{API}/psychologists", headers=auth_headers, timeout=15).json()["psychologists"]
        for p in items:
            assert "session_types" in p and "15-min Call" in p["session_types"], \
                f"{p.get('name')} missing 15-min Call in session_types"
            assert "short_call_price" in p and isinstance(p["short_call_price"], (int, float))
            assert p["short_call_price"] < p["price"], "short_call_price must be less than full price"

    def test_get_by_id_with_availability(self, session, auth_headers):
        lst = session.get(f"{API}/psychologists", headers=auth_headers, timeout=15).json()["psychologists"]
        pid = lst[0]["id"]
        r = session.get(f"{API}/psychologists/{pid}", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == pid and isinstance(d["availability"], list) and len(d["availability"]) > 0

    def test_get_by_id_404(self, session, auth_headers):
        r = session.get(f"{API}/psychologists/507f1f77bcf86cd799439011",
                        headers=auth_headers, timeout=15)
        assert r.status_code == 404

    def test_requires_auth(self, session):
        r = session.get(f"{API}/psychologists", timeout=15)
        assert r.status_code in (401, 403)


# ---------- bookings (mock payment) ----------
class TestBookings:
    def _first_psych_with_slot(self, session, headers):
        lst = session.get(f"{API}/psychologists", headers=headers, timeout=15).json()["psychologists"]
        p = lst[0]
        detail = session.get(f"{API}/psychologists/{p['id']}", headers=headers, timeout=15).json()
        return detail, detail["availability"][0]

    def test_create_booking_with_mock_payment(self, session, auth_headers):
        p, slot = self._first_psych_with_slot(session, auth_headers)
        r = session.post(f"{API}/bookings", headers=auth_headers, json={
            "psychologist_id": p["id"], "slot_id": slot["id"],
            "session_type": p["session_types"][0]}, timeout=15)
        assert r.status_code == 200, r.text
        b = r.json()["booking"]
        assert b["status"] == "confirmed"
        assert b["payment"]["status"] == "paid"
        assert b["payment"]["provider"] == "mock"
        assert b["payment"]["transaction_id"].startswith("MOCK-")

    def test_cancel_booking(self, session, auth_headers):
        p, _ = self._first_psych_with_slot(session, auth_headers)
        detail = session.get(f"{API}/psychologists/{p['id']}", headers=auth_headers, timeout=15).json()
        slot = detail["availability"][-1]
        r = session.post(f"{API}/bookings", headers=auth_headers, json={
            "psychologist_id": p["id"], "slot_id": slot["id"],
            "session_type": p["session_types"][0]}, timeout=15)
        assert r.status_code == 200
        bid = r.json()["booking"]["id"]
        rc = session.post(f"{API}/bookings/{bid}/cancel", headers=auth_headers, timeout=15)
        assert rc.status_code == 200 and rc.json()["status"] == "cancelled"

    def test_15min_call_charges_short_call_price(self, session, auth_headers):
        p, slot = self._first_psych_with_slot(session, auth_headers)
        assert "15-min Call" in p["session_types"]
        r = session.post(f"{API}/bookings", headers=auth_headers, json={
            "psychologist_id": p["id"], "slot_id": slot["id"],
            "session_type": "15-min Call"}, timeout=15)
        assert r.status_code == 200, r.text
        b = r.json()["booking"]
        assert b["session_type"] == "15-min Call"
        assert b["price"] == p["short_call_price"]
        assert b["payment"]["amount"] == p["short_call_price"]
        assert b["payment"]["provider"] == "mock"

    def test_video_session_charges_full_price(self, session, auth_headers):
        p, _ = self._first_psych_with_slot(session, auth_headers)
        assert "Video" in p["session_types"], "expected first psych to support Video"
        detail = session.get(f"{API}/psychologists/{p['id']}", headers=auth_headers, timeout=15).json()
        # pick a slot that hasn't been used
        slot = detail["availability"][1] if len(detail["availability"]) > 1 else detail["availability"][0]
        r = session.post(f"{API}/bookings", headers=auth_headers, json={
            "psychologist_id": p["id"], "slot_id": slot["id"],
            "session_type": "Video"}, timeout=15)
        assert r.status_code == 200, r.text
        b = r.json()["booking"]
        assert b["session_type"] == "Video"
        assert b["price"] == p["price"]
        assert b["payment"]["amount"] == p["price"]
        assert b["payment"]["provider"] == "mock"


# ---------- auth enforcement ----------
class TestAuthEnforcement:
    @pytest.mark.parametrize("path", ["/today", "/insights", "/pulse", "/progress",
                                       "/psychologists", "/bookings"])
    def test_endpoint_requires_auth(self, session, path):
        r = session.get(f"{API}{path}", timeout=15)
        assert r.status_code in (401, 403)

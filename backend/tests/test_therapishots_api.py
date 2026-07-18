"""TherapiShots backend API tests - covers original endpoints + new increment:
psychologists, bookings (mock payment), multiple check-ins/day, insights.daily_moods,
and /api/today todays_entries.
"""
import os
import uuid
import pytest
import requests
from datetime import date, timedelta

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def new_user_token(session):
    uniq = uuid.uuid4().hex[:8]
    email = f"test_{uniq}@therapishots.app"
    payload = {
        "email": email, "password": "secret123", "name": "Test User",
        "date_of_birth": "1995-05-01", "language": "en",
    }
    r = session.post(f"{API}/auth/register", json=payload, timeout=30)
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    data = r.json()
    return {"token": data["token"], "user": data["user"], "email": email, "password": "secret123"}


@pytest.fixture
def auth_headers(new_user_token):
    return {"Content-Type": "application/json", "Authorization": f"Bearer {new_user_token['token']}"}


# ---------- public ----------
class TestPublic:
    def test_root(self, session):
        r = session.get(f"{API}/", timeout=15)
        assert r.status_code == 200 and r.json().get("status") == "ok"

    def test_config(self, session):
        r = session.get(f"{API}/config", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert len(d["moods"]) == 9
        assert len(d["context_tags"]) >= 10


# ---------- auth ----------
class TestAuth:
    def test_register_under_18(self, session):
        under = date.today() - timedelta(days=365 * 10)
        r = session.post(f"{API}/auth/register", json={
            "email": f"test_u18_{uuid.uuid4().hex[:6]}@example.com",
            "password": "secret123", "name": "Kid",
            "date_of_birth": under.isoformat(), "language": "en"}, timeout=15)
        assert r.status_code == 422

    def test_register_short_pw(self, session):
        r = session.post(f"{API}/auth/register", json={
            "email": f"test_sp_{uuid.uuid4().hex[:6]}@example.com",
            "password": "12345", "name": "X",
            "date_of_birth": "1990-01-01", "language": "en"}, timeout=15)
        assert r.status_code == 422

    def test_register_duplicate(self, session, new_user_token):
        r = session.post(f"{API}/auth/register", json={
            "email": new_user_token["email"], "password": "secret123",
            "name": "Dup", "date_of_birth": "1990-01-01", "language": "en"}, timeout=15)
        assert r.status_code == 400

    def test_login_ok(self, session, new_user_token):
        r = session.post(f"{API}/auth/login", json={
            "email": new_user_token["email"], "password": new_user_token["password"]}, timeout=15)
        assert r.status_code == 200 and "token" in r.json()

    def test_login_wrong(self, session, new_user_token):
        r = session.post(f"{API}/auth/login", json={
            "email": new_user_token["email"], "password": "nope"}, timeout=15)
        assert r.status_code == 401

    def test_me_no_auth(self, session):
        r = session.get(f"{API}/auth/me", timeout=15)
        assert r.status_code in (401, 403)

    def test_me_with_token(self, session, auth_headers, new_user_token):
        r = session.get(f"{API}/auth/me", headers=auth_headers, timeout=15)
        assert r.status_code == 200 and r.json()["email"] == new_user_token["email"]

    def test_demo_login(self, session):
        """Demo user should exist per test_credentials.md"""
        r = session.post(f"{API}/auth/login", json={
            "email": "demo@therapishots.app", "password": "secret123"}, timeout=15)
        # Skip if demo user hasn't been seeded in this env
        if r.status_code != 200:
            pytest.skip(f"demo user not seeded: {r.status_code}")
        assert "token" in r.json()


# ---------- check-ins (NEW: allow multiple/day) ----------
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
        # NEW behaviour: each call appends a separate entry.
        before = session.get(f"{API}/today", headers=auth_headers, timeout=15).json()
        before_count = before.get("todays_count", 0)

        r1 = session.post(f"{API}/checkins", headers=auth_headers, json={
            "mood": "anxious", "context": [], "note": "n1", "timezone": "UTC"}, timeout=15)
        r2 = session.post(f"{API}/checkins", headers=auth_headers, json={
            "mood": "calm", "context": ["exercise"], "note": "n2", "timezone": "UTC"}, timeout=15)
        assert r1.status_code == 200 and r2.status_code == 200
        assert r2.json()["todays_count"] >= before_count + 2

        t = session.get(f"{API}/today", headers=auth_headers, timeout=15).json()
        assert t["todays_count"] >= before_count + 2
        assert isinstance(t["todays_entries"], list) and len(t["todays_entries"]) >= 2
        # entries ordered by created_at asc — last one is latest
        assert t["todays_mood"] == t["todays_entries"][-1]["mood"] == "calm"
        # each entry has required fields
        first = t["todays_entries"][0]
        for k in ("mood", "created_at", "context"):
            assert k in first

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
        # Each entry has date + mood (mood may be None for empty days)
        for entry in d["daily_moods"]:
            assert "date" in entry and "mood" in entry
        # today's daily_mood should reflect LAST check-in (calm from prior test)
        today_str = date.today().isoformat()
        today_entry = next(e for e in d["daily_moods"] if e["date"] == today_str)
        assert today_entry["mood"] in ("calm", "hopeful", "anxious", "heavy")  # last-of-day

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


# ---------- NEW: psychologists ----------
class TestPsychologists:
    def test_list_all(self, session, auth_headers):
        r = session.get(f"{API}/psychologists", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        items = r.json()["psychologists"]
        assert isinstance(items, list) and len(items) >= 3
        p = items[0]
        for k in ("id", "name", "languages", "session_types", "price"):
            assert k in p
        # ensure Mongo _id not leaked
        assert "_id" not in p

    def test_list_filter_by_language(self, session, auth_headers):
        r = session.get(f"{API}/psychologists?language=English", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        for p in r.json()["psychologists"]:
            assert "English" in p["languages"]

    def test_get_by_id_with_availability(self, session, auth_headers):
        lst = session.get(f"{API}/psychologists", headers=auth_headers, timeout=15).json()["psychologists"]
        pid = lst[0]["id"]
        r = session.get(f"{API}/psychologists/{pid}", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == pid
        assert isinstance(d["availability"], list) and len(d["availability"]) > 0
        slot = d["availability"][0]
        for k in ("id", "date", "time", "label"):
            assert k in slot

    def test_get_by_id_404(self, session, auth_headers):
        r = session.get(f"{API}/psychologists/507f1f77bcf86cd799439011", headers=auth_headers, timeout=15)
        assert r.status_code == 404

    def test_requires_auth(self, session):
        r = session.get(f"{API}/psychologists", timeout=15)
        assert r.status_code in (401, 403)


# ---------- NEW: bookings ----------
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
        assert b["slot_id"] == slot["id"]
        assert "id" in b and "_id" not in b
        # verify persistence via list
        lst = session.get(f"{API}/bookings", headers=auth_headers, timeout=15)
        assert lst.status_code == 200
        assert any(x["id"] == b["id"] for x in lst.json()["bookings"])

    def test_invalid_slot_400(self, session, auth_headers):
        p, _ = self._first_psych_with_slot(session, auth_headers)
        r = session.post(f"{API}/bookings", headers=auth_headers, json={
            "psychologist_id": p["id"], "slot_id": "1999-01-01T09:00",
            "session_type": p["session_types"][0]}, timeout=15)
        assert r.status_code == 400

    def test_invalid_session_type_400(self, session, auth_headers):
        p, slot = self._first_psych_with_slot(session, auth_headers)
        r = session.post(f"{API}/bookings", headers=auth_headers, json={
            "psychologist_id": p["id"], "slot_id": slot["id"],
            "session_type": "Telepathy"}, timeout=15)
        assert r.status_code == 400

    def test_invalid_psychologist_404(self, session, auth_headers):
        r = session.post(f"{API}/bookings", headers=auth_headers, json={
            "psychologist_id": "507f1f77bcf86cd799439011",
            "slot_id": "2099-01-01T10:00", "session_type": "Video"}, timeout=15)
        assert r.status_code == 404

    def test_cancel_booking(self, session, auth_headers):
        p, slot = self._first_psych_with_slot(session, auth_headers)
        # pick a different slot from the earlier test
        detail = session.get(f"{API}/psychologists/{p['id']}", headers=auth_headers, timeout=15).json()
        slot = detail["availability"][-1]
        r = session.post(f"{API}/bookings", headers=auth_headers, json={
            "psychologist_id": p["id"], "slot_id": slot["id"],
            "session_type": p["session_types"][0]}, timeout=15)
        assert r.status_code == 200
        bid = r.json()["booking"]["id"]
        rc = session.post(f"{API}/bookings/{bid}/cancel", headers=auth_headers, timeout=15)
        assert rc.status_code == 200 and rc.json()["status"] == "cancelled"
        # verify in list
        lst = session.get(f"{API}/bookings", headers=auth_headers, timeout=15).json()["bookings"]
        row = next(x for x in lst if x["id"] == bid)
        assert row["status"] == "cancelled"

    def test_cancel_missing_404(self, session, auth_headers):
        r = session.post(f"{API}/bookings/507f1f77bcf86cd799439011/cancel", headers=auth_headers, timeout=15)
        assert r.status_code == 404


# ---------- auth enforcement ----------
class TestAuthEnforcement:
    @pytest.mark.parametrize("path,method", [
        ("/today", "GET"), ("/insights", "GET"), ("/pulse", "GET"),
        ("/progress", "GET"), ("/psychologists", "GET"), ("/bookings", "GET"),
    ])
    def test_endpoint_requires_auth(self, session, path, method):
        r = session.request(method, f"{API}{path}", timeout=15)
        assert r.status_code in (401, 403)

"""TherapiShots backend API tests - end-to-end coverage of all endpoints."""
import os
import uuid
import pytest
import requests
from datetime import date, timedelta

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://emotional-baseline.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def new_user_token(session):
    """Create a fresh user (seeds 42 days history) and return token+user."""
    uniq = uuid.uuid4().hex[:8]
    email = f"test_{uniq}@therapishots.app"
    payload = {
        "email": email,
        "password": "secret123",
        "name": "Test User",
        "date_of_birth": "1995-05-01",
        "language": "en",
    }
    r = session.post(f"{API}/auth/register", json=payload, timeout=30)
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    assert data["user"]["email"] == email
    return {"token": data["token"], "user": data["user"], "email": email, "password": "secret123"}


@pytest.fixture
def auth_headers(new_user_token):
    return {"Content-Type": "application/json", "Authorization": f"Bearer {new_user_token['token']}"}


# --------------------- health / config --------------------- #
class TestPublic:
    def test_root(self, session):
        r = session.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_config(self, session):
        r = session.get(f"{API}/config", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert len(d["moods"]) == 9
        assert "context_tags" in d and len(d["context_tags"]) >= 10
        assert "small_steps" in d and len(d["small_steps"]) >= 5
        assert "consent_keys" in d


# --------------------- auth --------------------- #
class TestAuth:
    def test_register_rejects_under_18(self, session):
        under = date.today() - timedelta(days=365 * 10)
        r = session.post(f"{API}/auth/register", json={
            "email": f"test_u18_{uuid.uuid4().hex[:6]}@example.com",
            "password": "secret123", "name": "Kid",
            "date_of_birth": under.isoformat(), "language": "en",
        }, timeout=15)
        assert r.status_code == 422, f"Expected 422 got {r.status_code}: {r.text}"

    def test_register_rejects_short_password(self, session):
        r = session.post(f"{API}/auth/register", json={
            "email": f"test_sp_{uuid.uuid4().hex[:6]}@example.com",
            "password": "12345", "name": "X",
            "date_of_birth": "1990-01-01", "language": "en",
        }, timeout=15)
        assert r.status_code == 422

    def test_register_duplicate(self, session, new_user_token):
        r = session.post(f"{API}/auth/register", json={
            "email": new_user_token["email"], "password": "secret123",
            "name": "Dup", "date_of_birth": "1990-01-01", "language": "en",
        }, timeout=15)
        assert r.status_code == 400

    def test_login_success(self, session, new_user_token):
        r = session.post(f"{API}/auth/login", json={
            "email": new_user_token["email"], "password": new_user_token["password"]
        }, timeout=15)
        assert r.status_code == 200
        assert "token" in r.json()

    def test_login_wrong_password(self, session, new_user_token):
        r = session.post(f"{API}/auth/login", json={
            "email": new_user_token["email"], "password": "wrongpass"
        }, timeout=15)
        assert r.status_code == 401

    def test_me_requires_auth(self, session):
        r = session.get(f"{API}/auth/me", timeout=15)
        assert r.status_code in (401, 403)

    def test_me_with_token(self, session, auth_headers, new_user_token):
        r = session.get(f"{API}/auth/me", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == new_user_token["email"]
        assert "consents" in d
        # defaults
        assert d["consents"].get("ai_summaries") is False
        assert d["consents"].get("personal_insights") is True

    def test_invalid_token(self, session):
        r = session.get(f"{API}/auth/me", headers={"Authorization": "Bearer bogus.token"}, timeout=15)
        assert r.status_code == 401


# --------------------- check-ins --------------------- #
class TestCheckins:
    def test_create_checkin_and_persist(self, session, auth_headers):
        r = session.post(f"{API}/checkins", headers=auth_headers, json={
            "mood": "hopeful", "context": ["work", "sleep"], "note": "Feeling ok",
            "timezone": "UTC"
        }, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["checkin"]["mood"] == "hopeful"
        assert d["low_mood"] is False
        # GET today
        r2 = session.get(f"{API}/checkins/today", headers=auth_headers, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["checkin"]["mood"] == "hopeful"

    def test_low_mood_flag(self, session, auth_headers):
        r = session.post(f"{API}/checkins", headers=auth_headers, json={
            "mood": "heavy", "context": [], "note": None, "timezone": "UTC"
        }, timeout=15)
        assert r.status_code == 200
        assert r.json()["low_mood"] is True

    def test_replace_today_checkin(self, session, auth_headers):
        # Third one should replace previous today
        r = session.post(f"{API}/checkins", headers=auth_headers, json={
            "mood": "calm", "context": ["exercise"], "note": "replace test",
            "timezone": "UTC"
        }, timeout=15)
        assert r.status_code == 200
        r2 = session.get(f"{API}/checkins/today", headers=auth_headers, timeout=15)
        assert r2.json()["checkin"]["mood"] == "calm"

    def test_unknown_mood(self, session, auth_headers):
        r = session.post(f"{API}/checkins", headers=auth_headers, json={
            "mood": "notamood", "context": [], "timezone": "UTC"
        }, timeout=15)
        assert r.status_code == 400

    def test_list_checkins(self, session, auth_headers):
        r = session.get(f"{API}/checkins", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        items = r.json()["checkins"]
        # 42-day seed had 82% chance days + today's replacement => should be plenty
        assert len(items) >= 20

    def test_feedback(self, session, auth_headers):
        r = session.post(f"{API}/feedback", headers=auth_headers, json={
            "insight_key": "mood_sleep_minutes", "response": "yes"
        }, timeout=15)
        assert r.status_code == 200


# --------------------- today / insights / pulse / progress --------------------- #
class TestToday:
    def test_today(self, session, auth_headers):
        r = session.get(f"{API}/today", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        for key in ("greeting", "signals", "small_step", "low_mood_journey"):
            assert key in d
        assert d["signals"]["sleep"]["minutes"] > 0
        assert d["signals"]["steps"]["value"] > 0

    def test_insights(self, session, auth_headers):
        r = session.get(f"{API}/insights", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "insights" in d and "baseline" in d
        base = d["baseline"]
        assert base["mood"] is not None
        assert base["checkin_count"] >= 10
        ins = d["insights"]
        for cat in ("helps", "harder", "notice", "context"):
            assert cat in ins
        # With 42 days seeded, some insights should surface
        total = sum(len(ins[c]) for c in ins)
        assert total >= 1, "Expected at least one insight from seeded history"

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
        assert len(d["mood_series"]) == 30
        assert len(d["feel_map"]) == 42
        assert "month_checkin_count" in d


# --------------------- story --------------------- #
class TestStory:
    def test_story_week_no_ai_by_default(self, session, auth_headers):
        r = session.get(f"{API}/story?period=week", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["template"] and isinstance(d["template"], str)
        # ai_summaries default = False -> ai_text should be None
        assert d["ai_text"] is None
        assert d["used_ai"] is False

    def test_story_month(self, session, auth_headers):
        r = session.get(f"{API}/story?period=month", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        assert r.json()["facts"]["period"] == "month"


# --------------------- me/consents / language / export / delete --------------------- #
class TestMe:
    def test_update_language(self, session, auth_headers):
        r = session.put(f"{API}/me/language", headers=auth_headers, json={"language": "hi"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["language"] == "hi"

    def test_update_consents(self, session, auth_headers):
        r = session.put(f"{API}/me/consents", headers=auth_headers,
                        json={"consents": {"ai_summaries": True, "analytics": True}}, timeout=15)
        assert r.status_code == 200
        c = r.json()["consents"]
        assert c["ai_summaries"] is True
        assert c["analytics"] is True

    def test_export(self, session, auth_headers):
        r = session.get(f"{API}/me/export", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "user" in d and "checkins" in d and "health_days" in d

    def test_delete_mood_scope(self, session, auth_headers):
        r = session.delete(f"{API}/me/data?scope=mood", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        assert r.json()["deleted"] == "mood"
        r2 = session.get(f"{API}/checkins", headers=auth_headers, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["checkins"] == []


# --------------------- auth enforcement --------------------- #
class TestAuthEnforcement:
    @pytest.mark.parametrize("path,method", [
        ("/today", "GET"),
        ("/insights", "GET"),
        ("/pulse", "GET"),
        ("/progress", "GET"),
        ("/story", "GET"),
        ("/checkins", "GET"),
        ("/checkins/today", "GET"),
        ("/me/export", "GET"),
    ])
    def test_endpoint_requires_auth(self, session, path, method):
        r = session.request(method, f"{API}{path}", timeout=15)
        assert r.status_code in (401, 403), f"{path} allowed anonymous access"

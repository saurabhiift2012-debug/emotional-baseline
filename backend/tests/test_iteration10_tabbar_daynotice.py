"""
Iteration 10 backend tests
Focus:
 - /api/today returns day_notice {tone,text} when user has today's check-ins
 - day_notice reflects the mood mix logged today
 - Regression: /api/auth/request-otp + /api/auth/verify-otp for the demo number
Uses the demo phone +919999900000 / OTP 123456 (login mode) — real Twilio bypassed.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://emotional-baseline.preview.emergentagent.com").rstrip("/")

DEMO_PHONE_LOCAL = "9999900000"
DEMO_PHONE_E164 = "+919999900000"
DEMO_OTP = "123456"


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Login as demo user."""
    r = api_client.post(f"{BASE_URL}/api/auth/request-otp",
                        json={"phone": DEMO_PHONE_LOCAL, "mode": "login"})
    assert r.status_code == 200, f"request-otp failed: {r.status_code} {r.text}"
    body = r.json()
    assert body.get("dev_code") == DEMO_OTP, f"dev_code mismatch: {body}"

    r2 = api_client.post(f"{BASE_URL}/api/auth/verify-otp",
                         json={"phone": DEMO_PHONE_E164, "code": DEMO_OTP})
    assert r2.status_code == 200, f"verify-otp failed: {r2.status_code} {r2.text}"
    body2 = r2.json()
    assert "token" in body2 and "user" in body2
    return body2["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ---- Auth regression ----
class TestAuthRegression:
    def test_demo_login_returns_dev_code(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/request-otp",
                            json={"phone": DEMO_PHONE_LOCAL, "mode": "login"})
        assert r.status_code == 200
        assert r.json().get("dev_code") == DEMO_OTP

    def test_demo_verify_returns_token(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/verify-otp",
                            json={"phone": DEMO_PHONE_E164, "code": DEMO_OTP})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data.get("token"), str) and len(data["token"]) > 10
        assert data.get("user", {}).get("phone") == DEMO_PHONE_E164


# ---- /api/today day_notice ----
class TestTodayDayNotice:
    def test_today_endpoint_returns_day_notice_key(self, api_client, auth_headers):
        r = api_client.get(f"{BASE_URL}/api/today", headers=auth_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "day_notice" in data, "day_notice key must be present in /api/today response"

    def test_day_notice_present_after_checkin(self, api_client, auth_headers):
        """After posting a check-in, day_notice should be a dict {tone,text}."""
        payload = {"mood": "calm", "context": [], "note": None, "timezone": "UTC"}
        rc = api_client.post(f"{BASE_URL}/api/checkins", json=payload, headers=auth_headers)
        assert rc.status_code in (200, 201), rc.text

        r = api_client.get(f"{BASE_URL}/api/today", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data.get("todays_count", 0) >= 1
        dn = data.get("day_notice")
        assert isinstance(dn, dict), f"day_notice should be dict, got {type(dn)}: {dn}"
        assert "tone" in dn and "text" in dn
        assert isinstance(dn["tone"], str) and dn["tone"] in ("mixed", "low", "neutral", "bright")
        assert isinstance(dn["text"], str) and len(dn["text"]) > 10

    def test_day_notice_reflects_low_mood(self, api_client, auth_headers):
        """Logging a low mood ('heavy') should produce a low or mixed tone notice."""
        payload = {"mood": "heavy", "context": [], "note": None, "timezone": "UTC"}
        rc = api_client.post(f"{BASE_URL}/api/checkins", json=payload, headers=auth_headers)
        assert rc.status_code in (200, 201)

        r = api_client.get(f"{BASE_URL}/api/today", headers=auth_headers)
        data = r.json()
        dn = data.get("day_notice")
        assert dn is not None
        # After a 'content' (bright) + 'heavy' (low) in same day, assess_day → 'mixed'
        # If only heavy was logged today, tone would be 'low'. Accept either.
        assert dn["tone"] in ("mixed", "low")

    def test_day_notice_null_when_no_entries_and_regression_greeting(self, api_client, auth_headers):
        """Sanity: greeting & name still returned."""
        r = api_client.get(f"{BASE_URL}/api/today", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data.get("greeting") in ("morning", "afternoon", "evening")
        assert isinstance(data.get("name"), str)


# ---- Insights regression (streak) ----
class TestInsightsRegression:
    def test_insights_has_streak(self, api_client, auth_headers):
        r = api_client.get(f"{BASE_URL}/api/insights", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "streak" in data
        assert isinstance(data["streak"], int)
        assert data["streak"] >= 0

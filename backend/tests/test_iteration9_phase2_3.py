"""Iteration 9 backend tests — Phase 2 + Phase 3 additions.

Covers:
- GET /api/insights includes numeric `streak` field (>0 for demo account).
- POST /api/auth/request-otp mode=register 400s when emergency_contact_* missing.
- POST /api/auth/request-otp mode=register 400s when agreement_accepted is missing/false.
- POST /api/auth/request-otp mode=login still works for demo (returns dev_code).
- POST /api/auth/verify-otp demo returns token + user.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://emotional-baseline.preview.emergentagent.com").rstrip("/")

DEMO_PHONE = "9999900000"      # 10-digit form; backend normalises to +91
DEMO_PHONE_E164 = "+919999900000"
DEMO_CODE = "123456"
# Non-demo, non-existing Indian number so validation runs *before* SMS is attempted.
NEW_PHONE = "9876500000"


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---- Demo login flow (unchanged) --------------------------------------------
class TestDemoLogin:
    def test_request_otp_login_demo(self, api):
        r = api.post(f"{BASE_URL}/api/auth/request-otp",
                     json={"phone": DEMO_PHONE, "mode": "login"})
        # 429 possible from cooldown if run repeatedly quickly – accept it.
        assert r.status_code in (200, 429), r.text
        if r.status_code == 200:
            assert r.json().get("dev_code") == DEMO_CODE

    def test_verify_otp_demo_returns_token_and_user(self, api):
        # ensure a fresh OTP record exists
        api.post(f"{BASE_URL}/api/auth/request-otp",
                 json={"phone": DEMO_PHONE, "mode": "login"})
        r = api.post(f"{BASE_URL}/api/auth/verify-otp",
                     json={"phone": DEMO_PHONE_E164, "code": DEMO_CODE})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and data["token"]
        assert "user" in data
        assert data["user"].get("phone") == DEMO_PHONE_E164
        assert data["user"].get("name")

    def test_insights_streak_field_for_demo(self, api):
        # Log in first
        api.post(f"{BASE_URL}/api/auth/request-otp",
                 json={"phone": DEMO_PHONE, "mode": "login"})
        tok_r = api.post(f"{BASE_URL}/api/auth/verify-otp",
                         json={"phone": DEMO_PHONE_E164, "code": DEMO_CODE})
        assert tok_r.status_code == 200, tok_r.text
        token = tok_r.json()["token"]

        r = requests.get(f"{BASE_URL}/api/insights",
                         headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert "streak" in body, f"streak field missing: {body.keys()}"
        streak = body["streak"]
        assert isinstance(streak, int), f"streak not int: {type(streak)}"
        # Demo account is seeded with ~42 days of history w/ 82% probability per day,
        # so a positive streak (ending yesterday or today) is expected.
        assert streak > 0, f"expected streak>0 for seeded demo account, got {streak}"


# ---- Register-mode validation gates (no SMS sent because validation fails) --
class TestRegisterValidation:
    BASE_REG = {
        "phone": NEW_PHONE,
        "mode": "register",
        "name": "Test User",
        "date_of_birth": "1995-05-20",
        "language": "en",
    }

    def test_missing_emergency_contact_returns_400(self, api):
        payload = {**self.BASE_REG, "agreement_accepted": True}
        # no emergency_contact_* fields at all
        r = api.post(f"{BASE_URL}/api/auth/request-otp", json=payload)
        assert r.status_code == 400, r.text
        assert "emergency contact" in r.json().get("detail", "").lower()

    def test_partial_emergency_contact_returns_400(self, api):
        payload = {**self.BASE_REG,
                   "emergency_contact_name": "Riya Sharma",
                   # missing relationship + phone
                   "agreement_accepted": True}
        r = api.post(f"{BASE_URL}/api/auth/request-otp", json=payload)
        assert r.status_code == 400, r.text
        assert "emergency contact" in r.json().get("detail", "").lower()

    def test_missing_agreement_returns_400(self, api):
        payload = {**self.BASE_REG,
                   "emergency_contact_name": "Riya Sharma",
                   "emergency_contact_relationship": "friend",
                   "emergency_contact_phone": "9876543210"}
        # agreement_accepted absent
        r = api.post(f"{BASE_URL}/api/auth/request-otp", json=payload)
        assert r.status_code == 400, r.text
        assert "agreement" in r.json().get("detail", "").lower()

    def test_agreement_false_returns_400(self, api):
        payload = {**self.BASE_REG,
                   "emergency_contact_name": "Riya Sharma",
                   "emergency_contact_relationship": "friend",
                   "emergency_contact_phone": "9876543210",
                   "agreement_accepted": False}
        r = api.post(f"{BASE_URL}/api/auth/request-otp", json=payload)
        assert r.status_code == 400, r.text
        assert "agreement" in r.json().get("detail", "").lower()

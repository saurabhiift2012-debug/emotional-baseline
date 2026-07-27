"""Iteration 14 — registration mandatory-consents flow.

Verifies:
- request-otp (register mode) rejects missing agreement_accepted (400)
- request-otp (register mode) succeeds for TEST_PHONES bypass (+919999900002)
  and returns dev_code
- verify-otp creates the user with agreement.consents containing all 5 flags
  plus terms_version and privacy_version
- demo login regression (+919999900000 / 123456)
"""
import os
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
load_dotenv("/app/backend/.env")

BASE_URL = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL") or "").rstrip("/")
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL must be set"

QA_PHONE_10 = "9999900002"      # TEST_PHONES bypass
QA_PHONE_E164 = "+91" + QA_PHONE_10
DEMO_PHONE_10 = "9999900000"
DEMO_PHONE_E164 = "+91" + DEMO_PHONE_10
OTP_CODE = "123456"


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---- Demo login regression ---------------------------------------------
class TestDemoLogin:
    def test_demo_login_request_and_verify(self, api):
        r = api.post(f"{BASE_URL}/api/auth/request-otp",
                     json={"phone": DEMO_PHONE_10, "mode": "login"})
        assert r.status_code == 200, r.text
        assert r.json().get("dev_code") == OTP_CODE

        r = api.post(f"{BASE_URL}/api/auth/verify-otp",
                     json={"phone": DEMO_PHONE_E164, "code": OTP_CODE})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and "user" in data
        assert data["user"]["phone"] == DEMO_PHONE_E164


# ---- Register: missing consent should be rejected ----------------------
class TestRegisterRejects:
    def _base_payload(self):
        return {
            "phone": QA_PHONE_10,
            "mode": "register",
            "name": "QA Tester",
            "date_of_birth": "1990-08-15",
            "language": "en",
            "emergency_contact_name": "Emergency Contact",
            "emergency_contact_relationship": "friend",
            "emergency_contact_phone": "+919888877777",
            "consents": {"age18": True, "terms": True, "privacy": True,
                         "notMedical": True, "dataProcessing": True,
                         "terms_version": "1.0", "privacy_version": "1.0"},
        }

    def test_missing_agreement_accepted_returns_400(self, api):
        payload = self._base_payload()
        payload["agreement_accepted"] = False
        r = api.post(f"{BASE_URL}/api/auth/request-otp", json=payload)
        # Either "already registered" from prior runs, or "safety agreement" 400
        if r.status_code == 400 and "already registered" in r.text.lower():
            pytest.skip("QA phone already registered from a prior run")
        assert r.status_code == 400, r.text

    def test_missing_emergency_contact_returns_400(self, api):
        payload = self._base_payload()
        payload["agreement_accepted"] = True
        payload["emergency_contact_name"] = None
        r = api.post(f"{BASE_URL}/api/auth/request-otp", json=payload)
        if r.status_code == 400 and "already registered" in r.text.lower():
            pytest.skip("QA phone already registered from a prior run")
        assert r.status_code == 400, r.text


# ---- Register happy path: full consent flow ----------------------------
class TestRegisterHappyPath:
    def test_register_and_verify_stores_full_consents(self, api):
        payload = {
            "phone": QA_PHONE_10,
            "mode": "register",
            "name": "QA Tester",
            "date_of_birth": "1990-08-15",
            "email": "qa@example.com",
            "language": "en",
            "emergency_contact_name": "Emergency Contact",
            "emergency_contact_relationship": "friend",
            "emergency_contact_phone": "+919888877777",
            "agreement_accepted": True,
            "consents": {"age18": True, "terms": True, "privacy": True,
                         "notMedical": True, "dataProcessing": True,
                         "terms_version": "1.0", "privacy_version": "1.0"},
        }
        r = api.post(f"{BASE_URL}/api/auth/request-otp", json=payload)
        already_registered = r.status_code == 400 and "already registered" in r.text.lower()
        if already_registered:
            # Fall back to login path to still verify persistence from a prior run.
            r = api.post(f"{BASE_URL}/api/auth/request-otp",
                         json={"phone": QA_PHONE_10, "mode": "login"})
            assert r.status_code == 200, r.text
        else:
            assert r.status_code == 200, r.text
            assert r.json().get("dev_code") == OTP_CODE

        v = api.post(f"{BASE_URL}/api/auth/verify-otp",
                     json={"phone": QA_PHONE_E164, "code": OTP_CODE})
        assert v.status_code == 200, v.text
        data = v.json()
        token = data["token"]
        user_public = data["user"]
        assert user_public["phone"] == QA_PHONE_E164

        # Fetch /auth/me to inspect stored agreement.consents
        r = api.get(f"{BASE_URL}/api/auth/me",
                    headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200, r.text
        me = r.json()

        # agreement may be nested under 'agreement' or exposed at top level
        agreement = me.get("agreement") or {}
        consents = agreement.get("consents") or me.get("consents") or {}

        if already_registered and not consents:
            pytest.skip("User pre-existed without full consents; cannot re-verify persistence here")

        # 5 mandatory consent flags must all be present and true
        for k in ("age18", "terms", "privacy", "notMedical", "dataProcessing"):
            assert consents.get(k) is True, f"missing/false consent: {k} in {consents}"
        # version stamps
        assert consents.get("terms_version") == "1.0", consents
        assert consents.get("privacy_version") == "1.0", consents


if __name__ == "__main__":
    import sys
    sys.exit(pytest.main([__file__, "-v", "--tb=short"]))

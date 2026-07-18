"""Tests for GET /api/downloads/mood-clinical-review (public download endpoint)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
if not BASE_URL:
    # Fall back to reading frontend/.env directly if not exported
    env_path = "/app/frontend/.env"
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
BASE_URL = (BASE_URL or "").rstrip("/")

ENDPOINT = f"{BASE_URL}/api/downloads/mood-clinical-review"
EXPECTED_CT = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
EXPECTED_FILENAME = "TherapiShots_Mood_Clinical_Review.docx"


@pytest.fixture(scope="module")
def response():
    """Fetch the endpoint once without any auth header."""
    assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL must be set"
    # Use a fresh session with no default auth headers.
    s = requests.Session()
    r = s.get(ENDPOINT, timeout=30)
    return r


# --- Status & auth checks ---
def test_status_200(response):
    assert response.status_code == 200, f"Expected 200, got {response.status_code} - body: {response.text[:200]}"


def test_public_no_auth_required():
    """Ensure endpoint is publicly accessible - explicitly no Authorization header."""
    r = requests.get(ENDPOINT, timeout=30, headers={})
    assert r.status_code == 200, f"Public access failed: {r.status_code}"
    # Also try with an invalid auth header - should still work (public endpoint)
    r2 = requests.get(ENDPOINT, timeout=30, headers={"Authorization": "Bearer invalidtoken"})
    assert r2.status_code == 200, f"Endpoint should ignore auth header, got {r2.status_code}"


# --- Headers ---
def test_content_type_is_docx(response):
    ct = response.headers.get("Content-Type", "")
    assert EXPECTED_CT in ct, f"Wrong Content-Type: {ct}"


def test_content_disposition_attachment(response):
    cd = response.headers.get("Content-Disposition", "")
    assert "attachment" in cd.lower(), f"Missing attachment disposition: {cd}"
    assert EXPECTED_FILENAME in cd, f"Filename not present in Content-Disposition: {cd}"


# --- Body validity ---
def test_body_size_greater_than_10kb(response):
    size = len(response.content)
    assert size > 10 * 1024, f"Body too small: {size} bytes"


def test_body_is_valid_docx_pk_signature(response):
    # .docx is a ZIP - must start with PK\x03\x04
    assert response.content[:4] == b"PK\x03\x04", (
        f"Body does not start with PK zip signature. First bytes: {response.content[:8]!r}"
    )


def test_body_matches_source_file_size(response):
    src_size = os.path.getsize("/app/TherapiShots_Mood_Clinical_Review.docx")
    assert len(response.content) == src_size, (
        f"Downloaded size {len(response.content)} != source size {src_size}"
    )

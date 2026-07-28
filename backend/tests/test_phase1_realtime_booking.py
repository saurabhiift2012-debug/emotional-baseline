"""Phase-1 realtime booking + psychologist mode + admin doctor CRUD tests.

Covers the review-request scope:
- Slot double-book prevention (409)
- Idempotency (same booking_id for same key)
- Psychologist role gating (403 for user, 200 for psy) + accept/decline/reschedule
- Notification audit entries (in_app success, push failure expected)
- Notifications endpoints (list, unread-count, read-all)
- Admin psychologist CRUD (+ psy user account linkage) and public listing
"""
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

import pytest
import requests
from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient

# Load env
load_dotenv(Path("/app/frontend/.env"))
load_dotenv(Path("/app/backend/.env"))

BASE_URL = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ["EXPO_BACKEND_URL"]).rstrip("/")
API = f"{BASE_URL}/api"

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
mclient = MongoClient(MONGO_URL)
mdb = mclient[DB_NAME]

DEMO_PHONE = "+919999900000"
PSY_PHONE = "+919999900001"
ADMIN_PASSCODE = os.environ.get("ADMIN_PASSCODE", "Kanha@1983")


# ---------------- helpers ---------------------------------------------------

def _login(phone: str) -> dict:
    digits = phone.replace("+91", "")
    r = requests.post(f"{API}/auth/request-otp", json={"phone": digits, "mode": "login"}, timeout=30)
    assert r.status_code == 200, r.text
    dev_code = r.json().get("dev_code") or "123456"
    r = requests.post(f"{API}/auth/verify-otp", json={"phone": phone, "code": dev_code}, timeout=30)
    assert r.status_code == 200, r.text
    j = r.json()
    return {"token": j["token"], "user": j["user"]}


def _auth(tok: str) -> dict:
    return {"Authorization": f"Bearer {tok}"}


# ---------------- fixtures --------------------------------------------------

@pytest.fixture(scope="module")
def demo():
    return _login(DEMO_PHONE)


@pytest.fixture(scope="module")
def psy():
    return _login(PSY_PHONE)


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/admin/auth", json={"passcode": ADMIN_PASSCODE}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["admin_token"]


@pytest.fixture(scope="module")
def ruchi_pid(demo):
    r = requests.get(f"{API}/psychologists", headers=_auth(demo["token"]), timeout=15)
    assert r.status_code == 200, r.text
    for p in r.json()["psychologists"]:
        if p.get("slug") == "ruchi-sharma":
            return p["id"]
    pytest.skip("Dr Ruchi Sharma profile not seeded")


# ---------------- module 1: slot 409 + idempotency -------------------------

class TestBookingOrder:
    def _slot(self, demo, pid):
        r = requests.get(f"{API}/psychologists/{pid}", headers=_auth(demo["token"]), timeout=15)
        assert r.status_code == 200, r.text
        slots = r.json().get("availability") or []
        assert slots, "No availability returned for Dr Ruchi"
        return slots[0]["id"]

    def test_double_book_409(self, demo, ruchi_pid):
        slot_id = self._slot(demo, ruchi_pid)
        payload = {"psychologist_id": ruchi_pid, "slot_id": slot_id,
                   "session_type": "15-min Call",
                   "idempotency_key": f"TEST_{uuid.uuid4().hex}"}
        r1 = requests.post(f"{API}/bookings/order", json=payload,
                           headers=_auth(demo["token"]), timeout=30)
        assert r1.status_code == 200, r1.text
        b1 = r1.json()["booking_id"]

        # 2nd try with different idempotency_key → same slot → 409
        payload2 = dict(payload)
        payload2["idempotency_key"] = f"TEST_{uuid.uuid4().hex}"
        r2 = requests.post(f"{API}/bookings/order", json=payload2,
                           headers=_auth(demo["token"]), timeout=30)
        assert r2.status_code == 409, f"Expected 409, got {r2.status_code}: {r2.text}"

        # cleanup created booking + lock so we don't leak
        try:
            mdb.bookings.delete_one({"_id": ObjectId(b1)})
            mdb.slot_locks.delete_one({"psychologist_id": ruchi_pid, "slot_id": slot_id})
        except Exception:
            pass

    def test_idempotency_returns_same_booking(self, demo, ruchi_pid):
        slot_id = self._slot(demo, ruchi_pid)
        key = f"TEST_{uuid.uuid4().hex}"
        payload = {"psychologist_id": ruchi_pid, "slot_id": slot_id,
                   "session_type": "15-min Call", "idempotency_key": key}
        r1 = requests.post(f"{API}/bookings/order", json=payload,
                           headers=_auth(demo["token"]), timeout=30)
        assert r1.status_code == 200, r1.text
        b1 = r1.json()["booking_id"]
        r2 = requests.post(f"{API}/bookings/order", json=payload,
                           headers=_auth(demo["token"]), timeout=30)
        assert r2.status_code == 200, r2.text
        b2 = r2.json()["booking_id"]
        assert b1 == b2, f"Idempotency failed: {b1} vs {b2}"

        # cleanup
        try:
            mdb.bookings.delete_one({"_id": ObjectId(b1)})
            mdb.slot_locks.delete_one({"psychologist_id": ruchi_pid, "slot_id": slot_id})
        except Exception:
            pass


# ---------------- module 2: psychologist role gating -----------------------

class TestPsyGating:
    def test_user_forbidden_on_psy_bookings(self, demo):
        r = requests.get(f"{API}/psy/bookings", headers=_auth(demo["token"]), timeout=15)
        assert r.status_code == 403, r.text

    def test_user_forbidden_on_accept(self, demo):
        r = requests.post(f"{API}/psy/bookings/000000000000000000000000/accept",
                          headers=_auth(demo["token"]), timeout=15)
        assert r.status_code == 403, r.text

    def test_user_forbidden_on_decline(self, demo):
        r = requests.post(f"{API}/psy/bookings/000000000000000000000000/decline",
                          headers=_auth(demo["token"]), timeout=15)
        assert r.status_code == 403, r.text

    def test_user_forbidden_on_reschedule(self, demo):
        r = requests.post(f"{API}/psy/bookings/000000000000000000000000/reschedule",
                          headers=_auth(demo["token"]), json={"new_slot_id": "x"}, timeout=15)
        assert r.status_code == 403, r.text

    def test_psy_can_list_bookings(self, psy):
        r = requests.get(f"{API}/psy/bookings", headers=_auth(psy["token"]), timeout=15)
        assert r.status_code == 200, r.text
        assert "bookings" in r.json()

    def test_psy_me(self, psy):
        r = requests.get(f"{API}/psy/me", headers=_auth(psy["token"]), timeout=15)
        assert r.status_code == 200, r.text
        prof = r.json().get("psychologist")
        assert prof and prof.get("slug") == "ruchi-sharma"


# ---------------- module 3: accept/decline/reschedule -> notification+audit

def _seed_booking(demo_user_id: str, ruchi_pid: str, slot_suffix: str) -> tuple[str, dict]:
    """Insert an awaiting_confirmation booking + slot_lock directly (per review-request)."""
    # Use a synthetic slot_id we won't clash on; the reschedule test needs a
    # slot that gen_availability returns, so those use a *real* slot_id.
    slot_id = f"SEED-{slot_suffix}-{uuid.uuid4().hex[:6]}"
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "user_id": demo_user_id, "psychologist_id": ruchi_pid,
        "psychologist_name": "Dr. Ruchi Sharma",
        "slot_id": slot_id, "slot_label": "Seeded slot",
        "slot_date": "2099-01-01", "slot_time": "10:00",
        "session_type": "15-min Call", "price": 1000, "currency": "INR",
        "status": "awaiting_confirmation",
        "razorpay_order_id": f"ord_TEST_{uuid.uuid4().hex[:8]}",
        "idempotency_key": f"TEST_{uuid.uuid4().hex}",
        "status_history": [{"status": "awaiting_confirmation", "at": now}],
        "payment": {"status": "paid", "provider": "razorpay",
                    "amount": 1000, "currency": "INR"},
        "created_at": now,
    }
    res = mdb.bookings.insert_one(doc)
    bid = str(res.inserted_id)
    mdb.slot_locks.insert_one({"psychologist_id": ruchi_pid, "slot_id": slot_id,
                               "user_id": demo_user_id, "created_at": now})
    return bid, doc


class TestPsyActionsAndAudit:
    def test_accept_flow(self, demo, psy, ruchi_pid):
        bid, _ = _seed_booking(demo["user"]["id"], ruchi_pid, "accept")
        r = requests.post(f"{API}/psy/bookings/{bid}/accept",
                          headers=_auth(psy["token"]), timeout=30)
        assert r.status_code == 200, r.text
        b = r.json()["booking"]
        assert b["status"] == "accepted"

        # in-app notification created for user
        n = mdb.notifications.find_one({"user_id": demo["user"]["id"], "booking_id": bid,
                                         "type": "booking_accepted"})
        assert n is not None, "user did not receive booking_accepted notification"

        # audit: in_app=success, push=failure (placeholder push key)
        audits = list(mdb.notification_audit.find(
            {"user_id": demo["user"]["id"], "booking_id": bid}))
        by_channel = {a["channel"]: a["status"] for a in audits}
        assert by_channel.get("in_app") == "success", by_channel
        assert by_channel.get("push") == "failure", by_channel

        # cleanup
        mdb.bookings.delete_one({"_id": ObjectId(bid)})
        mdb.notifications.delete_many({"booking_id": bid})
        mdb.notification_audit.delete_many({"booking_id": bid})

    def test_decline_flow(self, demo, psy, ruchi_pid):
        bid, doc = _seed_booking(demo["user"]["id"], ruchi_pid, "decline")
        r = requests.post(f"{API}/psy/bookings/{bid}/decline",
                          headers=_auth(psy["token"]), timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["booking"]["status"] == "declined"

        # slot released
        lock = mdb.slot_locks.find_one({"psychologist_id": ruchi_pid, "slot_id": doc["slot_id"]})
        assert lock is None, "slot_lock should be released on decline"

        n = mdb.notifications.find_one({"user_id": demo["user"]["id"], "booking_id": bid,
                                         "type": "booking_declined"})
        assert n is not None

        # cleanup
        mdb.bookings.delete_one({"_id": ObjectId(bid)})
        mdb.notifications.delete_many({"booking_id": bid})
        mdb.notification_audit.delete_many({"booking_id": bid})

    def test_reschedule_flow(self, demo, psy, ruchi_pid):
        # Reschedule needs the new_slot_id to be in gen_availability
        # We first take the second real slot from the availability list.
        rr = requests.get(f"{API}/psychologists/{ruchi_pid}", headers=_auth(demo["token"]), timeout=15)
        slots = rr.json().get("availability") or []
        assert len(slots) >= 2
        # Pick a slot that isn't currently locked
        new_slot_id = None
        for s in slots:
            if not mdb.slot_locks.find_one({"psychologist_id": ruchi_pid, "slot_id": s["id"]}):
                new_slot_id = s["id"]; break
        assert new_slot_id, "no free slot to reschedule into"

        bid, doc = _seed_booking(demo["user"]["id"], ruchi_pid, "reschedule")
        r = requests.post(f"{API}/psy/bookings/{bid}/reschedule",
                          headers=_auth(psy["token"]),
                          json={"new_slot_id": new_slot_id}, timeout=30)
        assert r.status_code == 200, r.text
        b = r.json()["booking"]
        assert b["status"] == "rescheduled"
        assert b["slot_id"] == new_slot_id

        n = mdb.notifications.find_one({"user_id": demo["user"]["id"], "booking_id": bid,
                                         "type": "booking_rescheduled"})
        assert n is not None

        # cleanup: remove new lock + old lock (should already be gone) + booking
        mdb.slot_locks.delete_one({"psychologist_id": ruchi_pid, "slot_id": new_slot_id})
        mdb.slot_locks.delete_one({"psychologist_id": ruchi_pid, "slot_id": doc["slot_id"]})
        mdb.bookings.delete_one({"_id": ObjectId(bid)})
        mdb.notifications.delete_many({"booking_id": bid})
        mdb.notification_audit.delete_many({"booking_id": bid})


# ---------------- module 4: notifications inbox ----------------------------

class TestNotifications:
    def test_list_notifications(self, demo):
        r = requests.get(f"{API}/notifications", headers=_auth(demo["token"]), timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "notifications" in body
        assert "unread" in body

    def test_unread_count(self, demo):
        r = requests.get(f"{API}/notifications/unread-count",
                         headers=_auth(demo["token"]), timeout=15)
        assert r.status_code == 200, r.text
        assert "unread" in r.json()

    def test_read_all(self, demo):
        # seed an unread notification, then read-all → unread count returns 0
        mdb.notifications.insert_one({
            "user_id": demo["user"]["id"], "title": "TEST", "body": "TEST",
            "type": "test", "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        r = requests.post(f"{API}/notifications/read-all",
                          headers=_auth(demo["token"]), timeout=15)
        assert r.status_code == 200, r.text
        r2 = requests.get(f"{API}/notifications/unread-count",
                          headers=_auth(demo["token"]), timeout=15)
        assert r2.json()["unread"] == 0
        # cleanup
        mdb.notifications.delete_many({"user_id": demo["user"]["id"], "title": "TEST"})


# ---------------- module 5: admin psychologist CRUD ------------------------

class TestAdminPsychologistCRUD:
    def test_create_and_delete(self, admin_token, demo):
        payload = {
            "name": "TEST Dr QA Bot",
            "login_phone": "+919888800077",
            "qualifications": "Test PhD",
            "specializations": ["Anxiety"],
            "languages": ["English"],
            "bio": "test",
            "price": 1500,
            "short_call_price": 900,
            "currency": "INR",
            "session_types": ["15-min Call"],
            "available_days": [0, 1, 2, 3, 4],
            "slot_hours": [10, 11],
            "verified": True,
            "photo": None,
        }
        # unauth (no token) → 403
        r0 = requests.post(f"{API}/admin/psychologists", json=payload, timeout=15)
        assert r0.status_code in (401, 403), r0.text

        r = requests.post(f"{API}/admin/psychologists", json=payload,
                          headers=_auth(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        prof = r.json()["psychologist"]
        pid = prof["id"]
        assert prof["name"] == "TEST Dr QA Bot"

        # appears in public listing
        r_pub = requests.get(f"{API}/psychologists", headers=_auth(demo["token"]), timeout=15)
        ids = [p["id"] for p in r_pub.json()["psychologists"]]
        assert pid in ids, "New doctor not in public psychologist list"

        # user account linked (role=psychologist, psychologist_id=pid)
        u = mdb.users.find_one({"phone": "+919888800077"})
        assert u is not None, "Login user for the new doctor was not created"
        assert u.get("role") == "psychologist"
        assert u.get("psychologist_id") == pid

        # DELETE
        rd = requests.delete(f"{API}/admin/psychologists/{pid}",
                             headers=_auth(admin_token), timeout=15)
        assert rd.status_code == 200, rd.text

        # no longer in public list
        r_pub2 = requests.get(f"{API}/psychologists", headers=_auth(demo["token"]), timeout=15)
        ids2 = [p["id"] for p in r_pub2.json()["psychologists"]]
        assert pid not in ids2, "Deleted doctor still in public list"

        # user unlinked (role reverted)
        u2 = mdb.users.find_one({"phone": "+919888800077"})
        if u2:
            assert u2.get("role") != "psychologist"
            # cleanup fully
            mdb.users.delete_one({"_id": u2["_id"]})

    def test_admin_bad_passcode(self):
        r = requests.post(f"{API}/admin/auth", json={"passcode": "wrong"}, timeout=15)
        assert r.status_code == 401

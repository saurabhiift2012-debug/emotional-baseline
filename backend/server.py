"""TherapiShots backend — private emotional wellbeing API.

Design priorities: user safety, privacy, security, simplicity.
The pattern engine is DETERMINISTIC (numpy statistics). The LLM only
rephrases already-validated structured patterns — never raw history.
"""
import os
import logging
import random
import math
import hmac
import hashlib
from pathlib import Path
from datetime import datetime, date, timezone, timedelta
from typing import List, Optional, Annotated, Any

import jwt
import numpy as np
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, BeforeValidator
from bson import ObjectId
from bson.errors import InvalidId
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

SECRET_KEY = os.environ.get('JWT_SECRET')
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET environment variable is required and must be set.")
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_DAYS = 30

# ---- Twilio Verify (SMS OTP) ----
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_VERIFY_SERVICE_SID = os.environ.get('TWILIO_VERIFY_SERVICE_SID')
TWILIO_ENABLED = bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE_SID)
_twilio_client = None
if TWILIO_ENABLED:
    try:
        from twilio.rest import Client as _TwilioClient
        _twilio_client = _TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    except Exception as _e:
        TWILIO_ENABLED = False

# Whitelisted test numbers bypass the SMS provider and use a static code.
# Lets the demo account + automated tests work without a real SMS.
TEST_PHONES = {"+919999900000": "123456"}

# ---- Razorpay (payments) ----
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET')
RAZORPAY_ENABLED = bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)
_razorpay_client = None
if RAZORPAY_ENABLED:
    try:
        import razorpay as _razorpay
        _razorpay_client = _razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    except Exception:
        RAZORPAY_ENABLED = False

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("therapishots")

app = FastAPI(title="TherapiShots API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=True)

# ----------------------------------------------------------------------------
# Mongo helpers
# ----------------------------------------------------------------------------
PyObjectId = Annotated[str, BeforeValidator(str)]


def create_token(user_id: str) -> str:
    payload = {
        'sub': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get('sub')
        oid = ObjectId(user_id)
    except (jwt.PyJWTError, InvalidId, TypeError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await db.users.find_one({"_id": oid})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    user['id'] = str(user['_id'])
    return user


# ----------------------------------------------------------------------------
# Mood catalogue (all emotions valid — grouped, NOT good/bad colour coded)
# value: higher = feeling better; used only for internal statistics
# ----------------------------------------------------------------------------
MOODS = [
    {"key": "heavy",      "emoji": "😔", "cp": "1f614", "group": "low",     "value": 1, "en": "Heavy",      "hi": "भारी"},
    {"key": "anxious",    "emoji": "😰", "cp": "1f630", "group": "low",     "value": 2, "en": "Anxious",    "hi": "घबराहट"},
    {"key": "frustrated", "emoji": "😤", "cp": "1f624", "group": "low",     "value": 2, "en": "Frustrated", "hi": "खीझ"},
    {"key": "numb",       "emoji": "😶", "cp": "1f636", "group": "neutral", "value": 3, "en": "Numb",       "hi": "सुन्न"},
    {"key": "foggy",      "emoji": "😑", "cp": "1f611", "group": "neutral", "value": 3, "en": "Foggy",      "hi": "धुंधला"},
    {"key": "okay",       "emoji": "😐", "cp": "1f610", "group": "neutral", "value": 4, "en": "Okay",       "hi": "ठीक-ठाक"},
    {"key": "hopeful",    "emoji": "🌱", "cp": "1f331", "group": "bright",  "value": 5, "en": "Hopeful",    "hi": "उम्मीद"},
    {"key": "calm",       "emoji": "😌", "cp": "1f60c", "group": "bright",  "value": 5, "en": "Calm",        "hi": "शांत"},
    {"key": "energised",  "emoji": "⚡", "cp": "26a1",  "group": "bright",  "value": 6, "en": "Energised",  "hi": "ऊर्जा"},
]
MOOD_BY_KEY = {m['key']: m for m in MOODS}

CONTEXT_TAGS = ["work", "family", "relationships", "health", "sleep",
                "money", "exercise", "social", "travel", "weather", "other"]

# Curated One Small Step actions (never generated by an LLM)
SMALL_STEPS = [
    {"key": "breathing", "icon": "wind",    "en": "2-minute breathing", "hi": "2-मिनट की साँस",
     "en_desc": "Slow, even breaths to settle your body.", "hi_desc": "शरीर को शांत करने के लिए धीमी साँसें।"},
    {"key": "walk", "icon": "navigation", "en": "Short walk", "hi": "थोड़ी सैर",
     "en_desc": "A few minutes of gentle movement.", "hi_desc": "कुछ मिनट की हल्की गतिविधि।"},
    {"key": "stretch", "icon": "activity", "en": "Stretch", "hi": "स्ट्रेच",
     "en_desc": "Loosen up your shoulders and neck.", "hi_desc": "कंधों और गर्दन को ढीला करें।"},
    {"key": "hydrate", "icon": "droplet", "en": "Hydrate", "hi": "पानी पिएँ",
     "en_desc": "Have a glass of water.", "hi_desc": "एक गिलास पानी पिएँ।"},
    {"key": "outside", "icon": "sun", "en": "Step outside", "hi": "बाहर जाएँ",
     "en_desc": "Spend a few minutes outdoors.", "hi_desc": "कुछ मिनट बाहर बिताएँ।"},
    {"key": "connect", "icon": "message-circle", "en": "Contact someone you trust", "hi": "किसी अपने से बात करें",
     "en_desc": "Reach out to a person you feel safe with.", "hi_desc": "किसी भरोसेमंद व्यक्ति से जुड़ें।"},
    {"key": "winddown", "icon": "moon", "en": "Wind-down routine", "hi": "आराम की दिनचर्या",
     "en_desc": "Ease toward rest with a calm routine.", "hi_desc": "शांत दिनचर्या के साथ आराम की ओर बढ़ें।"},
]

CONSENT_KEYS = ["mood_history", "health_data", "sleep_data", "activity_data",
                "heart_data", "personal_insights", "ai_summaries",
                "psychologist_sharing", "analytics", "marketing"]


# ----------------------------------------------------------------------------
# Pydantic models
# ----------------------------------------------------------------------------
class CheckinIn(BaseModel):
    mood: str
    context: List[str] = []
    note: Optional[str] = None
    timezone: str = "UTC"


class ObservationFeedbackIn(BaseModel):
    checkin_id: Optional[str] = None
    insight_key: Optional[str] = None
    response: str  # yes | maybe | not_really


class ConsentIn(BaseModel):
    consents: dict


# ----------------------------------------------------------------------------
# Simulated health data (stands in for HealthKit / Health Connect until a
# native build ships). Deterministic per user+date so results are stable.
# ----------------------------------------------------------------------------
def _rng_for(user_id: str, d: str) -> random.Random:
    return random.Random(f"{user_id}:{d}")


def gen_health_for_day(user_id: str, d: str, mood_value: Optional[int] = None) -> dict:
    rng = _rng_for(user_id, d)
    base_sleep = 7 * 60
    # If we know the mood, correlate sleep/activity so real patterns emerge.
    mv = mood_value if mood_value is not None else 4
    sleep = int(rng.gauss(base_sleep + (mv - 4) * 22, 45))
    sleep = max(240, min(600, sleep))
    steps = int(rng.gauss(6000 + (mv - 4) * 700, 1800))
    steps = max(500, steps)
    activity = int(rng.gauss(28 + (mv - 4) * 6, 12))
    activity = max(0, activity)
    exercise = max(0, int(activity * rng.uniform(0.4, 0.8)))
    rhr = int(rng.gauss(70 - (mv - 4) * 1.5, 4))
    rhr = max(48, min(95, rhr))
    hrv = int(rng.gauss(55 + (mv - 4) * 3, 10))
    hrv = max(15, hrv)
    sleep_consistency = round(max(0.3, min(1.0, rng.gauss(0.7 + (mv - 4) * 0.03, 0.12))), 2)
    return {
        "date": d,
        "sleep_minutes": sleep,
        "sleep_consistency": sleep_consistency,
        "steps": steps,
        "activity_minutes": activity,
        "exercise_minutes": exercise,
        "resting_hr": rhr,
        "hrv": hrv,
    }


async def ensure_health_day(user_id: str, d: str, mood_value: Optional[int] = None) -> dict:
    doc = await db.health_days.find_one({"user_id": user_id, "date": d})
    if doc:
        doc.pop('_id', None)
        return doc
    hd = gen_health_for_day(user_id, d, mood_value)
    hd["user_id"] = user_id
    await db.health_days.insert_one(dict(hd))
    hd.pop('_id', None)
    return hd


# ----------------------------------------------------------------------------
# Seed 6 weeks of realistic, correlated history on registration so that the
# Insights / Progress / Pulse screens have meaningful content immediately.
# (Uses simulated health data — clearly demo history.)
# ----------------------------------------------------------------------------
async def seed_history(user_id: str, days: int = 42):
    rng = random.Random(f"seed:{user_id}")
    mood_keys = [m['key'] for m in MOODS]
    weekday_bias = {0: -0.6, 1: -0.3, 2: 0.0, 3: 0.1, 4: 0.4, 5: 0.6, 6: 0.3}
    today = date.today()
    checkins = []
    healths = []
    for i in range(days, 0, -1):
        d = today - timedelta(days=i)
        ds = d.isoformat()
        # simulate a sleep-driven mood with weekday bias
        prev_sleep_good = rng.random() < 0.5
        target = 4 + weekday_bias[d.weekday()] + (0.9 if prev_sleep_good else -0.9) + rng.gauss(0, 0.8)
        target = max(1, min(6, round(target)))
        candidates = [m for m in MOODS if abs(m['value'] - target) <= 1]
        chosen = rng.choice(candidates) if candidates else rng.choice(MOODS)
        # 82% of days have a check-in
        if rng.random() < 0.82:
            ctx = []
            if chosen['value'] <= 3 and rng.random() < 0.6:
                ctx = rng.sample(["work", "sleep", "money", "health"], k=rng.randint(1, 2))
            elif rng.random() < 0.3:
                ctx = [rng.choice(["social", "exercise", "family", "weather"])]
            checkins.append({
                "user_id": user_id, "date": ds, "mood": chosen['key'],
                "mood_value": chosen['value'], "group": chosen['group'],
                "context": ctx, "note": None, "timezone": "UTC",
                "created_at": datetime.combine(d, datetime.min.time(), timezone.utc).isoformat(),
                "seeded": True,
            })
        hd = gen_health_for_day(user_id, ds, chosen['value'])
        hd["user_id"] = user_id
        healths.append(hd)
    if checkins:
        await db.checkins.insert_many(checkins)
    if healths:
        await db.health_days.insert_many(healths)


# ----------------------------------------------------------------------------
# Analytics: personal baseline + deterministic pattern engine
# ----------------------------------------------------------------------------
async def load_frames(user_id: str):
    raw = await db.checkins.find({"user_id": user_id}).sort("date", 1).to_list(2000)
    healths = await db.health_days.find({"user_id": user_id}).sort("date", 1).to_list(1000)
    for c in raw:
        c.pop('_id', None)
    for h in healths:
        h.pop('_id', None)
    checkins = _last_per_day(raw)  # analytics use one representative mood per day
    health_by_date = {h['date']: h for h in healths}
    return checkins, healths, health_by_date


def _last_per_day(checkins):
    """Keep the LAST-selected check-in per calendar day (by created_at)."""
    by_day = {}
    for c in sorted(checkins, key=lambda x: (x['date'], x.get('created_at', ''))):
        by_day[c['date']] = c
    return [by_day[d] for d in sorted(by_day.keys())]


def _pearson(x, y):
    if len(x) < 3:
        return 0.0
    x = np.array(x, dtype=float)
    y = np.array(y, dtype=float)
    if np.std(x) == 0 or np.std(y) == 0:
        return 0.0
    r = float(np.corrcoef(x, y)[0, 1])
    if math.isnan(r):
        return 0.0
    return r


def confidence_from(n: int, r: float) -> Optional[str]:
    ar = abs(r)
    if n < 7 or ar < 0.18:
        return None
    if n < 15:
        return "early_signal"
    if n < 30:
        return "emerging"
    return "consistent"


def compute_baseline(checkins, healths):
    def avg(vals):
        vals = [v for v in vals if v is not None]
        return round(float(np.mean(vals)), 1) if vals else None
    return {
        "mood": avg([c['mood_value'] for c in checkins]),
        "sleep_minutes": avg([h['sleep_minutes'] for h in healths]),
        "steps": avg([h['steps'] for h in healths]),
        "activity_minutes": avg([h['activity_minutes'] for h in healths]),
        "resting_hr": avg([h['resting_hr'] for h in healths]),
        "hrv": avg([h['hrv'] for h in healths]),
        "checkin_count": len(checkins),
    }


METRIC_LABELS = {
    "sleep_minutes": {"en": "sleep", "hi": "नींद"},
    "sleep_consistency": {"en": "sleep consistency", "hi": "नींद की नियमितता"},
    "steps": {"en": "steps", "hi": "कदम"},
    "activity_minutes": {"en": "activity", "hi": "गतिविधि"},
    "resting_hr": {"en": "resting heart rate", "hi": "आराम की हृदय गति"},
    "hrv": {"en": "heart rate variability", "hi": "हृदय गति परिवर्तनशीलता"},
}


def build_insights(checkins, health_by_date):
    """Deterministic pattern engine — uses ONLY what the user actively provides
    (their mood over time and the context chips they choose). Passively-collected
    health metrics are intentionally NOT surfaced here."""
    helps, harder, notice, context_patterns = [], [], [], []

    # day of week (based purely on reported mood)
    by_wd = {}
    for c in checkins:
        wd = date.fromisoformat(c['date']).weekday()
        by_wd.setdefault(wd, []).append(c['mood_value'])
    if len(checkins) >= 10 and by_wd:
        means = {wd: np.mean(v) for wd, v in by_wd.items() if len(v) >= 2}
        if means:
            overall = np.mean([c['mood_value'] for c in checkins])
            low_wd = min(means, key=means.get)
            if means[low_wd] <= overall - 0.5:
                names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
                notice.append(_insight("weekday", "emerging" if len(checkins) >= 15 else "early_signal",
                             f"Your mood has tended to be lower on {names[low_wd]}s.",
                             len(checkins), 0.3, "weekday"))

    # context patterns
    overall_mood = np.mean([c['mood_value'] for c in checkins]) if checkins else 4
    ctx_stats = {}
    for c in checkins:
        for t in c.get('context', []):
            ctx_stats.setdefault(t, []).append(c['mood_value'])
    for tag, vals in ctx_stats.items():
        if len(vals) >= 3:
            m = np.mean(vals)
            if m <= overall_mood - 0.4:
                context_patterns.append(_insight(f"ctx_{tag}", "emerging" if len(vals) >= 6 else "early_signal",
                             f"{tag.capitalize()} has appeared frequently in your lower-mood check-ins.",
                             len(vals), 0.3, "context"))
    return {
        "helps": helps,
        "harder": harder,
        "notice": notice,
        "context": context_patterns,
    }


def _insight(key, confidence, text, n, r, metric):
    return {
        "key": key,
        "confidence": confidence,
        "text": text,
        "observations": n,
        "direction": "positive" if r > 0 else "negative",
        "effect": round(abs(r), 2),
        "metric": metric,
        "why": f"Based on {n} check-ins with matching data.",
    }


def compute_pulse(checkins, healths, health_by_date):
    """Wellbeing Pulse: recent 7 days vs the prior baseline period."""
    today = date.today()
    recent_dates = {(today - timedelta(days=i)).isoformat() for i in range(0, 8)}
    base_dates = {(today - timedelta(days=i)).isoformat() for i in range(8, 36)}

    def metric_status(recent_vals, base_vals, inverse=False):
        recent_vals = [v for v in recent_vals if v is not None]
        base_vals = [v for v in base_vals if v is not None]
        if len(recent_vals) < 2 or len(base_vals) < 3:
            return "not_enough"
        r_mean, b_mean = np.mean(recent_vals), np.mean(base_vals)
        b_std = np.std(base_vals) or 1
        z = (r_mean - b_mean) / b_std
        if inverse:
            z = -z
        if z > 0.4:
            return "above"
        if z < -0.4:
            return "below"
        return "around"

    mood = metric_status([c['mood_value'] for c in checkins if c['date'] in recent_dates],
                         [c['mood_value'] for c in checkins if c['date'] in base_dates])
    sleep = metric_status([h['sleep_minutes'] for h in healths if h['date'] in recent_dates],
                         [h['sleep_minutes'] for h in healths if h['date'] in base_dates])
    activity = metric_status([h['activity_minutes'] for h in healths if h['date'] in recent_dates],
                            [h['activity_minutes'] for h in healths if h['date'] in base_dates])
    recovery = metric_status([h['hrv'] for h in healths if h['date'] in recent_dates],
                            [h['hrv'] for h in healths if h['date'] in base_dates])
    statuses = [mood, sleep, activity, recovery]
    below = statuses.count("below")
    if below >= 2:
        summary = "Several of your wellbeing signals appear lower than your recent baseline."
    elif statuses.count("above") >= 2:
        summary = "Several of your wellbeing signals appear higher than your recent baseline."
    else:
        summary = "Your wellbeing signals appear broadly around your recent baseline."
    return {"mood": mood, "sleep": sleep, "activity": activity, "recovery": recovery,
            "summary": summary,
            "disclaimer": "Wellbeing Pulse reflects patterns in information you choose to share. It is not a medical or psychological diagnosis."}


def detect_low_mood(checkins):
    """Deterministic repeated-lower-mood detection.

    - Cold-start: for the first 14 days (no personal baseline yet) use a fixed
      population default baseline of 3.0 so early distress can still trigger.
    - 'Numb' is treated as a monitor signal (counts toward the pattern regardless
      of its numeric value), and 'Numb the day after any low mood' escalates.
    """
    if not checkins:
        return {"repeated_low": False}
    ordered = sorted(checkins, key=lambda c: c['date'])
    baseline = 3.0 if len(ordered) < 14 else float(np.mean([c['mood_value'] for c in ordered]))
    LOW = {"heavy", "anxious", "frustrated"}
    last7 = ordered[-7:]
    below = [c for c in last7 if c['mood_value'] < baseline - 0.5 or c.get('mood') == 'numb']
    last4 = ordered[-4:]
    low_or_numb_4 = [c for c in last4 if c.get('group') == 'low' or c.get('mood') == 'numb']
    numb_after_low = False
    for prev, cur in zip(ordered, ordered[1:]):
        if cur.get('mood') == 'numb' and (prev.get('group') == 'low' or prev.get('mood') in LOW) and cur in last7:
            numb_after_low = True
    repeated = (len(below) >= 3) or (len(low_or_numb_4) >= 2) or numb_after_low
    return {"repeated_low": bool(repeated), "count": len(below), "numb_after_low": numb_after_low}


def pick_small_step(last_mood_value: Optional[int]) -> dict:
    if last_mood_value is None:
        return SMALL_STEPS[0]
    if last_mood_value <= 2:
        return random.choice([SMALL_STEPS[0], SMALL_STEPS[5]])  # breathing / connect
    if last_mood_value == 3:
        return random.choice([SMALL_STEPS[1], SMALL_STEPS[4]])  # walk / outside
    return random.choice([SMALL_STEPS[2], SMALL_STEPS[3], SMALL_STEPS[4]])


def today_observation(checkins, health_by_date):
    """One gentle, mood-based observation for the Today screen (deterministic).
    Uses only the user's own reported mood + context — no health metrics."""
    if len(checkins) < 5:
        return None
    ins = build_insights(checkins, health_by_date)
    if ins['context']:
        return ins['context'][0]['text']
    if ins['notice']:
        return ins['notice'][0]['text']
    # gentle recent mood-trend note vs personal baseline
    ordered = sorted(checkins, key=lambda c: c['date'])
    baseline = np.mean([c['mood_value'] for c in ordered])
    recent = [c['mood_value'] for c in ordered[-5:]]
    if np.mean(recent) >= baseline + 0.5:
        return "Your recent check-ins have been a little brighter than your usual pattern."
    if np.mean(recent) <= baseline - 0.5:
        return "Your recent check-ins have been a little lower than your usual pattern."
    return None


def assess_day(todays_entries, checkins):
    """'Something you may want to notice' derived from the TYPES of moods logged
    today, with a light look across recent days. Deterministic, supportive, and
    explicitly non-diagnostic — it reflects patterns, it does not label the user.

    Logic:
      - low+bright in the same day  -> emotional variability (normalise ups/downs)
      - >=2 low today               -> repeated low; escalate if low across recent days
      - single low                  -> gentle acknowledgement
      - only neutral/foggy          -> flat/foggy; suggest routine, rest, daylight
      - all bright                  -> reinforce what's working
      - bright+neutral (no low)      -> steady day
    """
    if not todays_entries:
        return None
    groups = [e.get('group') for e in todays_entries]
    n = len(groups)
    low, neutral, bright = groups.count('low'), groups.count('neutral'), groups.count('bright')
    distinct = set(g for g in groups if g)

    ordered = sorted(checkins, key=lambda c: c['date'])
    recent_low_days = sum(1 for c in ordered[-4:] if c.get('group') == 'low')

    if 'low' in distinct and 'bright' in distinct:
        return {"tone": "mixed",
                "text": "Your day moved between heavier and lighter moments. Emotional ups and downs within a single day are completely human — noticing them is a real strength."}
    if low >= 2:
        text = "You've checked in feeling low a few times today."
        if recent_low_days >= 2:
            text += " It's shown up across recent days too. Booking a 15-minute call with a psychologist could help."
        else:
            text += " That can be draining. Be gentle with yourself."
        return {"tone": "low", "text": text}
    if low == 1 and n == 1:
        return {"tone": "low",
                "text": "Today landed on the heavier side. Whatever brought you here, thank you for noticing it."}
    if neutral >= 1 and low == 0 and bright == 0:
        return {"tone": "neutral",
                "text": "A flat or foggy stretch today. Gentle routine, rest, and a little daylight can help the edges feel sharper."}
    if bright == n and n >= 1:
        return {"tone": "bright",
                "text": "Today has felt steadily brighter. It's worth pausing to notice what's working — that's useful data too."}
    if 'bright' in distinct and 'neutral' in distinct and 'low' not in distinct:
        return {"tone": "bright",
                "text": "A mostly steady day with some lighter moments. The small good things are worth logging."}
    return None


# ----------------------------------------------------------------------------
# Routes: auth
# ----------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"app": "TherapiShots", "status": "ok"}


@api_router.get("/config")
async def config():
    return {"moods": MOODS, "context_tags": CONTEXT_TAGS,
            "small_steps": SMALL_STEPS, "consent_keys": CONSENT_KEYS}


@api_router.get("/downloads/mood-clinical-review")
async def download_mood_clinical_review():
    """Public download of the per-mood clinical-review Word document."""
    from fastapi.responses import FileResponse
    path = "/app/TherapiShots_Mood_Clinical_Review.docx"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Document not found")
    return FileResponse(
        path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename="TherapiShots_Mood_Clinical_Review.docx",
    )


def _public_user(u: dict) -> dict:
    return {
        "id": str(u['_id']),
        "phone": u.get('phone'),
        "email": u.get('email'),
        "name": u.get('name', 'there'),
        "language": u.get('language', 'en'),
        "consents": u.get('consents', {}),
        "health_connected": u.get('health_connected', {}),
        "emergency_contact": u.get('emergency_contact'),
        "agreement": u.get('agreement'),
    }


def _default_consents() -> dict:
    on_by_default = {"mood_history", "health_data", "sleep_data", "activity_data",
                     "heart_data", "personal_insights"}
    return {k: (k in on_by_default) for k in CONSENT_KEYS}


def _norm_phone(phone: str) -> str:
    p = "".join(ch for ch in (phone or "") if ch.isdigit() or ch == "+")
    return p


def _ensure_indian_phone(phone: str) -> str:
    """Normalise to E.164 for India (+91XXXXXXXXXX). Accepts a 10-digit number,
    a 91-prefixed number, or an already +91-prefixed number. Rejects anything else."""
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    if digits.startswith("0091"):
        digits = digits[4:]
    elif digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    if len(digits) != 10 or digits[0] not in "6789":
        raise HTTPException(status_code=400,
                            detail="Please enter a valid Indian mobile number (10 digits).")
    return "+91" + digits


def _send_otp_sms(phone: str):
    """Send an OTP via Twilio Verify. Test numbers are handled by the caller."""
    if not TWILIO_ENABLED:
        raise HTTPException(status_code=503, detail="SMS service is not configured.")
    try:
        _twilio_client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID) \
            .verifications.create(to=phone, channel="sms")
    except Exception as e:
        logger.warning(f"Twilio send failed for {phone}: {e}")
        raise HTTPException(status_code=502, detail="Could not send verification code. Please try again.")


def _check_otp_sms(phone: str, code: str) -> bool:
    if not TWILIO_ENABLED:
        return False
    try:
        check = _twilio_client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID) \
            .verification_checks.create(to=phone, code=code)
        return check.status == "approved"
    except Exception as e:
        logger.warning(f"Twilio check failed for {phone}: {e}")
        return False


def _validate_18(dob_str: str):
    try:
        dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Date of birth must be YYYY-MM-DD")
    today = date.today()
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    if age < 18:
        raise HTTPException(status_code=403, detail="You must be 18 or older to use TherapiShots.")


AGREEMENT_VERSION = 1


class RequestOtpIn(BaseModel):
    phone: str
    mode: str = "login"  # "login" | "register"
    name: Optional[str] = None
    date_of_birth: Optional[str] = None
    email: Optional[str] = None
    language: str = "en"
    # Emergency contact + safety agreement (register only)
    emergency_contact_name: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    agreement_accepted: Optional[bool] = None


class VerifyOtpIn(BaseModel):
    phone: str
    code: str


@api_router.post("/auth/request-otp")
async def request_otp(body: RequestOtpIn):
    phone = _ensure_indian_phone(body.phone)
    existing = await db.users.find_one({"phone": phone})
    pending = None
    if body.mode == "register":
        if existing:
            raise HTTPException(status_code=400, detail="This mobile number is already registered. Please log in.")
        if not body.name or not body.date_of_birth:
            raise HTTPException(status_code=400, detail="Name and date of birth are required.")
        _validate_18(body.date_of_birth)
        if not (body.emergency_contact_name and body.emergency_contact_relationship and body.emergency_contact_phone):
            raise HTTPException(status_code=400, detail="Emergency contact name, relationship and number are required.")
        ec_phone = _ensure_indian_phone(body.emergency_contact_phone)
        if not body.agreement_accepted:
            raise HTTPException(status_code=400, detail="Please read and accept the safety agreement to continue.")
        pending = {
            "name": body.name.strip() or "there",
            "date_of_birth": body.date_of_birth,
            "email": (body.email or "").strip().lower() or None,
            "language": body.language,
            "emergency_contact": {
                "name": body.emergency_contact_name.strip(),
                "relationship": body.emergency_contact_relationship.strip(),
                "phone": ec_phone,
            },
            "agreement": {
                "accepted": True,
                "version": AGREEMENT_VERSION,
                "accepted_at": datetime.now(timezone.utc).isoformat(),
            },
        }
    else:  # login
        if not existing:
            raise HTTPException(status_code=404, detail="No account found for this number. Please register.")

    # basic rate limit: 20s cooldown between sends
    prior = await db.otps.find_one({"phone": phone})
    if prior:
        try:
            sent = datetime.fromisoformat(prior.get("sent_at"))
            if (datetime.now(timezone.utc) - sent).total_seconds() < 20:
                raise HTTPException(status_code=429, detail="Please wait a few seconds before requesting another code.")
        except HTTPException:
            raise
        except Exception:
            pass

    now = datetime.now(timezone.utc)
    is_test = phone in TEST_PHONES
    record = {"sent_at": now.isoformat(), "attempts": 0, "pending": pending,
              "expires_at": (now + timedelta(minutes=10)).isoformat()}
    if is_test:
        record["test_code"] = TEST_PHONES[phone]
    else:
        _send_otp_sms(phone)
    await db.otps.update_one({"phone": phone}, {"$set": record}, upsert=True)
    resp = {"message": "Verification code sent."}
    if is_test:
        resp["dev_code"] = TEST_PHONES[phone]  # test numbers only
    return resp


@api_router.post("/auth/verify-otp")
async def verify_otp(body: VerifyOtpIn):
    phone = _ensure_indian_phone(body.phone)
    rec = await db.otps.find_one({"phone": phone})
    if not rec:
        raise HTTPException(status_code=400, detail="Code expired or not found. Please request a new one.")
    try:
        if datetime.fromisoformat(rec["expires_at"]) < datetime.now(timezone.utc):
            await db.otps.delete_one({"_id": rec["_id"]})
            raise HTTPException(status_code=400, detail="Code expired. Please request a new one.")
    except HTTPException:
        raise
    except Exception:
        pass
    if rec.get("attempts", 0) >= 5:
        await db.otps.delete_one({"_id": rec["_id"]})
        raise HTTPException(status_code=429, detail="Too many attempts. Please request a new code.")

    code = body.code.strip()
    if "test_code" in rec:
        ok = code == rec["test_code"]
    else:
        ok = _check_otp_sms(phone, code)
    if not ok:
        await db.otps.update_one({"_id": rec["_id"]}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=401, detail="Incorrect code. Please try again.")

    user = await db.users.find_one({"phone": phone})
    if not user:
        pending = rec.get("pending") or {}
        doc = {
            "phone": phone,
            "email": pending.get("email"),
            "name": pending.get("name", "there"),
            "date_of_birth": pending.get("date_of_birth"),
            "language": pending.get("language", "en"),
            "emergency_contact": pending.get("emergency_contact"),
            "agreement": pending.get("agreement"),
            "consents": _default_consents(),
            "consent_version": 1,
            "health_connected": {"sleep": True, "activity": True, "steps": True, "heart": True},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        res = await db.users.insert_one(doc)
        uid = str(res.inserted_id)
        await seed_history(uid)
        user = await db.users.find_one({"_id": res.inserted_id})
    await db.otps.delete_one({"_id": rec["_id"]})
    token = create_token(str(user['_id']))
    return {"token": token, "user": _public_user(user)}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return _public_user(user)


@api_router.put("/me/language")
async def set_language(body: dict, user: dict = Depends(get_current_user)):
    lang = body.get('language', 'en')
    await db.users.update_one({"_id": ObjectId(user['id'])}, {"$set": {"language": lang}})
    return {"language": lang}


@api_router.put("/me/consents")
async def update_consents(body: ConsentIn, user: dict = Depends(get_current_user)):
    consents = user.get('consents', {})
    consents.update({k: bool(v) for k, v in body.consents.items() if k in CONSENT_KEYS})
    await db.users.update_one({"_id": ObjectId(user['id'])},
                              {"$set": {"consents": consents},
                               "$inc": {"consent_version": 1}})
    await db.consent_audit.insert_one({
        "user_id": user['id'], "consents": consents,
        "at": datetime.now(timezone.utc).isoformat()})
    return {"consents": consents}


@api_router.put("/me/health-connections")
async def health_connections(body: dict, user: dict = Depends(get_current_user)):
    hc = user.get('health_connected', {})
    hc.update({k: bool(v) for k, v in body.items() if k in ("sleep", "activity", "steps", "heart")})
    await db.users.update_one({"_id": ObjectId(user['id'])}, {"$set": {"health_connected": hc}})
    return {"health_connected": hc}


@api_router.delete("/me/data")
async def delete_data(scope: str = "all", user: dict = Depends(get_current_user)):
    uid = user['id']
    if scope in ("all", "mood"):
        await db.checkins.delete_many({"user_id": uid})
    if scope in ("all", "health"):
        await db.health_days.delete_many({"user_id": uid})
    if scope == "account":
        await db.checkins.delete_many({"user_id": uid})
        await db.health_days.delete_many({"user_id": uid})
        await db.users.delete_one({"_id": ObjectId(uid)})
    return {"deleted": scope}


@api_router.get("/me/export")
async def export_data(user: dict = Depends(get_current_user)):
    checkins, healths, _ = await load_frames(user['id'])
    return {"user": _public_user(user), "checkins": checkins, "health_days": healths}


# ----------------------------------------------------------------------------
# Routes: check-in
# ----------------------------------------------------------------------------
@api_router.post("/checkins")
async def create_checkin(body: CheckinIn, user: dict = Depends(get_current_user)):
    if body.mood not in MOOD_BY_KEY:
        raise HTTPException(status_code=400, detail="Unknown mood")
    m = MOOD_BY_KEY[body.mood]
    today = date.today().isoformat()
    now = datetime.now(timezone.utc)
    doc = {
        "user_id": user['id'], "date": today, "mood": m['key'],
        "mood_value": m['value'], "group": m['group'],
        "context": [c for c in body.context if c in CONTEXT_TAGS],
        "note": (body.note or "").strip()[:500] or None,
        "timezone": body.timezone,
        "created_at": now.isoformat(), "seeded": False,
    }
    # Allow multiple check-ins per day — each selection is its own entry.
    await db.checkins.insert_one(dict(doc))
    # health for the day reflects the latest mood
    existing_hd = await db.health_days.find_one({"user_id": user['id'], "date": today})
    if not existing_hd:
        await ensure_health_day(user['id'], today, m['value'])
    doc.pop('_id', None)
    # count today's entries for the response
    todays_count = await db.checkins.count_documents({"user_id": user['id'], "date": today})
    return {"checkin": doc, "message": "Thanks for checking in.",
            "low_mood": m['value'] <= 2, "todays_count": todays_count}


@api_router.get("/checkins/today")
async def today_checkin(user: dict = Depends(get_current_user)):
    today = date.today().isoformat()
    c = await db.checkins.find_one({"user_id": user['id'], "date": today})
    if c:
        c.pop('_id', None)
    return {"checkin": c}


@api_router.get("/checkins")
async def list_checkins(user: dict = Depends(get_current_user), limit: int = 200):
    items = await db.checkins.find({"user_id": user['id']}).sort("date", -1).to_list(limit)
    for c in items:
        c.pop('_id', None)
    return {"checkins": items}


@api_router.post("/feedback")
async def observation_feedback(body: ObservationFeedbackIn, user: dict = Depends(get_current_user)):
    await db.feedback.insert_one({
        "user_id": user['id'], "checkin_id": body.checkin_id,
        "insight_key": body.insight_key, "response": body.response,
        "at": datetime.now(timezone.utc).isoformat()})
    return {"ok": True}


# ----------------------------------------------------------------------------
# Routes: today / health / insights / pulse / progress
# ----------------------------------------------------------------------------
@api_router.get("/today")
async def today(user: dict = Depends(get_current_user)):
    uid = user['id']
    today_str = date.today().isoformat()
    checkins, healths, hbd = await load_frames(uid)
    hd = await ensure_health_day(uid, today_str)
    todays = next((c for c in checkins if c['date'] == today_str), None)
    last_value = todays['mood_value'] if todays else (checkins[-1]['mood_value'] if checkins else None)
    hc = user.get('health_connected', {})
    signals = {
        "sleep": {"connected": hc.get('sleep', True), "minutes": hd['sleep_minutes']},
        "steps": {"connected": hc.get('steps', True), "value": hd['steps']},
        "activity": {"connected": hc.get('activity', True), "minutes": hd['activity_minutes']},
        "resting_hr": {"connected": hc.get('heart', True), "bpm": hd['resting_hr']},
        "hrv": {"connected": hc.get('heart', True), "value": hd['hrv']},
    }
    observation = today_observation(checkins, hbd) if user.get('consents', {}).get('personal_insights', True) else None
    hour = datetime.now().hour
    greeting = "morning" if hour < 12 else "afternoon" if hour < 18 else "evening"
    # all of today's raw entries (multiple check-ins per day are allowed)
    raw_today = await db.checkins.find({"user_id": uid, "date": today_str}).sort("created_at", 1).to_list(50)
    todays_entries = [{
        "mood": c['mood'], "group": c.get('group'),
        "created_at": c.get('created_at'),
        "context": c.get('context', []), "note": c.get('note'),
    } for c in raw_today]
    latest = raw_today[-1] if raw_today else None
    # 15-min paid call is recommended for users showing repeated lower mood OR
    # whose latest mood is in the low group (heavy / anxious / frustrated).
    lmj = detect_low_mood(checkins)
    latest_group = latest.get('group') if latest else (checkins[-1].get('group') if checkins else None)
    latest_mood_key = latest['mood'] if latest else (checkins[-1]['mood'] if checkins else None)
    LOW_KEYS = {"heavy", "anxious", "frustrated"}
    # Tiered support: 'escalate' (repeated-low pattern) foregrounds the 15-min call
    # after a self-harm screening; 'gentle' (single low today) offers a low-key
    # option only; 'none' otherwise. Crisis access is independent of all this.
    if lmj.get('repeated_low'):
        support_tier = "escalate"
    elif latest_mood_key in LOW_KEYS:
        support_tier = "gentle"
    else:
        support_tier = "none"
    day_notice = assess_day(todays_entries, checkins) if user.get('consents', {}).get('personal_insights', True) else None
    return {
        "greeting": greeting,
        "name": user.get('name', 'there'),
        "checked_in_today": len(raw_today) > 0,
        "todays_mood": latest['mood'] if latest else None,
        "todays_entries": todays_entries,
        "todays_count": len(raw_today),
        "signals": signals,
        "observation": observation,
        "day_notice": day_notice,
        "low_mood_journey": lmj,
        "support_tier": support_tier,
        "screening_required": support_tier == "escalate",
        "latest_group": latest_group,
    }


@api_router.get("/insights")
async def insights(user: dict = Depends(get_current_user)):
    checkins, healths, hbd = await load_frames(user['id'])
    baseline = compute_baseline(checkins, healths)
    data = build_insights(checkins, hbd) if len(checkins) >= 7 else {"helps": [], "harder": [], "notice": [], "context": []}
    # Last 7 days daily mood (using the LAST-selected mood of each day)
    by_date = {c['date']: c for c in checkins}
    today = date.today()
    daily_moods = []
    for i in range(6, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        c = by_date.get(d)
        daily_moods.append({
            "date": d,
            "mood": c['mood'] if c else None,
            "group": c.get('group') if c else None,
        })
    return {"insights": data, "baseline": baseline, "checkin_count": len(checkins),
            "daily_moods": daily_moods, "streak": compute_streak(checkins)}


def compute_streak(checkins) -> int:
    """Consecutive days (ending today, or yesterday if not yet checked in today)
    with at least one check-in."""
    dates = {c['date'] for c in checkins}
    if not dates:
        return 0
    today = date.today()
    cursor = today if today.isoformat() in dates else today - timedelta(days=1)
    streak = 0
    while cursor.isoformat() in dates:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


@api_router.get("/pulse")
async def pulse(user: dict = Depends(get_current_user)):
    checkins, healths, hbd = await load_frames(user['id'])
    return compute_pulse(checkins, healths, hbd)


@api_router.get("/progress")
async def progress(user: dict = Depends(get_current_user)):
    uid = user['id']
    checkins, healths, hbd = await load_frames(uid)
    today = date.today()
    # last 30-day mood series
    mood_series, sleep_series, steps_series, activity_series = [], [], [], []
    checkin_by_date = {c['date']: c for c in checkins}
    for i in range(29, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        c = checkin_by_date.get(d)
        h = hbd.get(d)
        mood_series.append({"date": d, "value": c['mood_value'] if c else None})
        sleep_series.append({"date": d, "value": h['sleep_minutes'] if h else None})
        steps_series.append({"date": d, "value": h['steps'] if h else None})
        activity_series.append({"date": d, "value": h['activity_minutes'] if h else None})
    # month check-in count
    month_prefix = today.strftime("%Y-%m")
    month_count = sum(1 for c in checkins if c['date'].startswith(month_prefix))
    # feel map (last 42 days check-in mood groups)
    feel_map = []
    for i in range(41, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        c = checkin_by_date.get(d)
        feel_map.append({"date": d, "group": c['group'] if c else None})
    # context distribution
    ctx_counts = {}
    for c in checkins:
        for t in c.get('context', []):
            ctx_counts[t] = ctx_counts.get(t, 0) + 1
    return {
        "mood_series": mood_series, "sleep_series": sleep_series,
        "steps_series": steps_series, "activity_series": activity_series,
        "month_checkin_count": month_count, "total_checkins": len(checkins),
        "feel_map": feel_map,
        "context_counts": sorted(ctx_counts.items(), key=lambda x: -x[1]),
    }


# ----------------------------------------------------------------------------
# Routes: My Story (AI rephrases ONLY validated structured patterns)
# ----------------------------------------------------------------------------
# A composition × trend matrix that turns the Feel Map (mix of low/steady/bright
# days) and the Mood trend (direction over the window) into a SPECIFIC, non-generic
# reflection for "Read your story". Supportive, non-diagnostic.
STORY_MATRIX = {
    "bright": {
        "improving": "Your recent days have leaned bright, and they've kept lifting. Whatever you've been doing lately seems to be helping — it's worth noticing what's behind it.",
        "declining": "Overall this has been a bright stretch, though the last few days eased off a little. A gentle dip after good days is completely normal — be kind to your energy.",
        "steady": "You've had a steadily bright run. Consistency like this is quietly powerful; small good routines really do add up.",
        "volatile": "There's been plenty of brightness, even if your days swung a fair bit. Ups and downs around good moments are still good news overall.",
    },
    "steady": {
        "improving": "Your days have been fairly even, and lately they've started to lift. Steady ground with a gentle rise is a hopeful shape.",
        "declining": "You've been mostly on even ground, with a slight downward drift recently. Nothing dramatic — just a nudge to rest and check in with yourself.",
        "steady": "Your mood has held steady and level. Flat stretches aren't nothing — they're a stable base you can build small things on.",
        "volatile": "Underneath a mostly even picture, some days swung more than others. Naming those wobble days can help you spot what stirs them.",
    },
    "low": {
        "improving": "It's been a heavier stretch, but the recent trend is quietly lifting. That upward turn matters — hold onto whatever is helping.",
        "declining": "These have been heavier days, and the trend kept dipping. Talking it through with a psychologist on a 15-minute call could help.",
        "steady": "You've sat with a lot of heaviness lately, holding fairly level. That's hard to do — please be gentle; a 15-minute psychologist call could help.",
        "volatile": "Heavier days have come and gone in waves. A 15-minute psychologist call and steadier routines can make a real difference.",
    },
    "mixed": {
        "improving": "Your days have been a real mix, and the overall direction is lifting. Range is human — and the trend is a kind one right now.",
        "declining": "It's been a mixed stretch that edged downward lately. If the dip continues, a 15-minute psychologist call could help.",
        "steady": "You've moved between heavier and brighter days around a steady centre. That variety is part of a full emotional life.",
        "volatile": "Your days swung widely between light and heavy. Big swings can be tiring — noticing your triggers is a strong first step.",
    },
}


def story_signature(window):
    """Derive (composition, trend) from a window of daily check-ins and map it to
    a specific matrix note. `window` items carry `group` and `mood_value`."""
    groups = [c.get('group') for c in window if c.get('group')]
    n = len(groups)
    if n == 0:
        return None
    low, neutral, bright = groups.count('low'), groups.count('neutral'), groups.count('bright')
    if bright / n >= 0.5:
        comp = "bright"
    elif low / n >= 0.4:
        comp = "low"
    elif neutral / n >= 0.5:
        comp = "steady"
    else:
        comp = "mixed"

    vals = [c['mood_value'] for c in sorted(window, key=lambda c: c['date']) if c.get('mood_value') is not None]
    trend = "steady"
    if len(vals) >= 4:
        half = len(vals) // 2
        first, second = float(np.mean(vals[:half])), float(np.mean(vals[half:]))
        if float(np.std(vals)) >= 1.6:
            trend = "volatile"
        elif second >= first + 0.5:
            trend = "improving"
        elif second <= first - 0.5:
            trend = "declining"
    return {
        "composition": comp, "trend": trend,
        "low_days": low, "steady_days": neutral, "bright_days": bright,
        "note": STORY_MATRIX[comp][trend],
    }



@api_router.get("/story")
async def story(period: str = "week", user: dict = Depends(get_current_user)):
    uid = user['id']
    checkins, healths, hbd = await load_frames(uid)
    today = date.today()
    days = 7 if period == "week" else 30
    since = (today - timedelta(days=days)).isoformat()
    window = [c for c in checkins if c['date'] >= since]
    ins = build_insights(checkins, hbd)
    baseline = compute_baseline(checkins, healths)
    sig = story_signature(window)

    # Structured, validated facts only (no raw notes / PII sent to the LLM)
    facts = {
        "period": period,
        "checkin_count": len(window),
        "avg_mood": round(float(np.mean([c['mood_value'] for c in window])), 1) if window else None,
        "baseline_mood": baseline['mood'],
        "composition": sig['composition'] if sig else None,
        "trend": sig['trend'] if sig else None,
        "bright_days": sig['bright_days'] if sig else 0,
        "steady_days": sig['steady_days'] if sig else 0,
        "low_days": sig['low_days'] if sig else 0,
        "matrix_note": sig['note'] if sig else None,
        "top_helps": [i['text'] for i in ins['helps'][:2]],
        "top_harder": [i['text'] for i in ins['harder'][:1]],
        "context_patterns": [i['text'] for i in ins['context'][:1]],
    }
    template = _story_template(facts, period)
    ai_text = None
    if user.get('consents', {}).get('ai_summaries', False):
        ai_text = await _ai_polish(facts, uid)
    return {"facts": facts, "template": template, "ai_text": ai_text,
            "used_ai": ai_text is not None}


def _story_template(f, period) -> str:
    label = "week" if period == "week" else "month"
    parts = [f"You checked in {f['checkin_count']} times this {label}."]
    if f.get('bright_days') is not None and (f['bright_days'] + f['steady_days'] + f['low_days']) > 0:
        parts.append(f"That's {f['bright_days']} brighter, {f['steady_days']} steady and {f['low_days']} heavier days.")
    # The matrix note is the core, data-specific reflection.
    if f.get('matrix_note'):
        parts.append(f['matrix_note'])
    elif f['avg_mood'] and f['baseline_mood']:
        if f['avg_mood'] > f['baseline_mood'] + 0.3:
            parts.append("Your mood was generally higher than your usual pattern.")
        elif f['avg_mood'] < f['baseline_mood'] - 0.3:
            parts.append("Your mood was generally a little lower than your usual pattern.")
        else:
            parts.append("Your mood stayed broadly around your usual pattern.")
    for t in f['top_helps']:
        parts.append(t)
    for t in f['top_harder']:
        parts.append(t)
    for t in f['context_patterns']:
        parts.append(t)
    parts.append("Keep checking in — noticing how you feel is a small step worth repeating.")
    return " ".join(parts)


async def _ai_polish(facts: dict, pseudo_id: str) -> Optional[str]:
    """Rephrase validated structured facts into a warm summary. The LLM must
    NOT invent patterns — it only rewrites the validated facts provided."""
    key = os.environ.get('EMERGENT_LLM_KEY')
    if not key:
        return None
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        system = (
            "You are a warm, plain-language wellbeing writer for an app called TherapiShots. "
            "You will receive ONLY validated, structured facts about a person's self-reported mood "
            "and simulated health signals. Rewrite them into a short, gentle 2-4 sentence summary. "
            "Do NOT invent any new patterns, numbers, or causes. Do NOT diagnose. "
            "Do NOT use alarm or excessive celebration. Never claim causation. "
            "Keep it under 70 words."
        )
        chat = LlmChat(api_key=key, session_id=f"story-{pseudo_id}", system_message=system).with_model("anthropic", "claude-sonnet-4-6")
        prompt = "Validated facts (JSON):\n" + str(facts) + "\n\nWrite the summary now."
        resp = await chat.send_message(UserMessage(text=prompt))
        await db.ai_usage.insert_one({
            "pseudo_id": pseudo_id, "feature": "story",
            "at": datetime.now(timezone.utc).isoformat()})
        return resp.strip() if isinstance(resp, str) else str(resp).strip()
    except Exception as e:
        logger.warning(f"AI polish failed: {e}")
        return None

# ----------------------------------------------------------------------------
# Professional support: psychologist discovery + booking (mock payment)
# NOTE: psychologists below are clearly-labelled DEMO/TEST data.
# ----------------------------------------------------------------------------
DEMO_PSYCHOLOGISTS = [
    {"slug": "ananya-rao", "name": "Dr. Ananya Rao", "verified": True,
     "qualifications": "PhD Clinical Psychology", "specializations": ["Anxiety", "Stress", "Sleep"],
     "languages": ["English", "Hindi"], "experience_years": 11,
     "session_types": ["15-min Call", "Video", "Chat"], "price": 1200, "short_call_price": 400, "currency": "INR",
     "bio": "Warm, evidence-based support for anxiety, stress and sleep difficulties."},
    {"slug": "vikram-menon", "name": "Dr. Vikram Menon", "verified": True,
     "qualifications": "MPhil Clinical Psychology", "specializations": ["Relationships", "Work stress", "Low mood"],
     "languages": ["English"], "experience_years": 8,
     "session_types": ["15-min Call", "Video"], "price": 1500, "short_call_price": 500, "currency": "INR",
     "bio": "Helps people navigate relationships, burnout and work-related stress."},
    {"slug": "sara-iyer", "name": "Ms. Sara Iyer", "verified": True,
     "qualifications": "MA Counselling Psychology", "specializations": ["Self-esteem", "Anxiety", "Life transitions"],
     "languages": ["English", "Hindi"], "experience_years": 6,
     "session_types": ["15-min Call", "Video", "Chat"], "price": 900, "short_call_price": 300, "currency": "INR",
     "bio": "A gentle, collaborative approach for self-esteem and life changes."},
    {"slug": "rohit-kulkarni", "name": "Dr. Rohit Kulkarni", "verified": False,
     "qualifications": "PsyD", "specializations": ["Sleep", "Mindfulness", "Stress"],
     "languages": ["English", "Hindi", "Marathi"], "experience_years": 4,
     "session_types": ["15-min Call", "Chat"], "price": 700, "short_call_price": 250, "currency": "INR",
     "bio": "Focuses on mindfulness and sleep hygiene for everyday stress."},
]


async def seed_psychologists():
    # Upsert by slug so profile changes (e.g. new 15-min Call option) always apply.
    for p in DEMO_PSYCHOLOGISTS:
        await db.psychologists.update_one(
            {"slug": p["slug"]},
            {"$set": {**p, "is_demo": True},
             "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
    return


def gen_availability(slug: str):
    """Deterministic upcoming slots for the next 7 days."""
    rng = random.Random(f"avail:{slug}")
    slots = []
    now = datetime.now()
    for day in range(1, 8):
        d = (now + timedelta(days=day)).date()
        hours = sorted(rng.sample([10, 11, 12, 15, 16, 17, 18, 19], k=rng.randint(2, 4)))
        for h in hours:
            slots.append({"id": f"{d.isoformat()}T{h:02d}:00",
                          "date": d.isoformat(), "time": f"{h:02d}:00",
                          "label": d.strftime("%a %d %b") + f" · {h:02d}:00"})
    return slots


class BookingOrderIn(BaseModel):
    psychologist_id: str
    slot_id: str
    session_type: str


class BookingVerifyIn(BaseModel):
    booking_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@api_router.get("/psychologists")
async def list_psychologists(language: Optional[str] = None,
                             specialization: Optional[str] = None,
                             session_type: Optional[str] = None,
                             user: dict = Depends(get_current_user)):
    q: dict = {}
    if language:
        q["languages"] = language
    if session_type:
        q["session_types"] = session_type
    items = await db.psychologists.find(q).to_list(100)
    out = []
    for p in items:
        p["id"] = str(p.pop("_id"))
        if specialization and specialization not in p.get("specializations", []):
            continue
        out.append(p)
    return {"psychologists": out}


@api_router.get("/psychologists/{pid}")
async def get_psychologist(pid: str, user: dict = Depends(get_current_user)):
    try:
        p = await db.psychologists.find_one({"_id": ObjectId(pid)})
    except Exception:
        p = None
    if not p:
        raise HTTPException(status_code=404, detail="Psychologist not found")
    p["id"] = str(p.pop("_id"))
    p["availability"] = gen_availability(p["slug"])
    return p


def _resolve_booking(p: dict, slot_id: str, session_type: str):
    slots = gen_availability(p["slug"])
    slot = next((s for s in slots if s["id"] == slot_id), None)
    if not slot:
        raise HTTPException(status_code=400, detail="That slot is no longer available")
    if session_type not in p.get("session_types", []):
        raise HTTPException(status_code=400, detail="Unsupported session type")
    price = p.get("short_call_price", p["price"]) if session_type == "15-min Call" else p["price"]
    return slot, price


@api_router.post("/bookings/order")
async def create_booking_order(body: BookingOrderIn, user: dict = Depends(get_current_user)):
    """Create a Razorpay order and a pending booking. Returns checkout params."""
    if not RAZORPAY_ENABLED:
        raise HTTPException(status_code=503, detail="Payments are not configured.")
    try:
        p = await db.psychologists.find_one({"_id": ObjectId(body.psychologist_id)})
    except Exception:
        p = None
    if not p:
        raise HTTPException(status_code=404, detail="Psychologist not found")
    slot, price = _resolve_booking(p, body.slot_id, body.session_type)
    currency = p.get("currency", "INR")
    amount_paise = int(round(price * 100))
    receipt = f"ts_{str(user['_id'])[-8:]}_{uuid_hex()[:8]}"[:40]
    try:
        order = _razorpay_client.order.create({
            "amount": amount_paise, "currency": currency,
            "receipt": receipt, "payment_capture": 1,
        })
    except Exception as e:
        logger.warning(f"Razorpay order failed: {e}")
        raise HTTPException(status_code=502, detail="Could not start payment. Please try again.")
    doc = {
        "user_id": user["id"], "psychologist_id": body.psychologist_id,
        "psychologist_name": p["name"], "slot_id": slot["id"],
        "slot_label": slot["label"], "slot_date": slot["date"], "slot_time": slot["time"],
        "session_type": body.session_type, "price": price, "currency": currency,
        "status": "pending", "razorpay_order_id": order["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.bookings.insert_one(dict(doc))
    return {
        "booking_id": str(res.inserted_id),
        "order_id": order["id"],
        "amount": amount_paise,
        "currency": currency,
        "key_id": RAZORPAY_KEY_ID,
        "name": "TherapiShots",
        "description": f"{body.session_type} with {p['name']}",
        "prefill": {"name": user.get("name", ""), "contact": (user.get("phone") or "").replace("+", ""),
                    "email": user.get("email") or ""},
    }


@api_router.post("/bookings/verify")
async def verify_booking_payment(body: BookingVerifyIn, user: dict = Depends(get_current_user)):
    """Verify Razorpay payment signature server-side, then confirm the booking."""
    try:
        booking = await db.bookings.find_one({"_id": ObjectId(body.booking_id), "user_id": user["id"]})
    except Exception:
        booking = None
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.get("razorpay_order_id") != body.razorpay_order_id:
        raise HTTPException(status_code=400, detail="Order mismatch")
    # HMAC-SHA256(order_id|payment_id, key_secret)
    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, body.razorpay_signature):
        await db.bookings.update_one({"_id": booking["_id"]}, {"$set": {"status": "failed"}})
        raise HTTPException(status_code=400, detail="Payment verification failed.")
    payment = {
        "status": "paid", "provider": "razorpay",
        "amount": booking["price"], "currency": booking.get("currency", "INR"),
        "razorpay_order_id": body.razorpay_order_id,
        "razorpay_payment_id": body.razorpay_payment_id,
    }
    await db.bookings.update_one(
        {"_id": booking["_id"]},
        {"$set": {"status": "confirmed", "payment": payment,
                  "confirmed_at": datetime.now(timezone.utc).isoformat()}},
    )
    booking["id"] = str(booking.pop("_id"))
    booking["status"] = "confirmed"
    booking["payment"] = payment
    return {"booking": booking, "message": "Your session is confirmed."}


@api_router.get("/bookings")
async def list_bookings(user: dict = Depends(get_current_user)):
    items = await db.bookings.find(
        {"user_id": user["id"], "status": {"$in": ["confirmed", "cancelled"]}}
    ).sort("created_at", -1).to_list(100)
    for b in items:
        b["id"] = str(b.pop("_id"))
    return {"bookings": items}


@api_router.post("/bookings/{bid}/cancel")
async def cancel_booking(bid: str, user: dict = Depends(get_current_user)):
    try:
        b = await db.bookings.find_one({"_id": ObjectId(bid), "user_id": user["id"]})
    except Exception:
        b = None
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    await db.bookings.update_one({"_id": ObjectId(bid)}, {"$set": {"status": "cancelled"}})
    return {"ok": True, "status": "cancelled"}


def uuid_hex():
    import uuid as _uuid
    return _uuid.uuid4().hex[:12].upper()


@app.on_event("startup")
async def _startup_seed():
    await seed_psychologists()
    try:
        await db.users.create_index("phone", unique=True, sparse=True)
    except Exception:
        pass
    # Demo phone account for OTP testing (idempotent)
    demo_phone = "+919999900000"
    existing = await db.users.find_one({"phone": demo_phone})
    if not existing:
        doc = {
            "phone": demo_phone, "email": None, "name": "Demo",
            "date_of_birth": "1995-01-01", "language": "en",
            "consents": _default_consents(), "consent_version": 1,
            "health_connected": {"sleep": True, "activity": True, "steps": True, "heart": True},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        res = await db.users.insert_one(doc)
        await seed_history(str(res.inserted_id))




app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

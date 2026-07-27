"""Simulated health data (stands in for HealthKit / Health Connect until a
native build ships). Deterministic per user+date so results are stable."""
import random
from typing import Optional

from database import db


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

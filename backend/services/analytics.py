"""Analytics: personal baseline + deterministic pattern engine.

The pattern engine is DETERMINISTIC (numpy statistics). It uses ONLY what the
user actively provides (mood over time and the context chips they choose)."""
import math
import random
from datetime import date, timedelta
from typing import Optional

import numpy as np

from database import db
from catalog import SMALL_STEPS


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

    # context patterns — surface ONLY with enough data:
    #   * total check-ins n >= 7, AND
    #   * the specific tag chosen >= 3 times in LOW-MOOD check-ins.
    # Otherwise render nothing (the UI shows a neutral empty state).
    context_patterns = []
    if len(checkins) >= 7:
        ctx_low_counts = {}
        for c in checkins:
            if c.get('group') == 'low':
                for tag in c.get('context', []):
                    ctx_low_counts[tag] = ctx_low_counts.get(tag, 0) + 1
        for tag, low_count in ctx_low_counts.items():
            if low_count >= 3:
                context_patterns.append(_insight(f"ctx_{tag}", "emerging" if low_count >= 6 else "early_signal",
                             f"{tag.capitalize()} has appeared frequently in your lower-mood check-ins.",
                             low_count, 0.3, "context"))
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
    explicitly non-diagnostic — it reflects patterns, it does not label the user."""
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

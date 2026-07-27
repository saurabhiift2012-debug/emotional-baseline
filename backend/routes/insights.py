"""Insights routes: today dashboard, insights, pulse, progress and story."""
from datetime import datetime, date, timedelta

import numpy as np
from fastapi import APIRouter, Depends

from database import db
from security import get_current_user
from services.health import ensure_health_day
from services.analytics import (load_frames, compute_baseline, build_insights,
                                 compute_pulse, detect_low_mood, today_observation,
                                 assess_day, compute_streak)
from services.story import story_signature, story_template, ai_polish

router = APIRouter()


@router.get("/today")
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


@router.get("/insights")
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


@router.get("/pulse")
async def pulse(user: dict = Depends(get_current_user)):
    checkins, healths, hbd = await load_frames(user['id'])
    return compute_pulse(checkins, healths, hbd)


@router.get("/progress")
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


@router.get("/story")
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
    template = story_template(facts, period)
    ai_text = None
    if user.get('consents', {}).get('ai_summaries', False):
        ai_text = await ai_polish(facts, uid)
    return {"facts": facts, "template": template, "ai_text": ai_text,
            "used_ai": ai_text is not None}

"""My Story generation — the LLM rephrases ONLY validated structured patterns,
never raw history or PII."""
import os
from datetime import datetime, timezone
from typing import Optional

import numpy as np

from database import db
from config import logger
from catalog import STORY_MATRIX


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


def story_template(f, period) -> str:
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


async def ai_polish(facts: dict, pseudo_id: str) -> Optional[str]:
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

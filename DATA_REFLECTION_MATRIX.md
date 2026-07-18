# TherapiShots — Data Collection & Reflection Trigger Matrix

_Source of truth: `backend/server.py`. All reflections are deterministic and
non-diagnostic. "n" = total number of check-ins the user has logged (≈ 1/day)._

---

## 1. Data collection points

| # | Data point | Source (how) | Frequency | Feeds |
|---|-----------|--------------|-----------|-------|
| 1 | **Mood** (`mood_id`, e.g. Heavy/Calm) | User taps a mood tile | Every check-in | Everything |
| 2 | **Mood value** (0–6 scale) | Derived from mood | Every check-in | Baseline, trend, pulse, story |
| 3 | **Mood group** (`low` / `neutral` / `bright`) | Derived from mood | Every check-in | Feel Map, day-notice, story composition |
| 4 | **Context tags** (work, family, sleep, money…) | User chips | Optional per check-in | Insights, context patterns |
| 5 | **Note** (free text) | User | Optional | Kept private; **never sent to AI** |
| 6 | **Timestamp / local date** | Auto | Every check-in | Streak, day-of-week patterns |
| 7 | **Emergency contact** (name, relationship, phone) | Registration | Once | Safety / consultation escalation |
| 8 | **Consent & safety agreement** | Registration | Once | Consent record |
| 9 | **Health signals** (sleep, steps, activity, HRV, resting HR) | **SIMULATED demo data** | Daily | Wellbeing Pulse only (not in Insights) |

---

## 2. Reflection / comment trigger matrix (by amount of data)

| Reflection / feature | Unlocks at | Exact trigger logic |
|----------------------|-----------|---------------------|
| **Save confirmation + small step** | Check-in #1 | Always after any check-in (`pick_small_step` by last mood value) |
| **Day notice** — "Something you may want to notice" | ≥1 check-in **today** | `assess_day` on today's mood mix (see §4). Escalates if `low` on ≥2 of last 4 days |
| **Low-mood inline prompt / 15-min call** | Latest mood ∈ {Heavy, Anxious, Frustrated} **OR** repeated-low | `repeated_low` = ≥5 check-ins **and** ≥3 days below (baseline − 0.5) within last 7 |
| **Today observation** | n ≥ 5 | Best available context/weekday insight, else recent-5 avg vs baseline (±0.5) |
| **Streak flame** (Insights) | ≥1 consecutive day | Consecutive days (ending today/yesterday) that have a check-in |
| **Insights engine** (`build_insights`) | **n ≥ 7** | Below this, Insights returns empty |
| ↳ Context pattern ("Work in lower-mood days") | Tag seen ≥3× | early_signal ≥3, **emerging** ≥6; tag avg ≤ overall − 0.4 |
| ↳ Weekday pattern ("lower on Mondays") | n ≥ 10 | early_signal ≥10, **emerging** ≥15; weekday needs ≥2 samples; ≤ overall − 0.5 |
| **Confidence badge** on an insight | n ≥ 7 & \|effect\| ≥ 0.18 | 7–14 = *Early Signal*, 15–29 = *Emerging*, ≥30 = *Consistent* |
| **Feel Map** (Progress) | Any check-ins | Renders last **42 days**; days without a check-in = outlined dot |
| **Mood trend** chart (Progress) | Any check-ins | Renders last **30 days**; taller = brighter; gaps = no check-in |
| **Month check-in count** | Current month | Count of check-ins in current calendar month |
| **Wellbeing Pulse** (Progress) | Recent vs base windows | Compares recent window to baseline; meaningful ~14+ days |
| **Story — day breakdown** (b/s/heavier) | ≥1 in window | Counts of bright/steady/low days in the 7- or 30-day window |
| **Story — composition** | ≥1 in window | bright ≥50% → *bright*; low ≥40% → *low*; neutral ≥50% → *steady*; else *mixed* |
| **Story — trend** | ≥4 mood values in window | 2nd-half vs 1st-half avg: ±0.5 → improving/declining; std ≥1.6 → *volatile*; else *steady* |
| **Story — matrix reflection** | composition + trend resolved | 4×4 matrix (see §3) |
| **Story — AI rephrase** | `ai_summaries` consent ON | Claude rewrites the SAME validated facts only |

### Window sizes
- **Story "This week"** = last **7 days** · **"This month"** = last **30 days**
- **Feel Map** = last **42 days (6 weeks)** · **Mood trend** = last **30 days**
- **Repeated-low** = last **7** check-ins · **Day-notice escalation** = last **4** days

---

## 3. Story matrix — Composition × Trend (16 cells)

| Composition ↓ / Trend → | **Improving** | **Declining** | **Steady** | **Volatile** |
|---|---|---|---|---|
| **Bright** | Leaning bright and lifting — notice what's helping | Bright overall, slight recent ease — be kind to energy | Steadily bright — consistency is powerful | Bright with swings — still good news |
| **Steady** | Even ground beginning to lift — hopeful | Even, slight downward drift — rest & check in | Held steady/level — a stable base | Even overall, some wobble days — name them |
| **Low** | Heavy but quietly lifting — hold what helps | Heavy & dipping — you're not alone, consider talking | Heavy, holding level — be gentle, reach out | Lows in waves — support & routine help |
| **Mixed** | A mix, lifting overall — trend is kind | Mixed, edged down — talk it through if it continues | Between heavy & bright around a centre — human range | Wide swings — noticing triggers is a strong step |

---

## 4. Day-notice logic (`assess_day`) — from today's mood types

Priority order (first match wins):
1. **low + bright same day** → emotional variability (normalise ups/downs)
2. **≥2 low today** → repeated-low nudge; if low on ≥2 of last 4 days → suggest talking to someone
3. **single low** → gentle acknowledgement
4. **only neutral/foggy** → flat/foggy → routine, rest, daylight
5. **all bright** → reinforce what's working
6. **bright + neutral (no low)** → steady day

---

## 5. Privacy notes
- Insights/patterns use **only user-provided** mood + context (health signals are demo/simulated and appear **only** in Wellbeing Pulse).
- Free-text notes are **never** sent to the AI. AI only rephrases the validated structured facts above, and only with `ai_summaries` consent.

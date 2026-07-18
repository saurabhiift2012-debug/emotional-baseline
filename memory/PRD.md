# TherapiShots — Product Requirements Document

**Tagline:** Small Steps Today, Better Tomorrow
**Stack:** Expo (React Native) + FastAPI + MongoDB (platform-adapted from the spec's Flutter/Supabase).

## Original Problem Statement
Private personal emotional wellbeing & self-reflection app. Core loop: open → visual
mood selector → optional context → today's health signals → gentle personal
observation → "does this feel true?" → one small step. Answers "What seems to affect
how I feel?" via a DETERMINISTIC pattern engine. Never diagnoses. Private by default.

## User Choices (confirmed)
- Simulated health data now (real HealthKit / Health Connect after native build)
- Email + password JWT auth, 18+ gate
- AI (Claude) rephrases ONLY validated structured patterns; off by default
- P0 first; psychologist booking / payment / admin = P1 (payment provider TBD)

## Architecture (implemented)
- **Auth:** JWT (bcrypt), 18+ DOB validation, token in expo-secure-store.
- **Data:** MongoDB — users, checkins, health_days, feedback, consent_audit, ai_usage.
- **Health:** deterministic simulated signals per user/date (sleep, steps, activity, RHR, HRV).
- **Pattern engine:** numpy Pearson correlations (mood vs sleep/steps/activity/HRV/RHR,
  prev-night sleep→next-day mood, day-of-week, context). Confidence tiers: Early Signal
  (7–14), Emerging (15–29), Consistent (30+), gated by effect size |r|≥0.18.
- **Wellbeing Pulse:** recent 7d vs prior baseline z-score per signal + disclaimer.
- **AI Story:** Claude (claude-sonnet-4-6) via Emergent LLM; receives structured
  validated facts only (no raw notes/PII); consent-gated.
- **i18n:** centralized EN/HI dictionary.
- Registration seeds ~42 days correlated history for immediate insight value.

## Implemented (2026-06-18)
- Onboarding (18+ gate, language), register/login.
- 5 tabs: Today, Insights, Progress, Support, Me.
- Hero animated visual mood selector (9 moods, reanimated + haptics, not good/bad coded).
- Check-in flow (mood → context chips + note → thanks; low-mood helpful options).
- Today: greeting, health signals, observation + "feel true" feedback, one small step,
  repeated-low-mood gentle banner.
- Insights: categorised cards + confidence badges + "why" + feedback.
- Progress: Wellbeing Pulse, Feel Map, mood/sleep/activity bar charts, non-punitive
  month count, Story CTA.
- Support: breathing circle (reduced-motion aware), emergency contacts, psychologist (coming soon).
- Me: granular consent toggles, language, export/delete data, delete account, logout.
- My Story modal (weekly/monthly, AI-assisted when consented).
- 34/34 backend tests passing; full frontend E2E passing.

## Backlog
- **P1:** Psychologist discovery/profiles, booking, payment (Stripe/Razorpay — TBD),
  user-controlled pre-session data sharing, admin portal (RBAC + audit), notifications.
- **P2:** Real HealthKit / Health Connect integration (native build), advanced insights,
  additional health signals, richer Story generation, admin analytics.
- **Security hardening for prod:** RLS-equivalent per-user scoping (already enforced by
  user_id filters), rate limiting, secret rotation, MFA for future admin.

## Next Tasks
1. Confirm payment provider, then build psychologist discovery + booking (P1).
2. Wire real HealthKit / Health Connect behind a native build.

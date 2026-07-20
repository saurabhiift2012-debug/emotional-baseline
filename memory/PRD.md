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

## Update 2026-06-18 (UX iteration)
- Me privacy section reduced to 2 toggles (Health Data, Psychologist Sharing); removed 8 others.
- Feel Map recolored (visible rose/amber/sage GROUP_COLOR) + legend.
- Export my data now generates a PDF (expo-print + expo-sharing; native only).
- New Wellbeing Resources screen (curated EN/HI self-help cards) linked from Support.
- PENDING (requested): Dark/Light mode with device-default — this is a theming refactor
  across ~18 screens (StyleSheet → theme-aware makeStyles + ThemeProvider); to be done as a
  dedicated pass to avoid breaking the UI.

## Session update (Twilio + Razorpay + Theme + Logo) — DONE
- Twilio Verify SMS OTP live; Indian +91 only (10-digit, starts 6-9). Demo number
  +919999900000 uses static code 123456 for tests. (backend/server.py)
- Razorpay (TEST) real payments: /api/bookings/order (Razorpay order + pending booking)
  -> WebView checkout (src/RazorpayCheckout.tsx) -> /api/bookings/verify (HMAC signature).
  Real card checkout renders only on native builds (react-native-webview web limitation).
- Dark/Light/System theming DONE across all screens: ThemeProvider (persisted) + useTheme
  + makeStyles(colors). Appearance toggle in Me tab. theme.ts has light/dark palettes.
- TherapiShots logo applied to app icon/splash/adaptive/favicon + onboarding/login/register.
- Deferred: P1 security hardening (fail-closed JWT, CORS restriction, ObjectId guards,
  remove unused email/password routes).

## Session update 2026-06-20 (8-Point Clinical Review + Security Hardening) — DONE
- Fixed broken Home (index.tsx): removed dead "One small step" card + <CrisisSheet> refs.
- Tiered support wired: escalate tier shows self-harm screening (Yes→/crisis, No→Book 15-min call);
  gentle tier shows low-key "Talk to a psychologist (15 min)" link. No app-initiated coping steps.
- Check-in: low moods show "Anything weighing on you? (optional)"; removed "Take a small step" option.
- Progress: Mood trend hidden behind "Show more detail" toggle; Feel Map primary; no numeric 0-6 values.
- Added i18n keys: no, show_more_detail, hide_detail.
- P1 Security hardening DONE: JWT_SECRET enforced from env (RuntimeError if missing, no fallback);
  get_current_user rejects invalid/garbage tokens + malformed ObjectId sub → 401 (bson InvalidId guard);
  removed unused email/password /auth/register + /auth/login routes (now 404) + RegisterIn/LoginIn/
  hash_password/verify_password/bcrypt/EmailStr dead code. CORS left permissive per user (lock at deploy).
- Verified: 16/16 backend pytest green + full frontend Playwright flows (iteration_12).

## Session update 2026-06-20 (Insights — real-data-only fix) — DONE- ROOT CAUSE of "money has appeared frequently in lower-mood check-ins" for empty users:
  SEEDED/DEMO data. seed_history() inserted 42 days of fake check-ins (tagged seeded:True)
  that added money/work/sleep/health context on low-mood days; text itself was a template string.
- Removed seed_history() function + both callers (new-user OTP registration + startup demo account).
- Deleted 485 existing seeded check-ins from DB (seeded:True). Insights now use real data only.
- build_insights context patterns now gated STRICTLY: total n>=7 AND tag chosen >=3 times in
  LOW-MOOD (group=='low') check-ins; else renders nothing. Gate lives inside build_insights so
  every caller (/insights, today_observation, story) is covered.
- Empty state text set to: "Keep checking in — patterns will appear here once there's enough to notice."
- Verified: 3 unit cases (n=6→none, n=7 w/2 low→none, n=7 w/3 low→money renders), API (demo now
  0 context insights), and screenshot of neutral empty state.

## Session update 2026-06 (Phase B — Admin dashboard + role-gated resources) — DONE
- Hidden **Admin Usage Dashboard**: entry via long-press on version number in Me→About → /admin.
  Passcode-gated (ADMIN_PASSCODE in backend/.env, 12h admin JWT, role claim). PII masked.
  Endpoints: POST /api/admin/auth, GET /api/admin/metrics (totals, active 7/30d, revenue, 7-day trend),
  GET /api/admin/users?q=, PUT /api/admin/users/{uid}/resources.
- **Role-gated Wellbeing Resources**: resources locked by default (user.assigned_resources=[]);
  admin unlocks per-user by tapping a user card and toggling resource keys. resources.tsx now shows a
  locked empty state (Logo + "Talk to a psychologist" CTA) until resources are assigned.
- Verified: backend curl (auth reject/accept, metrics, masked users, assign filters bogus keys, no-token 401)
  + frontend screenshots (passcode gate, dashboard, user list, resource toggle persists).

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run lint      # Run ESLint
```

There is no test suite. There is no separate install step beyond `npm install`.

## Environment

Copy `.env.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_BASE_URL` — deployed URL (no trailing slash)
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — from Supabase project settings
- `SUPABASE_SERVICE_ROLE_KEY` — used only in account-deletion route (bypasses RLS)
- `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET` — Google OAuth

## Architecture

**Next.js 15 App Router** with Supabase for auth and database.

### Route structure

- `/` — Public landing page; authenticated users are redirected to `/dash` by middleware (`lib/supabase/proxy.ts`)
- `/auth/continue` — Login/signup page
- `/(protected)/*` — All authenticated pages, protected by middleware redirect
  - `/dash` — Dashboard
  - `/problems` — Full problem list with progress
  - `/settings` — Account settings, delete account
  - `/feedback` — Feedback form

### Data flow

All protected pages share a single `DashboardProvider` (`app/(protected)/_components/dashboard-provider.tsx`) that:
1. Fetches all app data on mount (active study plan, problem lists, streak, stats, due problems, all problems)
2. Exposes it via `useDashboard()` context hook
3. Provides `refreshData()` to refetch after mutations (e.g., logging an attempt)

Pages and components call `useDashboard()` instead of fetching independently.

### API routes

All under `app/api/`. Full documentation in `app/api/README.md`.

Key routes:
- `POST /api/problems/[problemKey]/attempts` — Logs an attempt, runs the spaced repetition algorithm, enforces the `review_per_day` cap via write-time cascade, updates progress, updates streak/daily activity
- `GET /api/problemlists/[listKey]/due` — Returns today's review queue + upcoming projected new problems
- `GET /api/problemlists/[listKey]/calendar` — Returns past attempts, scheduled reviews, and projected new problems
- `POST /api/user/active-study-plan` — Creates/updates the user's study plan (pace, new_per_day, review_per_day); backfills all future scheduled reviews when review_per_day changes

### Spaced repetition algorithm

Implemented in `app/api/problems/[problemKey]/attempts/route.ts` in `computeNextProgress()`. Full details in `docs/SPACED_REPETITION.md`.

- Grades: `0` (Again), `1` (Good), `2` (Easy)
- First attempt always → 1 day interval (Easy → 3 days); second attempt has fixed intervals
- Subsequent: Good ×2.0 capped at 30 days, Easy ×2.3 capped at 90 days, Fail ×0.25 min 1 day
- Stages (1 Learning / 2 Reinforcing / 3 Mastered) are cosmetic UI labels only — they do not affect intervals
- Stage progression: Good advances one stage max stage 2 (Reinforcing); only Easy can reach stage 3 (Mastered)

### Review cap enforcement (write-time scheduling)

`review_per_day` is enforced **at write time**, not read time. After `computeNextProgress` computes `next_review_at`, `cascadeNextReviewDate` checks whether the user's local calendar day already has `review_per_day` reviews scheduled. If so, it advances the date forward (up to 7 days) until a slot is available, then writes the authoritative date to `user_problem_progress`.

This design preserves the overdue/overflow distinction: a review with `next_review_at` in the past is always genuinely overdue (missed), never a cap-overflow artifact. The `/due` endpoint's read-time slice is a safety net for pre-existing data only.

When a user changes pace and `review_per_day` changes, `backfillReviewSchedule` redistributes all future reviews for the list. It uses `last_attempt_at + interval_days` as each review's ideal date (not the prior `next_review_at`), making pace changes fully reversible. See `docs/SPACED_REPETITION.md` for details.

### Review queue (`/due` endpoint)

The `/due` endpoint splits reviews into three buckets:
- **Overdue** (`next_review_at < localDayStartUTC`): always shown uncapped — urgent catch-up
- **Today's scheduled** (`localDayStartUTC ≤ next_review_at < localDayEndUTC`): capped to `review_per_day` as a safety net
- **Future scheduled** (`next_review_at ≥ localDayEndUTC`): always included uncapped (powers "this week" view)

New problems are only surfaced when there are zero overdue reviews. Once overdue are cleared, today's new quota unlocks. `days_until` is computed as local calendar days from `localDayStartUTC` (0 = due today, negative = overdue) — not raw hours from the current moment.

### Timezone handling

The server runs UTC; clients send `localDate` (`YYYY-MM-DD`) and `tzOffset` (minutes west of UTC, from `getTimezoneOffset()`) with all time-sensitive requests. Two shared helpers implement this:
- `lib/api/parseLocalDateBounds.ts` — parses params from URL search params; used by `/due` and `/calendar`
- `lib/api/localDateUtils.ts` — lower-level functions (`utcToLocalDateStr`, `localDayBoundsUTC`, `nextLocalDateStr`) used by write-time scheduling where params come from request bodies

All routes validate `localDate` against `/^\d{4}-\d{2}-\d{2}$/` and return 400 on bad input. `tzOffset` is clamped to `[-720, 840]`.

`tzOffset` convention: positive = west of UTC (CST = 360, CDT = 300), negative = east (AEST = -600). Local day start in UTC = `Date.UTC(y, m-1, d) + tzOffset * 60_000`. This convention must be applied consistently in all scheduling operations (cascade, backfill, due, calendar).

### Supabase clients

- `lib/supabase/client.ts` — Browser client (use in Client Components)
- `lib/supabase/server.ts` — Server client using cookies (use in Server Components and API routes)
- `lib/supabase/proxy.ts` — Middleware session refresher (`updateSession`)

API routes use the server client (RLS-enforced). The account-deletion route creates a separate service-role client using `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS.

### Database tables

`problems`, `problem_lists`, `problem_list_items`, `user_problem_attempts`, `user_problem_progress`, `user_daily_activity`, `user_study_plans`, `user_preferences`, `feedback`

### UI stack

Tailwind CSS + shadcn/ui components (in `components/ui/`). The `components.json` file configures shadcn. `next-themes` handles light/dark/system theming.

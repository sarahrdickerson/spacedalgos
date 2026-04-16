# Spaced Repetition System

## Overview

This application uses a spaced repetition algorithm to help users retain algorithmic problem-solving skills over time. The system tracks user progress through **stages** and schedules reviews at increasing intervals based on performance **grades**.

## Grades

When logging a solve attempt, users choose one of three grades:

| Grade | Label    | Meaning                                 |
| ----- | -------- | --------------------------------------- |
| **0** | ❌ Again | Failed to solve or needed the solution  |
| **1** | 👍 Good  | Solved but slow, messy, or needed hints |
| **2** | ✅ Easy  | Solved cleanly without hints            |

## Stages

Stages are a UI label showing conceptual mastery level. They do **not** affect the interval calculation.

| Stage | Label          | Description               |
| ----- | -------------- | ------------------------- |
| **1** | 🌱 Learning    | Just starting the problem |
| **2** | 🔄 Reinforcing | Building understanding    |
| **3** | ✅ Mastered    | Confident mastery         |

### Stage Progression

- **Grade 2 (Easy)**: advance one stage (max 3). Only Easy can move into or remain at Stage 3 (Mastered).
- **Grade 1 (Good)**:
  - From **Stage 1** → advance to **Stage 2 (Reinforcing)**.
  - From **Stage 2** → stay at **Stage 2 (Reinforcing)**.
  - From **Stage 3 (Mastered)** → drop to **Stage 2 (Reinforcing)**.
- **Grade 0 (Again)**: drop one stage (min 1).
- First attempt always → Stage 1 regardless of grade.
  > When you are currently at **Stage 3 (Mastered)**:
  >
  > - **Easy (2)** keeps you at Mastered.
  > - **Good (1)** demotes you to Reinforcing (Stage 2).
  > - **Again (0)** also demotes you to Reinforcing (Stage 2).

## Interval Calculations

Intervals grow purely from the **previous interval × a grade multiplier**, with a hard cap to prevent unbounded growth.

### First Attempt

On the first attempt, the next review interval depends on the grade:

- **Grade 0 (Again)** → **1 day**
- **Grade 1 (Good)** → **1 day**
- **Grade 2 (Easy)** → **3 days**

Reviewing within a few days confirms the memory is forming before extending the interval further.

### Subsequent Attempts

| Grade         | Multiplier       | Cap     | Approximate sequence                            |
| ------------- | ---------------- | ------- | ----------------------------------------------- |
| **0 (Again)** | ×0.25, min 1 day | —       | Shrinks to ~¼ of current (same/next-day repair) |
| **1 (Good)**  | ×2.0             | 30 days | 1 → 2 → 4 → 8 → 16 → 30 → 30 → …                |
| **2 (Easy)**  | ×2.3             | 90 days | 3 → 7 → 17 → 40 → 90 → 90 → …                   |

Once an interval hits its cap it stays there, functioning as maintenance review (monthly for Good, quarterly for Easy).

### Fail behaviour

`floor(prevInterval × 0.25)`, minimum 1 day:

| Was at  | After fail                   |
| ------- | ---------------------------- |
| 1 day   | 1 day (same/next-day repair) |
| 4 days  | 1 day                        |
| 7 days  | 1 day                        |
| 30 days | 7 days                       |
| 90 days | 22 days                      |

## Example Scenarios

### Scenario 1: Clean solves (all Easy)

| Attempt | Grade | Interval              |
| ------- | ----- | --------------------- |
| 1st     | Easy  | 3 days                |
| 2nd     | Easy  | 7 days                |
| 3rd     | Easy  | 17 days               |
| 4th     | Easy  | 40 days               |
| 5th+    | Easy  | 90 days (maintenance) |

### Scenario 2: Steady progress (all Good)

| Attempt | Grade | Interval              |
| ------- | ----- | --------------------- |
| 1st     | Good  | 1 day                 |
| 2nd     | Good  | 2 days                |
| 3rd     | Good  | 4 days                |
| 4th     | Good  | 8 days                |
| 5th     | Good  | 16 days               |
| 6th+    | Good  | 30 days (maintenance) |

### Scenario 3: Failure and recovery

| Attempt | Grade | Interval | Note              |
| ------- | ----- | -------- | ----------------- |
| 1st     | Good  | 1 day    |                   |
| 2nd     | Good  | 2 days   |                   |
| 3rd     | Good  | 4 days   |                   |
| 4th     | Again | 1 day    | repair            |
| 5th     | Good  | 2 days   | restarting growth |
| 6th     | Good  | 4 days   |                   |

## Review Cap Enforcement (write-time scheduling)

### Why write time?

The `review_per_day` setting in a user's study plan caps how many reviews appear per calendar day. Enforcing this cap **at write time** (when an attempt is logged) rather than read time (when the due queue or calendar is fetched) has one critical advantage: it preserves the distinction between a review that was **bumped** (exceeded the cap) and a review that is **overdue** (genuinely missed). At read time, a `next_review_at` in the past is always ambiguous — there is no way to know whether it was a cap-overflow or a missed session.

### How it works (`cascadeNextReviewDate`)

After `computeNextProgress` returns the ideal `next_review_at`, the attempts route calls `cascadeNextReviewDate` before writing to the database:

1. Look up which list the problem belongs to and fetch the active `review_per_day` for that list.
2. Convert `next_review_at` to a local calendar date using the client-supplied `tzOffset` (via `utcToLocalDateStr` from `lib/api/localDateUtils.ts`).
3. Fetch all scheduled reviews for the list within a 7-day local window in a **single query**, then build a local-date → count map in memory (one round-trip instead of one per day).
4. If the target day is full, advance to the next local calendar day and repeat (up to 7 days).
5. Only overwrite `next_review_at` when a bump to a later date is needed. When the original slot is available, the timestamp produced by `addDays(now, interval)` is kept as-is — this is inherently timezone-safe because it preserves the time-of-day offset from the current moment.
6. Any DB lookup failure (list membership, study plan, scheduled reviews) is logged with structured context and causes the cascade to abort, leaving `next_review_at` at the algorithm's computed value rather than silently writing an incorrect date. A failure fetching the scheduled-reviews window is treated as fatal and throws, surfacing the error to the caller.

### Pace change backfill (`backfillReviewSchedule`)

When a user changes pace and `review_per_day` changes, all **future** scheduled reviews for the list must be redistributed to fit the new cap. This runs synchronously inside `POST /api/user/active-study-plan`.

Key design decisions:

- **Ideal date = `last_attempt_at + interval_days`** — uses the algorithm's pure output, not the prior `next_review_at` (which may have been cascade-bumped). This makes the operation **fully reversible**: changing pace multiple times always produces the same final schedule as if you had started with that pace.
- **Overdue reviews are left untouched** — only rows with `next_review_at > now` are redistributed. Past-due reviews are genuinely owed and should not be rescheduled.
- **Local date boundaries** — slot counts are keyed by the user's local calendar date (via `tzOffset`), matching the same "day" definition used in the due queue and calendar UI.
- **Cascade order** — reviews are sorted by ideal date ascending so earlier-due reviews claim earlier slots; later reviews cascade forward only as far as needed.
- **Single upsert** — all `next_review_at` updates are applied in one `upsert` call with `onConflict: "user_id,problem_id"`, generating a single SQL round-trip. Only `next_review_at` is touched; all other columns are preserved by the `DO UPDATE SET` clause.
- **Error handling** — if fetching list items fails, the backfill aborts early and logs structured context (`listId`, `userId`, error). The attempt/pace-change response still succeeds; the backfill is best-effort.

## Statistics Tracked

For each problem, the system tracks:

- **stage**: Current mastery stage (1–3)
- **last_attempt_at**: Timestamp of most recent attempt
- **last_success_at**: Timestamp of most recent successful attempt (Grade ≥ 1)
- **next_review_at**: Scheduled next review date
- **attempt_count**: Total number of attempts
- **success_count**: Number of successful attempts (Grade ≥ 1)
- **fail_count**: Number of failed attempts (Grade 0)
- **interval_days**: Current interval in days

## Tuning Parameters

Located in `/app/api/problems/[problemKey]/attempts/route.ts` in `computeNextProgress`:

| Constant            | Value   | Purpose                                 |
| ------------------- | ------- | --------------------------------------- |
| `MAX_INTERVAL_GOOD` | 30 days | Cap for Grade 1 — monthly maintenance   |
| `MAX_INTERVAL_EASY` | 90 days | Cap for Grade 2 — quarterly maintenance |
| Grade 1 multiplier  | ×2.0    | Growth rate for "good" solves           |
| Grade 2 multiplier  | ×2.3    | Growth rate for "easy" solves           |
| Grade 0 multiplier  | ×0.25   | Shrink rate for fails                   |

## Algorithm Credits

Inspired by:

- **SuperMemo SM-2**: Original spaced repetition algorithm
- **Anki**: Popular spaced repetition software

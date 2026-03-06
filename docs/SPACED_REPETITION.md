# Spaced Repetition System

## Overview

This application uses a spaced repetition algorithm to help users retain algorithmic problem-solving skills over time. The system tracks user progress through **stages** and schedules reviews at increasing intervals based on performance **grades**.

## Grades

When logging a solve attempt, users choose one of three grades:

| Grade | Label | Meaning |
|-------|-------|---------|
| **0** | ❌ Again | Failed to solve or needed the solution |
| **1** | 👍 Good | Solved but slow, messy, or needed hints |
| **2** | ✅ Easy | Solved cleanly without hints |

## Stages

Stages are a UI label showing conceptual mastery level. They do **not** affect the interval calculation.

| Stage | Label | Description |
|-------|-------|-------------|
| **1** | 🌱 Learning | Just starting the problem |
| **2** | 🔄 Reinforcing | Building understanding |
| **3** | ✅ Mastered | Confident mastery |

### Stage Progression

- **Grade 1 or 2 (success)**: advance one stage (max 3). First attempt always → Stage 1.
- **Grade 0 (fail)**: drop one stage (min 1). First attempt always → Stage 1.

## Interval Calculations

Intervals grow purely from the **previous interval × a grade multiplier**, with a hard cap to prevent unbounded growth.

### First Attempt

Always **1 day** — regardless of grade. Reviewing the next day confirms the memory is forming before extending the interval.

### Subsequent Attempts

| Grade | Multiplier | Cap | Approximate sequence |
|-------|-----------|-----|----------------------|
| **0 (Again)** | ×0.25, min 1 day | — | Shrinks to ~¼ of current (same/next-day repair) |
| **1 (Good)** | ×2.0 | 30 days | 1 → 2 → 4 → 8 → 16 → 30 → 30 → … |
| **2 (Easy)** | ×2.3 | 90 days | 1 → 3 → 7 → 17 → 40 → 90 → 90 → … |

Once an interval hits its cap it stays there, functioning as maintenance review (monthly for Good, quarterly for Easy).

### Fail behaviour

`floor(prevInterval × 0.25)`, minimum 1 day:

| Was at | After fail |
|--------|-----------|
| 1 day  | 1 day (same/next-day repair) |
| 4 days | 1 day |
| 7 days | 1 day |
| 30 days | 7 days |
| 90 days | 22 days |

## Example Scenarios

### Scenario 1: Clean solves (all Easy)

| Attempt | Grade | Interval |
|---------|-------|----------|
| 1st | Easy | 1 day |
| 2nd | Easy | 3 days |
| 3rd | Easy | 7 days |
| 4th | Easy | 17 days |
| 5th | Easy | 40 days |
| 6th+ | Easy | 90 days (maintenance) |

### Scenario 2: Steady progress (all Good)

| Attempt | Grade | Interval |
|---------|-------|----------|
| 1st | Good | 1 day |
| 2nd | Good | 2 days |
| 3rd | Good | 4 days |
| 4th | Good | 8 days |
| 5th | Good | 16 days |
| 6th+ | Good | 30 days (maintenance) |

### Scenario 3: Failure and recovery

| Attempt | Grade | Interval | Note |
|---------|-------|----------|------|
| 1st | Good | 1 day | |
| 2nd | Good | 2 days | |
| 3rd | Good | 4 days | |
| 4th | Again | 1 day | repair |
| 5th | Good | 2 days | restarting growth |
| 6th | Good | 4 days | |

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

| Constant | Value | Purpose |
|----------|-------|---------|
| `MAX_INTERVAL_GOOD` | 30 days | Cap for Grade 1 — monthly maintenance |
| `MAX_INTERVAL_EASY` | 90 days | Cap for Grade 2 — quarterly maintenance |
| Grade 1 multiplier | ×2.0 | Growth rate for "good" solves |
| Grade 2 multiplier | ×2.3 | Growth rate for "easy" solves |
| Grade 0 multiplier | ×0.25 | Shrink rate for fails |

## Algorithm Credits

Inspired by:
- **SuperMemo SM-2**: Original spaced repetition algorithm
- **Anki**: Popular spaced repetition software


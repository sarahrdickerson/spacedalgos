# API Routes Documentation

This document provides an overview of all API routes available in the application.

## Table of Contents

- [Problem Lists](#problem-lists)
- [Problems](#problems)
- [User](#user)

---

## Problem Lists

### Get All Problem Lists

**Endpoint:** `GET /api/problemlists`

**Description:** Fetches all available problem lists.

**Authentication:** Not required

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "key": "blind75",
      "name": "Blind 75",
      "source": "LeetCode",
      "version": "1.0",
      "description": "Curated list of 75 essential coding problems"
    }
  ],
  "count": 1
}
```

---

### Get Problem List Items

**Endpoint:** `GET /api/problemlists/[listKey]/items`

**Description:** Fetches all problems in a specific problem list with their details.

**Authentication:** Not required

**URL Parameters:**
- `listKey` - The unique key identifier for the problem list (e.g., "blind75")

**Response:**
```json
{
  "list": {
    "id": "uuid",
    "key": "blind75",
    "name": "Blind 75"
  },
  "items": [
    {
      "id": "uuid",
      "order_index": 1,
      "created_at": "2026-01-01T00:00:00Z",
      "problem": {
        "id": "uuid",
        "key": "two-sum",
        "title": "Two Sum",
        "difficulty": "Easy",
        "category": "Array",
        "leetcode_slug": "two-sum",
        "leetcode_url": "https://leetcode.com/problems/two-sum",
        "is_premium": false
      }
    }
  ],
  "count": 75
}
```

---

### Get Problem List Progress

**Endpoint:** `GET /api/problemlists/[listKey]/progress`

**Description:** Fetches all problems in a specific problem list along with the authenticated user's progress on each problem.

**Authentication:** Required

**URL Parameters:**
- `listKey` - The unique key identifier for the problem list

**Response:**
```json
{
  "list": {
    "id": "uuid",
    "key": "blind75",
    "name": "Blind 75"
  },
  "problems": [
    {
      "id": "uuid",
      "key": "two-sum",
      "title": "Two Sum",
      "difficulty": "Easy",
      "category": "Array",
      "leetcode_slug": "two-sum",
      "leetcode_url": "https://leetcode.com/problems/two-sum",
      "is_premium": false,
      "order_index": 1,
      "progress": {
        "stage": 2,
        "interval_days": 4,
        "next_review_at": "2026-03-10T00:00:00Z",
        "last_attempted_at": "2026-03-06T00:00:00Z",
        "attempt_count": 3,
        "success_count": 2,
        "fail_count": 1
      }
    }
  ]
}
```

**Progress Stages:**
- `1` - Learning
- `2` - Reinforcing
- `3` - Mastered

---

### Get Problem List Stats

**Endpoint:** `GET /api/problemlists/[listKey]/stats`

**Description:** Fetches progress statistics for a specific problem list for the authenticated user.

**Authentication:** Required

**URL Parameters:**
- `listKey` - The unique key identifier for the problem list

**Response:**
```json
{
  "total": 75,
  "mastered": 15,
  "dueToday": 5,
  "inProgress": 25,
  "notStarted": 35
}
```

---

### Get Due Problems

**Endpoint:** `GET /api/problemlists/[listKey]/due`

**Description:** Fetches the user's review queue for a specific problem list. Returns three categories of problems merged into `due_problems`:

1. **Scheduled reviews** — problems with a `next_review_at` due any time today or earlier
2. **New problems (today)** — unseen problems filling today's `new_per_day` quota (only when no overdue reviews exist). These have `is_new: true` and no `projected_date`
3. **Upcoming new problems** — projected unseen problems for the rest of this calendar week (through Saturday). These have `is_new: true` and a `projected_date` (ISO date string)

New problems are only surfaced when all overdue reviews are caught up. Today's new quota is reduced by any new problems already logged today, so completing one new problem does not pull the next unseen problem into the same day's quota.

**Authentication:** Required

**URL Parameters:**
- `listKey` - The unique key identifier for the problem list

**Response:**
```json
{
  "list": {
    "id": "uuid",
    "key": "blind75",
    "name": "Blind 75"
  },
  "due_problems": [
    {
      "id": "uuid",
      "key": "two-sum",
      "title": "Two Sum",
      "difficulty": "Easy",
      "category": "Array",
      "leetcode_url": "https://leetcode.com/problems/two-sum",
      "order_index": 1,
      "is_new": false,
      "projected_date": null,
      "progress": {
        "stage": 2,
        "next_review_at": "2026-03-06T00:00:00Z",
        "last_attempt_at": "2026-03-03T00:00:00Z",
        "attempt_count": 3,
        "success_count": 2,
        "fail_count": 1,
        "interval_days": 3,
        "days_until": -3,
        "days_overdue": 3
      }
    },
    {
      "id": "uuid",
      "key": "valid-anagram",
      "title": "Valid Anagram",
      "difficulty": "Easy",
      "category": "Arrays & Hashing",
      "leetcode_url": "https://leetcode.com/problems/valid-anagram/",
      "order_index": 2,
      "is_new": true,
      "projected_date": null,
      "progress": null
    },
    {
      "id": "uuid",
      "key": "group-anagrams",
      "title": "Group Anagrams",
      "difficulty": "Medium",
      "category": "Arrays & Hashing",
      "leetcode_url": "https://leetcode.com/problems/group-anagrams/",
      "order_index": 3,
      "is_new": true,
      "projected_date": "2026-03-07",
      "progress": null
    }
  ],
  "count": 3
}
```

**Notes:**
- `days_until` is negative when overdue
- Problems with `is_new: true` and `projected_date: null` are today's new problems
- Problems with `is_new: true` and a `projected_date` are projected for a future day this week

---

### Get Calendar Data

**Endpoint:** `GET /api/problemlists/[listKey]/calendar`

**Description:** Fetches calendar data for a specific problem list, including past attempts, upcoming scheduled reviews, and projected new problems for the authenticated user.

**Authentication:** Required

**URL Parameters:**
- `listKey` - The unique key identifier for the problem list

**Response:**
```json
{
  "past_attempts": [
    {
      "problem_id": "uuid",
      "problem_key": "two-sum",
      "problem_title": "Two Sum",
      "difficulty": "Easy",
      "category": "Array",
      "attempted_at": "2026-03-03T10:30:00Z",
      "grade": 1,
      "stage": 2,
      "attempt_number": 3
    }
  ],
  "upcoming_reviews": [
    {
      "problem_id": "uuid",
      "problem_key": "two-sum",
      "problem_title": "Two Sum",
      "difficulty": "Easy",
      "category": "Array",
      "next_review_at": "2026-03-09T00:00:00Z",
      "stage": 2,
      "attempt_count": 3
    }
  ],
  "projected_new": [
    {
      "problem_id": "uuid",
      "problem_key": "valid-anagram",
      "problem_title": "Valid Anagram",
      "difficulty": "Easy",
      "category": "Arrays & Hashing",
      "projected_date": null,
      "is_today_new": true,
      "order_index": 2
    },
    {
      "problem_id": "uuid",
      "problem_key": "group-anagrams",
      "problem_title": "Group Anagrams",
      "difficulty": "Medium",
      "category": "Arrays & Hashing",
      "projected_date": "2026-03-07",
      "is_today_new": false,
      "order_index": 3
    }
  ]
}
```

**Notes:**
- `past_attempts` are ordered by `attempted_at` descending (most recent first)
- `attempt_number` is calculated in O(n) time using a decrementing counter
- `upcoming_reviews` only includes problems with a scheduled `next_review_at`
- `projected_new` entries with `is_today_new: true` have `projected_date: null`; the client resolves these to the current local date to avoid UTC date-shift issues
- Today's `projected_new` quota is reduced by any new problems already logged today, so a completed new problem does not cause the next unseen problem to appear on the same day

---

### Reset Problem List Progress

**Endpoint:** `DELETE /api/problemlists/[listKey]/reset-progress`

**Description:** Deletes all attempts and progress for every problem in the specified list for the authenticated user.

**Authentication:** Required

**URL Parameters:**
- `listKey` - The unique key identifier for the problem list

**Response:**
```json
{
  "success": true,
  "message": "Progress reset for all problems in: Blind 75",
  "deleted": {
    "problem_count": 75,
    "list_name": "Blind 75"
  }
}
```

---

## Problems

### Log Problem Attempt

**Endpoint:** `POST /api/problems/[problemKey]/attempts`

**Description:** Logs a new attempt for a specific problem and updates the user's spaced repetition progress.

**Authentication:** Required

**URL Parameters:**
- `problemKey` - The unique key identifier for the problem (e.g., "two-sum")

**Request Body:**
```json
{
  "grade": 1,
  "time_bucket": "0-15m",
  "note": "Solved using hashmap approach",
  "attempted_at": "2026-03-06T10:30:00Z"
}
```

**Body Parameters:**
- `grade` (required) - Performance rating: `0` (fail/again), `1` (good), `2` (easy)
- `time_bucket` (optional) - Time taken: `"0-15m"`, `"15-30m"`, `"30-45m"`, `"45-60m"`, `"60m+"`
- `note` (optional) - Notes about the attempt
- `attempted_at` (optional) - ISO timestamp (defaults to current time)

**Response:**
```json
{
  "attempt": {
    "id": "uuid",
    "user_id": "uuid",
    "problem_id": "uuid",
    "grade": 1,
    "time_bucket": "0-15m",
    "note": "Solved using hashmap approach",
    "attempted_at": "2026-03-06T10:30:00Z"
  },
  "progress": {
    "user_id": "uuid",
    "problem_id": "uuid",
    "stage": 2,
    "interval_days": 2,
    "next_review_at": "2026-03-08T00:00:00Z",
    "last_attempted_at": "2026-03-06T10:30:00Z",
    "attempt_count": 2,
    "success_count": 1,
    "fail_count": 0
  }
}
```

**Spaced Repetition Algorithm:**

Intervals grow purely from the previous interval value — no stage-based multipliers. Stages are cosmetic labels only.

**Stage transitions:**
- First attempt (any grade) → Stage 1
- Grade ≥ 1 → `min(3, stage + 1)`
- Grade 0 → `max(1, stage - 1)`

**Interval calculation:**

| Condition | Formula | Cap |
|-----------|---------|-----|
| First attempt | 1 day | — |
| Grade 0 (Fail) | `floor(prev × 0.25)` | min 1 day |
| Grade 1 (Good) | `ceil(prev × 2.0)` | max 30 days |
| Grade 2 (Easy) | `ceil(prev × 2.3)` | max 90 days |

**Example sequences:**
- **Good (grade 1):** 1 → 2 → 4 → 8 → 16 → 30 → 30 days (monthly maintenance)
- **Easy (grade 2):** 1 → 3 → 7 → 17 → 40 → 90 → 90 days (quarterly maintenance)
- **Fail (grade 0) from 8 days:** 8 → 2 → 1 days

---

### Get Problem History

**Endpoint:** `GET /api/problems/[problemKey]/history`

**Description:** Fetches all attempt history for a specific problem for the authenticated user.

**Authentication:** Required

**URL Parameters:**
- `problemKey` - The unique key identifier for the problem

**Response:**
```json
{
  "problem": {
    "id": "uuid",
    "title": "Two Sum"
  },
  "attempts": [
    {
      "id": "uuid",
      "grade": 1,
      "time_bucket": "0-15m",
      "note": "Solved using hashmap",
      "attempted_at": "2026-03-06T10:30:00Z"
    },
    {
      "id": "uuid",
      "grade": 0,
      "time_bucket": "30-45m",
      "note": "Had trouble with edge cases",
      "attempted_at": "2026-03-01T14:20:00Z"
    }
  ],
  "count": 2
}
```

---

### Reset Problem Progress

**Endpoint:** `DELETE /api/problems/[problemKey]/reset`

**Description:** Deletes all attempts and progress for a specific problem for the authenticated user.

**Authentication:** Required

**URL Parameters:**
- `problemKey` - The unique key identifier for the problem

**Response:**
```json
{
  "success": true,
  "message": "Progress reset for problem: Two Sum",
  "deleted": {
    "attempts_count": 5,
    "progress_deleted": true
  }
}
```

---

## User

### Get Active Study Plan

**Endpoint:** `GET /api/user/active-study-plan`

**Description:** Fetches the authenticated user's currently active study plan and problem list.

**Authentication:** Required

**Response:**
```json
{
  "active_list": {
    "id": "uuid",
    "key": "blind75",
    "name": "Blind 75",
    "source": "LeetCode",
    "version": "1.0",
    "description": "Curated list of 75 essential coding problems"
  },
  "study_plan": {
    "pace": "normal",
    "new_per_day": 2,
    "review_per_day": 4,
    "start_date": "2026-03-01",
    "target_end_date": null
  }
}
```

**Response (No Active Plan):**
```json
{
  "active_list": null,
  "study_plan": null
}
```

---

### Set Active Study Plan

**Endpoint:** `POST /api/user/active-study-plan`

**Description:** Creates or updates the authenticated user's active study plan. Upserts the new plan first, then deactivates all other plans for the user, so a partial failure never leaves the user with no active plan.

**Authentication:** Required

**Request Body:**
```json
{
  "list_id": "uuid",
  "pace": "normal",
  "new_per_day": 2,
  "review_per_day": 4
}
```

**Body Parameters:**
- `list_id` (required) - UUID of the problem list to activate
- `pace` (optional, default `"normal"`) - One of: `"leisurely"`, `"normal"`, `"accelerated"`, `"custom"`
- `new_per_day` (optional) - New problems per day; required when `pace` is `"custom"`, otherwise defaults from preset
- `review_per_day` (optional) - Reviews per day; required when `pace` is `"custom"`, otherwise defaults from preset

**Preset values:**

| Pace | new_per_day | review_per_day |
|------|-------------|----------------|
| leisurely | 1 | 2 |
| normal | 2 | 4 |
| accelerated | 3 | 6 |

Both `new_per_day` and `review_per_day` must be finite positive integers after preset resolution.

**Response:**
```json
{
  "success": true,
  "active_list": {
    "id": "uuid",
    "key": "blind75",
    "name": "Blind 75",
    "source": "LeetCode",
    "version": "1.0"
  }
}
```

---

### Remove Active Study Plan

**Endpoint:** `DELETE /api/user/active-study-plan`

**Description:** Removes the authenticated user's active study plan. Clears `user_preferences.active_list_id` and sets the corresponding `user_study_plans.is_active` to `false` so list-scoped routes (due/calendar) immediately stop treating the plan as active. Does not delete progress data.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Active study plan removed"
}
```

---

### Get Streak & Activity

**Endpoint:** `GET /api/user/streak`

**Description:** Fetches the authenticated user's current streak, longest streak, and recent daily activity for the last 30 days. Automatically treats the streak as broken if the last activity was before yesterday.

**Authentication:** Required

**Response:**
```json
{
  "current_streak": 5,
  "longest_streak": 12,
  "last_activity_date": "2026-03-06",
  "recent_activity": [
    {
      "activity_date": "2026-03-06",
      "problems_reviewed": 3,
      "problems_due_completed": 2
    },
    {
      "activity_date": "2026-03-05",
      "problems_reviewed": 2,
      "problems_due_completed": 2
    }
  ]
}
```

**Response (No Activity):**
```json
{
  "current_streak": 0,
  "longest_streak": 0,
  "last_activity_date": null,
  "recent_activity": []
}
```

---

## Authentication

Most endpoints require authentication via Supabase Auth (session cookie). Unauthenticated requests to protected endpoints return:

```json
{
  "error": "Unauthorized"
}
```

## Error Responses

**400 Bad Request:**
```json
{ "error": "list_id is required" }
```

**404 Not Found:**
```json
{ "error": "Problem list not found" }
```

**500 Internal Server Error:**
```json
{ "error": "Failed to fetch problem lists" }
```

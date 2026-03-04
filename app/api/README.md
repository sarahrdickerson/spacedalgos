# API Routes Documentation

This document provides an overview of all API routes available in the application.

## Table of Contents

- [Problem Lists](#problem-lists)
- [Problems](#problems)
- [User Preferences](#user-preferences)

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
        "interval_days": 3,
        "next_review_at": "2026-03-06T00:00:00Z",
        "last_attempted_at": "2026-03-03T00:00:00Z",
        "attempt_count": 5,
        "success_count": 4,
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

**Description:** Fetches all problems from a specific problem list that are due for review, along with the user's progress.

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
      "leetcode_slug": "two-sum",
      "leetcode_url": "https://leetcode.com/problems/two-sum",
      "is_premium": false,
      "order_index": 1,
      "progress": {
        "stage": 2,
        "interval_days": 3,
        "next_review_at": "2026-03-03T00:00:00Z",
        "last_attempted_at": "2026-02-28T00:00:00Z",
        "attempt_count": 3,
        "success_count": 2,
        "fail_count": 1
      }
    }
  ],
  "count": 5
}
```

---

### Get Calendar Data

**Endpoint:** `GET /api/problemlists/[listKey]/calendar`

**Description:** Fetches calendar data for a specific problem list, including past attempts and upcoming reviews for the authenticated user.

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
      "next_review_at": "2026-03-06T00:00:00Z",
      "stage": 2,
      "attempt_count": 3
    }
  ]
}
```

**Notes:**
- `past_attempts` are ordered by `attempted_at` descending (most recent first)
- `attempt_number` is calculated efficiently in O(n) time using a decrementing counter
- `upcoming_reviews` only includes problems with scheduled review dates

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
  "attempted_at": "2026-03-03T10:30:00Z"
}
```

**Body Parameters:**
- `grade` (required) - Performance rating: `0` (fail/again), `1` (good), `2` (easy)
- `time_bucket` (optional) - Time taken to solve: "0-15m", "15-30m", "30-45m", "45-60m", "60m+"
- `note` (optional) - Additional notes about the attempt
- `attempted_at` (optional) - ISO timestamp of when the attempt was made (defaults to current time)

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
    "attempted_at": "2026-03-03T10:30:00Z"
  },
  "progress": {
    "user_id": "uuid",
    "problem_id": "uuid",
    "stage": 2,
    "interval_days": 3,
    "next_review_at": "2026-03-06T00:00:00Z",
    "last_attempted_at": "2026-03-03T10:30:00Z",
    "attempt_count": 4,
    "success_count": 3,
    "fail_count": 1
  }
}
```

**Spaced Repetition Logic:**

**Stage Progression:**
- **Stage 0 → 1**: First attempt (any grade)
- **Stage 1 → 2**: Successful attempt (grade ≥ 1)
- **Stage 2 → 3 (Mastered)**: Successful attempt (grade ≥ 1)
- **Failure (grade = 0)**: Drop one stage (minimum stage 1)

**Interval Calculation:**

Base intervals by stage:
- **Stage 1 (Learning)**: 2 days base
- **Stage 2 (Reinforcing)**: 5 days base  
- **Stage 3 (Mastered)**: 21 days base

Grade multipliers:
- **Grade 0 (Again/Fail)**: 0.3x multiplier, shrinks interval
- **Grade 1 (Good)**: 1.0x multiplier
- **Grade 2 (Easy)**: 1.5x multiplier

Growth patterns:
- **Stage 1-2**: Interval grows by 1.3x on success
- **First time reaching Stage 3**: `Math.ceil(prevInterval * 1.5 * mult)`, enforced minimum 21 days
- **Already at Stage 3**: Interval grows by `Math.ceil(prevInterval * 2.0 * 1.4 * mult)` (2.8x for grade 1)

**Examples (grade 1):**
- First attempt: Stage 1, 2-day interval
- Stage 1 → 2: Stage 2, 3 days (ceil(2 * 1.3 * 1.0) = 3)
- Stage 2 → 3: Stage 3, 21 days (max(ceil(3 * 1.5 * 1.0), 21) = 21)
- Stage 3 review: Stage 3, 59 days (ceil(21 * 2.0 * 1.4 * 1.0) = 59)
- Stage 3 review again: Stage 3, 166 days (ceil(59 * 2.0 * 1.4 * 1.0) = 166)

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
      "attempted_at": "2026-03-03T10:30:00Z"
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

## User Preferences

### Get Active Study Plan

**Endpoint:** `GET /api/user/active-study-plan`

**Description:** Fetches the authenticated user's currently active study plan/problem list.

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
  }
}
```

**Response (No Active Plan):**
```json
{
  "active_list": null
}
```

---

### Set Active Study Plan

**Endpoint:** `POST /api/user/active-study-plan`

**Description:** Sets or updates the authenticated user's active study plan.

**Authentication:** Required

**Request Body:**
```json
{
  "list_id": "uuid"
}
```

**Body Parameters:**
- `list_id` (required) - The UUID of the problem list to set as active

**Response:**
```json
{
  "success": true,
  "active_list": {
    "id": "uuid",
    "key": "blind75",
    "name": "Blind 75",
    "source": "LeetCode",
    "version": "1.0",
    "description": "Curated list of 75 essential coding problems"
  }
}
```

---

### Remove Active Study Plan

**Endpoint:** `DELETE /api/user/active-study-plan`

**Description:** Removes the authenticated user's active study plan (sets to null). Does not delete progress data.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Active study plan removed"
}
```

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

## Authentication

Most endpoints require authentication. The application uses Supabase Auth with session-based authentication. Authenticated requests automatically include the user's session cookie.

**Unauthorized Response (401):**
```json
{
  "error": "Unauthorized"
}
```

## Error Responses

All endpoints may return the following error responses:

**400 Bad Request:**
```json
{
  "error": "Missing required parameter: listKey"
}
```

**404 Not Found:**
```json
{
  "error": "Problem list not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to fetch problem lists"
}
```

# Tests

**Framework:** [Vitest](https://vitest.dev/)

```bash
npm test          # run once
npm run test:watch  # watch mode
```

---

## Structure

```
__tests__/
├── helpers/
│   └── mockSupabase.ts          # Shared Supabase mock factory
└── lib/
    ├── api/
    │   └── localDateUtils.test.ts   # Timezone utility helpers
    └── sr/
        ├── algorithm.test.ts        # Spaced repetition algorithm
        ├── cascade.test.ts          # Write-time review cap enforcement
        └── backfill.test.ts         # Pace-change review redistribution
```

The tested modules live under `lib/`:

| Test file | Module under test |
| --------- | ----------------- |
| `localDateUtils.test.ts` | `lib/api/localDateUtils.ts` |
| `algorithm.test.ts` | `lib/sr/algorithm.ts` |
| `cascade.test.ts` | `lib/sr/cascade.ts` |
| `backfill.test.ts` | `lib/sr/backfill.ts` |

---

## What is tested

### `localDateUtils` (18 tests)

Pure timezone conversion helpers used by all scheduling code.

- **`utcToLocalDateStr`** — converts a UTC timestamp (ISO string or ms) to the user's local `YYYY-MM-DD`. Covers UTC, CST (tzOffset=360), CDT (300), AEST (-600), `null` (UTC fallback), month/year boundaries, and ISO-vs-ms input parity.
- **`localDayBoundsUTC`** — returns `{ startMs, endMs }` for the UTC millisecond window that covers a given local calendar day. Verified for each timezone that `endMs - startMs === 86_400_000` always holds.
- **`nextLocalDateStr`** — advances a local `YYYY-MM-DD` by one calendar day. Covers normal days, month-end, year-end, leap-year Feb 28, and non-leap Feb 28.

### `algorithm` (54 tests)

Pure function — no mocking required.

**`addDays`**
- Adds the correct number of UTC days and preserves the time-of-day component (this is what makes review scheduling timezone-safe — the interval is always relative to the moment of the attempt, not midnight).
- Does not mutate the input date.
- Handles month/year boundaries and zero-day addition.

**`computeNextProgress` — first attempt**
- All three grades produce `stage=1` regardless of grade (first attempt always starts at Learning).
- Intervals: grade 0 and 1 → 1 day; grade 2 → 3 days.
- `last_success_at` is `null` for grade 0, set for grades 1 and 2.
- `next_review_at`, `last_attempt_at`, and counters are set correctly.

**`computeNextProgress` — second attempt**
- Uses fixed intervals (not the grade multiplier): grade 0 → 1, grade 1 → 3, grade 2 → 7. This is intentional — the second attempt uses a fixed ramp rather than the open-ended ×2.0/×2.3 multipliers.

**`computeNextProgress` — subsequent attempts**
- Grade 0 (fail): `floor(prev × 0.25)`, minimum 1 day. Verified at prev=1, 4, 8, 30, 90.
- Grade 1 (good) sequence from prevInterval=3: `3 → 6 → 12 → 24 → 30 → 30` (caps at `MAX_INTERVAL_GOOD=30`).
- Grade 2 (easy) sequence from prevInterval=3: `3 → 7 → 17 → 40 → 90 → 90` (caps at `MAX_INTERVAL_EASY=90`).

**Stage transitions** — all 12 combinations:

| prevStage | grade 0 | grade 1 | grade 2 |
| --------- | ------- | ------- | ------- |
| null (first) | 1 | 1 | 1 |
| 1 | 1 (floor) | 2 | 2 |
| 2 | 1 | 2 (stays) | 3 |
| 3 | 2 | 2 (**demoted** — Good cannot maintain Mastered) | 3 (stays) |

**Counter accumulation** — verifies `attempt_count`, `success_count`, `fail_count` accumulate correctly from arbitrary prior values, including a full three-attempt sequence from zero baseline.

### `cascade` (14 tests)

Tests `cascadeNextReviewDate`, which enforces `review_per_day` at write time by shifting `next.next_review_at` forward to the first local calendar day with remaining capacity.

Each test passes a `next` object and asserts its `next_review_at` after the call.

**Early exits (no change to `next_review_at`):**
- Problem not in any list
- DB error on list-membership lookup
- No active study plan for the list
- DB error on study plan lookup
- `review_per_day = 0`
- Only one problem in the list (current problem is filtered out, leaving no peers to count against)

**Slot counting — UTC:**
- Target day under cap (2 reviews, cap=4) → original timestamp preserved as-is (not normalized to midnight)
- Target day at cap (2 reviews, cap=2) → bumped to next day; `next_review_at` set to UTC start of that local day
- Two consecutive days full → bumped two days out

**Slot counting — CDT timezone (tzOffset=300):**
- Review at 11:30 PM CDT (`"2026-04-17T03:30:00Z"`) with 3/4 slots used on CDT April 16 → no bump, original preserved
- CDT April 16 full (4/4) → bumped to CDT April 17 start (`"2026-04-17T05:00:00Z"`)
- A review stored as `"2026-04-17T02:00:00Z"` (UTC April 17) but belonging to CDT April 16 is correctly counted against April 16's local slot (not April 17's) — this is the core timezone-boundary correctness test

**Edge cases:**
- 7-day limit exhausted (all days full) → `next_review_at` kept at original value
- DB error on scheduled-reviews fetch → function throws (propagates to caller)

### `backfill` (13 tests)

Tests `backfillReviewSchedule`, which redistributes all future scheduled reviews when `review_per_day` changes.

**Early exits:**
- Empty list (no problems) → only 1 DB call made, no upsert
- DB error on list-items fetch → early return
- No future reviews (progressRows empty) → no upsert
- DB error on progress fetch → early return

**Ideal date computation:**
- Ideal date in the future → used as the base date for scheduling
- Ideal date in the past → clamped to today (uses `localDate` param or `utcToLocalDateStr(now)`)

**Slot distribution:**
- Two reviews with the same ideal date, cap=1 → first gets that date, second bumped to next day
- Input order doesn't matter — reviews are sorted by ideal date ascending before slot assignment, so earlier-due reviews always claim earlier slots
- 5 reviews across 3 ideal dates with cap=2: A,B→Apr17; C,D→Apr18; E→Apr19

**Timezone — CDT (tzOffset=300):**
- Review with ideal UTC time `"2026-04-17T10:00:00Z"` (5 AM CDT, local date April 17) → `next_review_at` placed at CDT April 17 start = `"2026-04-17T05:00:00Z"`
- Review with ideal UTC time `"2026-04-17T03:00:00Z"` (10 PM CDT April 16) → `next_review_at` placed at CDT April 16 start = `"2026-04-16T05:00:00Z"` (cross-UTC-midnight case)

**Upsert contract:**
- Upsert is not called when the updates list is empty (all reviews filtered as overdue)
- Each upsert entry contains exactly `{ user_id, problem_id, next_review_at }` — no extra columns that could overwrite unrelated progress fields
- `onConflict` option is `"user_id,problem_id"`
- `next_review_at` values are valid ISO strings

---

## Test helper: `mockSupabase`

```typescript
import { createMockSupabase, ok, err } from "@/__tests__/helpers/mockSupabase";

const supabase = createMockSupabase([
  ok({ list_id: "list-1" }),    // first from() call returns this
  err("DB error"),               // second from() call returns this error
  ok([{ problem_id: "A" }]),    // third from() call returns this array
]);
```

`createMockSupabase` returns a queue-based mock where each call to `.from()` consumes one response from the array. The builder supports all Supabase chain methods (`.select()`, `.eq()`, `.in()`, `.gt()`, etc.) and resolves via terminal methods (`.maybeSingle()`, `.single()`, `.upsert()`) or direct `await` (thenable builder).

`supabase.callCount` reports how many `.from()` calls have been made, useful for asserting early exits without making a full custom mock.

For tests that need to capture upsert arguments (backfill tests 5–13), a hand-rolled mock is used that captures the `data` and `opts` arguments passed to `.upsert()`.

---

## Why these tests matter

The two hardest invariants in this codebase are:

1. **Timezone correctness** — the server runs UTC but all scheduling must respect the user's local calendar day. A review logged at 10 PM CDT is stored as the next UTC day; slot-counting must recognize it as belonging to the local CDT day or the `review_per_day` cap can be silently exceeded. The cascade and backfill tests verify this directly with CDT (tzOffset=300) scenarios.

2. **Write-time cap enforcement** — `review_per_day` is enforced when an attempt is logged (not when the due queue is read), which is the only way to correctly distinguish a bumped review (exceeded cap → future date) from an overdue review (missed session → past date). The cascade tests verify that bumped dates land at the correct local day start and that the original timestamp is preserved when no bump is needed.

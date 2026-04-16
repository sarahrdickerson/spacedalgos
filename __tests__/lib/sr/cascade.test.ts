import { describe, it, expect } from "vitest";
import { cascadeNextReviewDate } from "@/lib/sr/cascade";
import { createMockSupabase, ok, err } from "@/__tests__/helpers/mockSupabase";

const userId = "user-1";
const problemId = "prob-1";

// ---------------------------------------------------------------------------
// Helper: make a next object
// ---------------------------------------------------------------------------
function makeNext(next_review_at: string, interval_days = 7) {
  return { next_review_at, interval_days };
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

describe("cascadeNextReviewDate", () => {
  it("1. Problem not in any list → next_review_at unchanged", async () => {
    const supabase = createMockSupabase([
      ok(null), // listItem lookup returns null
    ]);
    const next = makeNext("2026-04-16T10:00:00Z");
    await cascadeNextReviewDate(supabase, userId, problemId, next, null);
    expect(next.next_review_at).toBe("2026-04-16T10:00:00Z");
  });

  it("2. List lookup DB error → next_review_at unchanged", async () => {
    const supabase = createMockSupabase([
      err("DB error"), // listItem lookup errors
    ]);
    const next = makeNext("2026-04-16T10:00:00Z");
    await cascadeNextReviewDate(supabase, userId, problemId, next, null);
    expect(next.next_review_at).toBe("2026-04-16T10:00:00Z");
  });

  it("3. No active study plan → next_review_at unchanged", async () => {
    const supabase = createMockSupabase([
      ok({ list_id: "list-1" }), // listItem found
      ok(null),                   // plan returns null
    ]);
    const next = makeNext("2026-04-16T10:00:00Z");
    await cascadeNextReviewDate(supabase, userId, problemId, next, null);
    expect(next.next_review_at).toBe("2026-04-16T10:00:00Z");
  });

  it("4. Plan DB error → next_review_at unchanged", async () => {
    const supabase = createMockSupabase([
      ok({ list_id: "list-1" }), // listItem found
      err("plan error"),          // plan returns error
    ]);
    const next = makeNext("2026-04-16T10:00:00Z");
    await cascadeNextReviewDate(supabase, userId, problemId, next, null);
    expect(next.next_review_at).toBe("2026-04-16T10:00:00Z");
  });

  it("5. review_per_day = 0 → next_review_at unchanged", async () => {
    const supabase = createMockSupabase([
      ok({ list_id: "list-1" }),       // listItem found
      ok({ review_per_day: 0 }),       // plan with review_per_day=0
    ]);
    const next = makeNext("2026-04-16T10:00:00Z");
    await cascadeNextReviewDate(supabase, userId, problemId, next, null);
    expect(next.next_review_at).toBe("2026-04-16T10:00:00Z");
  });

  it("6. Only one problem in list (current problem is the only one) → listProblemIds empty → unchanged", async () => {
    const supabase = createMockSupabase([
      ok({ list_id: "list-1" }),                 // listItem found
      ok({ review_per_day: 2 }),                 // plan found
      ok([{ problem_id: problemId }]),            // allListItems: only this problem
    ]);
    const next = makeNext("2026-04-16T10:00:00Z");
    await cascadeNextReviewDate(supabase, userId, problemId, next, null);
    expect(next.next_review_at).toBe("2026-04-16T10:00:00Z");
  });

  it("7. Target day has capacity (UTC) → next_review_at preserved as-is", async () => {
    // 2026-04-16, cap=4, only 2 reviews already scheduled on April 16 UTC
    const scheduledReviews = [
      { next_review_at: "2026-04-16T05:00:00Z" },
      { next_review_at: "2026-04-16T09:00:00Z" },
    ];
    const supabase = createMockSupabase([
      ok({ list_id: "list-1" }),
      ok({ review_per_day: 4 }),
      ok([{ problem_id: "prob-2" }, { problem_id: "prob-3" }]),
      ok(scheduledReviews),
    ]);
    const next = makeNext("2026-04-16T10:00:00Z");
    await cascadeNextReviewDate(supabase, userId, problemId, next, null);
    // 2 < 4, so no bump — original is preserved
    expect(next.next_review_at).toBe("2026-04-16T10:00:00Z");
  });

  it("8. Target day at cap → bumps to next day (UTC)", async () => {
    // April 16: 2 reviews, cap=2 → full; April 17: 0 reviews → bump
    const scheduledReviews = [
      { next_review_at: "2026-04-16T05:00:00Z" },
      { next_review_at: "2026-04-16T09:00:00Z" },
    ];
    const supabase = createMockSupabase([
      ok({ list_id: "list-1" }),
      ok({ review_per_day: 2 }),
      ok([{ problem_id: "prob-2" }, { problem_id: "prob-3" }]),
      ok(scheduledReviews),
    ]);
    const next = makeNext("2026-04-16T10:00:00Z");
    await cascadeNextReviewDate(supabase, userId, problemId, next, null);
    // bumped to UTC midnight of April 17 (null tzOffset → UTC midnight = day start)
    expect(next.next_review_at).toBe("2026-04-17T00:00:00.000Z");
  });

  it("9. Two days full → bumps two days (UTC)", async () => {
    // April 16: 2 reviews (full), April 17: 2 reviews (full), April 18: 0 → bump to 18th
    const scheduledReviews = [
      { next_review_at: "2026-04-16T05:00:00Z" },
      { next_review_at: "2026-04-16T09:00:00Z" },
      { next_review_at: "2026-04-17T05:00:00Z" },
      { next_review_at: "2026-04-17T09:00:00Z" },
    ];
    const supabase = createMockSupabase([
      ok({ list_id: "list-1" }),
      ok({ review_per_day: 2 }),
      ok([{ problem_id: "prob-2" }, { problem_id: "prob-3" }]),
      ok(scheduledReviews),
    ]);
    const next = makeNext("2026-04-16T10:00:00Z");
    await cascadeNextReviewDate(supabase, userId, problemId, next, null);
    expect(next.next_review_at).toBe("2026-04-18T00:00:00.000Z");
  });

  it("10. CDT user (tzOffset=300), review at 11:30 PM CDT, cap not exceeded → original preserved", async () => {
    // 2026-04-17T03:30:00Z = April 16, 11:30 PM CDT (tzOffset=300)
    // localDate of next_review_at = "2026-04-16" for CDT
    // 3 reviews already on CDT April 16 window, cap=4 → 3 < 4 → no bump
    const cdtApril16WindowStart = "2026-04-16T05:00:00Z"; // UTC start of CDT April 16
    const scheduledReviews = [
      { next_review_at: "2026-04-16T06:00:00Z" }, // CDT April 16
      { next_review_at: "2026-04-16T10:00:00Z" }, // CDT April 16
      { next_review_at: "2026-04-16T14:00:00Z" }, // CDT April 16
    ];
    const supabase = createMockSupabase([
      ok({ list_id: "list-1" }),
      ok({ review_per_day: 4 }),
      ok([{ problem_id: "prob-2" }, { problem_id: "prob-3" }]),
      ok(scheduledReviews),
    ]);
    const next = makeNext("2026-04-17T03:30:00Z"); // April 16 11:30 PM CDT
    await cascadeNextReviewDate(supabase, userId, problemId, next, 300);
    // 3 < 4 → no bump, original preserved
    expect(next.next_review_at).toBe("2026-04-17T03:30:00Z");
  });

  it("11. CDT user (tzOffset=300), April 16 CDT full → bumps to April 17 CDT start", async () => {
    // 2026-04-17T03:30:00Z = April 16, 11:30 PM CDT
    // CDT April 16 full (4 reviews), bump to April 17 CDT
    // April 17 CDT local start = Date.UTC(2026,3,17) + 300*60*1000 = "2026-04-17T05:00:00Z"
    const scheduledReviews = [
      { next_review_at: "2026-04-16T06:00:00Z" },
      { next_review_at: "2026-04-16T10:00:00Z" },
      { next_review_at: "2026-04-16T14:00:00Z" },
      { next_review_at: "2026-04-16T18:00:00Z" },
    ];
    const supabase = createMockSupabase([
      ok({ list_id: "list-1" }),
      ok({ review_per_day: 4 }),
      ok([{ problem_id: "prob-2" }, { problem_id: "prob-3" }]),
      ok(scheduledReviews),
    ]);
    const next = makeNext("2026-04-17T03:30:00Z");
    await cascadeNextReviewDate(supabase, userId, problemId, next, 300);
    // April 17 CDT local day starts at "2026-04-17T05:00:00Z"
    expect(next.next_review_at).toBe("2026-04-17T05:00:00.000Z");
  });

  it("12. Reviews crossing UTC midnight are counted on correct local CDT day", async () => {
    // tzOffset=300 (CDT)
    // "2026-04-17T02:00:00Z" = April 16, 9 PM CDT → local date "2026-04-16"
    // cap=1, 1 review already on CDT April 16 → full → bump to April 17 CDT
    const scheduledReviews = [
      { next_review_at: "2026-04-17T02:00:00Z" }, // April 16 9 PM CDT — UTC April 17
    ];
    const supabase = createMockSupabase([
      ok({ list_id: "list-1" }),
      ok({ review_per_day: 1 }),
      ok([{ problem_id: "prob-2" }]),
      ok(scheduledReviews),
    ]);
    // next review is on April 16 CDT (e.g. 11 PM CDT = 2026-04-17T04:00:00Z)
    const next = makeNext("2026-04-17T04:00:00Z");
    await cascadeNextReviewDate(supabase, userId, problemId, next, 300);
    // April 16 CDT is full (1 review), should bump to April 17 CDT start = "2026-04-17T05:00:00Z"
    expect(next.next_review_at).toBe("2026-04-17T05:00:00.000Z");
  });

  it("13. 7-day limit exhausted → keeps original value", async () => {
    // Fill all 7 days with 1 review each; cap=1 → every day is full → keep original
    // Window starts at April 16, covers April 16–22 (7 days with 6 increments)
    const scheduledReviews = [
      { next_review_at: "2026-04-16T00:00:00Z" }, // April 16
      { next_review_at: "2026-04-17T00:00:00Z" }, // April 17
      { next_review_at: "2026-04-18T00:00:00Z" }, // April 18
      { next_review_at: "2026-04-19T00:00:00Z" }, // April 19
      { next_review_at: "2026-04-20T00:00:00Z" }, // April 20
      { next_review_at: "2026-04-21T00:00:00Z" }, // April 21
      { next_review_at: "2026-04-22T00:00:00Z" }, // April 22
    ];
    const supabase = createMockSupabase([
      ok({ list_id: "list-1" }),
      ok({ review_per_day: 1 }),
      ok([{ problem_id: "prob-2" }]),
      ok(scheduledReviews),
    ]);
    const originalDate = "2026-04-16T10:00:00Z";
    const next = makeNext(originalDate);
    await cascadeNextReviewDate(supabase, userId, problemId, next, null);
    // All 7 days are full — keep original (no slot found within 7 days)
    expect(next.next_review_at).toBe(originalDate);
  });

  it("14. scheduledReviews DB error → throws", async () => {
    const supabase = createMockSupabase([
      ok({ list_id: "list-1" }),
      ok({ review_per_day: 2 }),
      ok([{ problem_id: "prob-2" }]),
      err("DB error on reviews"), // scheduledReviews query fails
    ]);
    const next = makeNext("2026-04-16T10:00:00Z");
    await expect(
      cascadeNextReviewDate(supabase, userId, problemId, next, null),
    ).rejects.toMatchObject({ message: "DB error on reviews" });
  });
});

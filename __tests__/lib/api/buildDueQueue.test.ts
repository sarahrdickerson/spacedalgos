import { describe, it, expect } from "vitest";
import { buildDueQueue, DueQueueParams } from "@/lib/api/buildDueQueue";

// ---------------------------------------------------------------------------
// Fixed test date: Thursday 2026-04-23 UTC (no timezone shift)
//
// tomorrowUTC (2026-04-24, Friday) → getUTCDay() = 5
// maxDays = (7 - 5) % 7 || 7 = 2  →  upcoming window = Fri Apr 24 + Sat Apr 25
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;
const localDayStartMs = Date.UTC(2026, 3, 23); // Apr 23 UTC midnight
const localDayEndMs = localDayStartMs + DAY_MS;
const localYear = 2026;
const localMonth = 4;
const localDay = 23;

const isoAt = (ms: number) => new Date(ms).toISOString();

const YESTERDAY = isoAt(localDayStartMs - DAY_MS);
const TWO_DAYS_AGO = isoAt(localDayStartMs - 2 * DAY_MS);
const TODAY = isoAt(localDayStartMs + 3_600_000); // 1 h into today
const TODAY_LATE = isoAt(localDayEndMs - 3_600_000); // 1 h before end of today
const TOMORROW = isoAt(localDayEndMs); // exact start of tomorrow → days_until = 1
const NEXT_WEEK = isoAt(localDayEndMs + 7 * DAY_MS);

/** Default params — override per-test to focus each case. */
const defaults: Omit<DueQueueParams, "items" | "progressData"> = {
  localDayStartMs,
  localDayEndMs,
  localYear,
  localMonth,
  localDay,
  newPerDay: 0,
  reviewPerDay: 0,
};

/** Build a fake problem_list_items row with a joined problems sub-object. */
function makeItem(id: string, orderIndex = 1): any {
  return {
    order_index: orderIndex,
    list_tags: ["tag"],
    problems: {
      id,
      key: `p-${id}`,
      title: `Problem ${id}`,
      difficulty: "Medium",
      category: "Arrays",
      leetcode_slug: `problem-${id}`,
      is_premium: false,
    },
  };
}

/** Build a fake user_problem_progress row. */
function makeProgress(
  problemId: string,
  overrides: Record<string, any> = {},
): any {
  return {
    problem_id: problemId,
    stage: 2,
    next_review_at: TODAY,
    last_attempt_at: YESTERDAY,
    last_success_at: null,
    attempt_count: 3,
    success_count: 2,
    fail_count: 1,
    interval_days: 7,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function build(
  items: any[],
  progressData: any[],
  extra: Partial<Omit<DueQueueParams, "items" | "progressData">> = {},
): any[] {
  return buildDueQueue({ ...defaults, items, progressData, ...extra });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildDueQueue", () => {
  // ── Basic filtering ───────────────────────────────────────────────────────

  it("returns [] for empty items", () => {
    expect(build([], [])).toEqual([]);
  });

  it("excludes items with no progress row (never attempted)", () => {
    const items = [makeItem("a"), makeItem("b")];
    expect(build(items, [])).toEqual([]);
  });

  it("excludes items whose progress has next_review_at: null", () => {
    const items = [makeItem("a")];
    const progressData = [makeProgress("a", { next_review_at: null })];
    expect(build(items, progressData)).toEqual([]);
  });

  it("excludes items whose next_review_at is an invalid date string", () => {
    const items = [makeItem("a")];
    const progressData = [makeProgress("a", { next_review_at: "not-a-date" })];
    expect(build(items, progressData)).toEqual([]);
  });

  it("excludes items whose problems field is null (malformed join)", () => {
    const item = { order_index: 1, list_tags: [], problems: null };
    const result = build([item], []);
    expect(result).toEqual([]);
  });

  // ── Review queue bucketing ────────────────────────────────────────────────

  it("returns overdue reviews uncapped regardless of reviewPerDay", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    const progressData = [
      makeProgress("a", { next_review_at: YESTERDAY }),
      makeProgress("b", { next_review_at: YESTERDAY }),
      makeProgress("c", { next_review_at: YESTERDAY }),
    ];
    const result = build(items, progressData, { reviewPerDay: 1 });
    expect(result).toHaveLength(3); // all three shown despite cap of 1
  });

  it("caps today's reviews to reviewPerDay", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    const progressData = [
      makeProgress("a", { next_review_at: TODAY }),
      makeProgress("b", { next_review_at: TODAY_LATE }),
      makeProgress("c", { next_review_at: TODAY }),
    ];
    const result = build(items, progressData, { reviewPerDay: 2 });
    expect(result).toHaveLength(2);
  });

  it("returns all future reviews uncapped regardless of reviewPerDay", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    const progressData = [
      makeProgress("a", { next_review_at: TOMORROW }),
      makeProgress("b", { next_review_at: NEXT_WEEK }),
      makeProgress("c", { next_review_at: TOMORROW }),
    ];
    const result = build(items, progressData, { reviewPerDay: 1 });
    expect(result).toHaveLength(3); // all three shown despite cap of 1
  });

  it("returns all today's reviews when reviewPerDay is 0 (no cap)", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    const progressData = [
      makeProgress("a", { next_review_at: TODAY }),
      makeProgress("b", { next_review_at: TODAY }),
      makeProgress("c", { next_review_at: TODAY }),
    ];
    const result = build(items, progressData, { reviewPerDay: 0 });
    expect(result).toHaveLength(3);
  });

  // ── days_until / days_overdue ─────────────────────────────────────────────

  it("computes days_until and days_overdue correctly for overdue/today/future", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c"), makeItem("d")];
    const progressData = [
      makeProgress("a", { next_review_at: TWO_DAYS_AGO }), // 2 days overdue
      makeProgress("b", { next_review_at: YESTERDAY }), // 1 day overdue
      makeProgress("c", { next_review_at: TODAY }), // due today
      makeProgress("d", { next_review_at: TOMORROW }), // 1 day ahead
    ];
    const result = build(items, progressData, { reviewPerDay: 10 });

    const byId = Object.fromEntries(result.map((p: any) => [p.id, p.progress]));
    expect(byId["a"].days_until).toBe(-2);
    expect(byId["a"].days_overdue).toBe(2);
    expect(byId["b"].days_until).toBe(-1);
    expect(byId["b"].days_overdue).toBe(1);
    expect(byId["c"].days_until).toBe(0);
    expect(byId["c"].days_overdue).toBe(0);
    expect(byId["d"].days_until).toBe(1);
    expect(byId["d"].days_overdue).toBe(0);
  });

  // ── Output ordering ───────────────────────────────────────────────────────

  it("orders results: overdue → today → future", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    const progressData = [
      makeProgress("a", { next_review_at: TOMORROW }), // future
      makeProgress("b", { next_review_at: TODAY }), // today
      makeProgress("c", { next_review_at: YESTERDAY }), // overdue
    ];
    const result = build(items, progressData, { reviewPerDay: 10 });
    expect(result.map((p: any) => p.id)).toEqual(["c", "b", "a"]);
  });

  it("sorts overdue from oldest to newest within the bucket", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    const progressData = [
      makeProgress("a", { next_review_at: YESTERDAY }), // 1 day ago
      makeProgress("b", { next_review_at: TWO_DAYS_AGO }), // 2 days ago — oldest
      makeProgress("c", {
        next_review_at: isoAt(localDayStartMs - 3 * DAY_MS),
      }),
    ];
    const result = build(items, progressData);
    // oldest first within overdue bucket
    expect(result[0].id).toBe("c"); // 3 days ago
    expect(result[1].id).toBe("b"); // 2 days ago
    expect(result[2].id).toBe("a"); // 1 day ago
  });

  // ── progress fields passed through ───────────────────────────────────────

  it("includes all expected progress fields in the output", () => {
    const items = [makeItem("a")];
    const progressData = [makeProgress("a", { next_review_at: TODAY })];
    const result = build(items, progressData, { reviewPerDay: 10 });
    expect(result).toHaveLength(1);
    const p = result[0].progress;
    expect(p).toMatchObject({
      stage: 2,
      next_review_at: TODAY,
      attempt_count: 3,
      success_count: 2,
      fail_count: 1,
      interval_days: 7,
      days_until: 0,
      days_overdue: 0,
    });
  });

  it("builds leetcode_url from leetcode_slug", () => {
    const items = [makeItem("two-sum")];
    const progressData = [makeProgress("two-sum", { next_review_at: TODAY })];
    const result = build(items, progressData, { reviewPerDay: 10 });
    expect(result[0].leetcode_url).toBe(
      "https://leetcode.com/problems/problem-two-sum/",
    );
  });

  // ── New problems gating ───────────────────────────────────────────────────

  it("does not surface today's new problems when overdue reviews exist", () => {
    // Overdue reviews gate *today's* new problems, but upcoming projection still
    // runs so the "this week" calendar view can show what's coming regardless.
    const items = [makeItem("a"), makeItem("b")];
    const progressData = [makeProgress("a", { next_review_at: YESTERDAY })];
    const result = build(items, progressData, {
      newPerDay: 5,
      reviewPerDay: 10,
    });
    const newToday = result.filter((p: any) => p.is_new && !p.projected_date);
    expect(newToday).toHaveLength(0);
    expect(result[0].id).toBe("a");
    expect(result[0].is_new).toBeFalsy();
  });

  it("still projects upcoming new problems even when overdue reviews exist", () => {
    // The upcoming block is intentionally not gated by hasOverdueReviews so the
    // "this week" calendar view works regardless of whether the user is caught up.
    const items = [makeItem("a"), makeItem("b")];
    const progressData = [makeProgress("a", { next_review_at: YESTERDAY })];
    const result = build(items, progressData, {
      newPerDay: 1,
      reviewPerDay: 10,
    });
    const upcoming = result.filter((p: any) => p.projected_date);
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].id).toBe("b");
    expect(upcoming[0].projected_date).toBe("2026-04-24"); // first slot = Fri
  });

  it("surfaces new problems when there are only today reviews (no overdue)", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    const progressData = [makeProgress("a", { next_review_at: TODAY })];
    const result = build(items, progressData, {
      newPerDay: 1,
      reviewPerDay: 10,
    });
    const newProblems = result.filter(
      (p: any) => p.is_new && !p.projected_date,
    );
    expect(newProblems).toHaveLength(1);
    expect(["b", "c"]).toContain(newProblems[0].id);
  });

  it("respects newPerDay limit on today's new problems", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c"), makeItem("d")];
    // No progress at all → gate is open, all are unseen
    const result = build(items, [], { newPerDay: 2, reviewPerDay: 0 });
    const newToday = result.filter((p: any) => p.is_new && !p.projected_date);
    expect(newToday).toHaveLength(2);
  });

  it("does not surface new problems when newPerDay is 0", () => {
    const items = [makeItem("a"), makeItem("b")];
    const result = build(items, [], { newPerDay: 0, reviewPerDay: 0 });
    expect(result.filter((p: any) => p.is_new)).toHaveLength(0);
  });

  it("deducts slots already consumed today from new quota (effectiveNewPerDay)", () => {
    // "a" was a new problem started and completed earlier today
    // (attempt_count=1, last_attempt_at=within today, now has a future review)
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    const progressData = [
      makeProgress("a", {
        next_review_at: TOMORROW, // future review scheduled after first attempt
        attempt_count: 1,
        last_attempt_at: TODAY, // consumed a new slot today
      }),
    ];
    // newPerDay=2 but 1 slot already used → effectiveNewPerDay=1
    const result = build(items, progressData, {
      newPerDay: 2,
      reviewPerDay: 10,
    });
    const newToday = result.filter((p: any) => p.is_new && !p.projected_date);
    expect(newToday).toHaveLength(1); // not 2
  });

  it("new quota cannot go below 0 even if more slots used than newPerDay", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    const progressData = [
      makeProgress("a", {
        next_review_at: TOMORROW,
        attempt_count: 1,
        last_attempt_at: TODAY,
      }),
      makeProgress("b", {
        next_review_at: TOMORROW,
        attempt_count: 1,
        last_attempt_at: TODAY,
      }),
      makeProgress("c", {
        next_review_at: TOMORROW,
        attempt_count: 1,
        last_attempt_at: TODAY,
      }),
    ];
    // 3 slots used, newPerDay=1 → effectiveNewPerDay = max(0, 1-3) = 0
    const result = build(items, progressData, {
      newPerDay: 1,
      reviewPerDay: 10,
    });
    const newToday = result.filter((p: any) => p.is_new && !p.projected_date);
    expect(newToday).toHaveLength(0);
  });

  // ── Upcoming new problem projection ──────────────────────────────────────

  it("projects upcoming new problems with correct projected_date and is_new flag", () => {
    // Thursday Apr 23 → maxDays=2 → projects Fri Apr 24 and Sat Apr 25
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    const result = build(items, [], { newPerDay: 1, reviewPerDay: 0 });

    const upcoming = result.filter((p: any) => p.projected_date);
    expect(upcoming).toHaveLength(2);
    expect(upcoming[0].projected_date).toBe("2026-04-24");
    expect(upcoming[1].projected_date).toBe("2026-04-25");
    expect(upcoming.every((p: any) => p.is_new === true)).toBe(true);
  });

  it("does not double-count today's new problems in upcoming projection", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    // "a" will be today's new; "b" and "c" should be projected
    const result = build(items, [], { newPerDay: 1, reviewPerDay: 0 });

    const newToday = result.filter((p: any) => p.is_new && !p.projected_date);
    const upcoming = result.filter((p: any) => p.projected_date);

    expect(newToday).toHaveLength(1);
    expect(newToday[0].id).toBe("a");
    expect(upcoming.map((p: any) => p.id)).not.toContain("a");
  });

  it("stops projecting when unseen items run out before week end", () => {
    // Only 2 items total, newPerDay=1, Thursday → would project 2 days but only 1 item left
    const items = [makeItem("a"), makeItem("b")];
    const result = build(items, [], { newPerDay: 1, reviewPerDay: 0 });
    // "a" = today, "b" = Fri. Nothing for Sat (no more items).
    const upcoming = result.filter((p: any) => p.projected_date);
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].projected_date).toBe("2026-04-24");
  });

  it("does not project upcoming new problems when newPerDay is 0", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    const result = build(items, [], { newPerDay: 0, reviewPerDay: 0 });
    expect(result.filter((p: any) => p.projected_date)).toHaveLength(0);
  });

  it("packs multiple new problems per day when newPerDay > 1", () => {
    // Thursday, newPerDay=2: today gets a+b; Fri gets c+d; Sat gets e+f
    const items = ["a", "b", "c", "d", "e", "f"].map((id) => makeItem(id));
    const result = build(items, [], { newPerDay: 2, reviewPerDay: 0 });

    const newToday = result.filter((p: any) => p.is_new && !p.projected_date);
    const upcoming = result.filter((p: any) => p.projected_date);

    expect(newToday).toHaveLength(2);
    expect(
      upcoming.filter((p: any) => p.projected_date === "2026-04-24"),
    ).toHaveLength(2);
    expect(
      upcoming.filter((p: any) => p.projected_date === "2026-04-25"),
    ).toHaveLength(2);
  });

  // ── Full ordering: overdue → today → future → new → upcoming ─────────────

  it("places new and upcoming after all review buckets", () => {
    // Use today + future reviews only (no overdue), so the overdue gate doesn't
    // suppress today's new problems. Overdue ordering is tested separately.
    const items = [
      makeItem("review-today"),
      makeItem("review-future"),
      makeItem("new-today"),
      makeItem("upcoming"),
    ];
    const progressData = [
      makeProgress("review-today", { next_review_at: TODAY }),
      makeProgress("review-future", { next_review_at: TOMORROW }),
    ];
    const result = build(items, progressData, {
      newPerDay: 1,
      reviewPerDay: 10,
    });

    expect(result[0].id).toBe("review-today");
    expect(result[1].id).toBe("review-future");
    expect(result[2].id).toBe("new-today");
    expect(result[2].is_new).toBe(true);
    expect(result[2].projected_date).toBeFalsy();
    expect(result[3].id).toBe("upcoming");
    expect(result[3].is_new).toBe(true);
    expect(result[3].projected_date).toBe("2026-04-24");
  });
});

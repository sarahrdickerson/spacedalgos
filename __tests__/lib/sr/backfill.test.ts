import { describe, it, expect } from "vitest";
import { backfillReviewSchedule } from "@/lib/sr/backfill";
import { createMockSupabase, ok, err } from "@/__tests__/helpers/mockSupabase";

const userId = "user-1";
const listId = "list-1";

// Convenience: a now date well before our test review dates
const NOW = new Date("2026-04-15T00:00:00Z");
const TODAY_LOCAL = "2026-04-15";

// ---------------------------------------------------------------------------
// Test 1: Empty list
// ---------------------------------------------------------------------------
describe("backfillReviewSchedule", () => {
  it("1. Empty list (no problems) → no further queries after listItems", async () => {
    const supabase = createMockSupabase([
      ok([]), // listItems returns empty array
    ]);
    await backfillReviewSchedule(supabase, userId, listId, 4, TODAY_LOCAL, null, NOW);
    // Only 1 from() call — the listItems fetch. No progress or upsert queries.
    expect(supabase.callCount).toBe(1);
  });

  it("2. listItems DB error → returns early, no further queries", async () => {
    const supabase = createMockSupabase([
      err("list items error"), // listItems fails
    ]);
    await backfillReviewSchedule(supabase, userId, listId, 4, TODAY_LOCAL, null, NOW);
    expect(supabase.callCount).toBe(1);
  });

  it("3. No future reviews (progressRows empty) → returns early, no upsert", async () => {
    const supabase = createMockSupabase([
      ok([{ problem_id: "A" }]), // listItems
      ok([]),                     // progressRows empty
    ]);
    await backfillReviewSchedule(supabase, userId, listId, 4, TODAY_LOCAL, null, NOW);
    expect(supabase.callCount).toBe(2);
  });

  it("4. progressRows DB error → returns early", async () => {
    const supabase = createMockSupabase([
      ok([{ problem_id: "A" }]), // listItems
      err("progress error"),      // progressRows fails
    ]);
    await backfillReviewSchedule(supabase, userId, listId, 4, TODAY_LOCAL, null, NOW);
    expect(supabase.callCount).toBe(2);
  });

  it("5. Single review, cap=4, ideal date in future → upsert with correct date", async () => {
    // Problem A: last_attempt_at=2026-04-12T10:00:00Z, interval_days=5
    // Ideal = 2026-04-12 + 5d = 2026-04-17T10:00:00Z → local UTC "2026-04-17"
    // today = "2026-04-15", ideal is future → baseDate = "2026-04-17"
    // cap=4, 1 slot used → next_review_at = "2026-04-17T00:00:00Z" (UTC midnight, null tz)
    let upsertArgs: any = null;
    const supabase = {
      from: (table: string) => {
        if (table === "problem_list_items") {
          const p = Promise.resolve({ data: [{ problem_id: "A" }], error: null });
          return {
            select: () => ({ eq: () => p }),
          };
        }
        if (table === "user_problem_progress") {
          // First call = progressRows query; second call = upsert
          let progressCalled = false;
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  not: () => ({
                    gt: () =>
                      Promise.resolve({
                        data: [
                          {
                            problem_id: "A",
                            last_attempt_at: "2026-04-12T10:00:00Z",
                            interval_days: 5,
                            next_review_at: "2026-04-17T10:00:00Z",
                          },
                        ],
                        error: null,
                      }),
                  }),
                }),
              }),
            }),
            upsert: (data: any, opts: any) => {
              upsertArgs = { data, opts };
              return Promise.resolve({ data: null, error: null });
            },
          };
        }
        return { select: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }) };
      },
    };
    await backfillReviewSchedule(supabase as any, userId, listId, 4, TODAY_LOCAL, null, NOW);
    expect(upsertArgs).not.toBeNull();
    expect(upsertArgs.data).toHaveLength(1);
    expect(upsertArgs.data[0]).toEqual({
      user_id: userId,
      problem_id: "A",
      next_review_at: "2026-04-17T00:00:00.000Z",
    });
    expect(upsertArgs.opts).toEqual({ onConflict: "user_id,problem_id" });
  });

  it("6. Past ideal date → clamped to today", async () => {
    // Problem A: last_attempt_at=2026-04-10T00:00:00Z, interval_days=3
    // Ideal = April 13 UTC, but today = April 15 → clamp to "2026-04-15"
    let upsertArgs: any = null;
    const supabase = {
      from: (table: string) => {
        if (table === "problem_list_items") {
          return {
            select: () => ({
              eq: () =>
                Promise.resolve({ data: [{ problem_id: "A" }], error: null }),
            }),
          };
        }
        if (table === "user_problem_progress") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  not: () => ({
                    gt: () =>
                      Promise.resolve({
                        data: [
                          {
                            problem_id: "A",
                            last_attempt_at: "2026-04-10T00:00:00Z",
                            interval_days: 3,
                            next_review_at: "2026-04-16T00:00:00Z",
                          },
                        ],
                        error: null,
                      }),
                  }),
                }),
              }),
            }),
            upsert: (data: any, opts: any) => {
              upsertArgs = { data, opts };
              return Promise.resolve({ data: null, error: null });
            },
          };
        }
        return { select: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }) };
      },
    };
    await backfillReviewSchedule(supabase as any, userId, listId, 4, TODAY_LOCAL, null, NOW);
    expect(upsertArgs.data[0].next_review_at).toBe("2026-04-15T00:00:00.000Z");
  });

  it("7. Two reviews with same ideal date, cap=1 → second bumped to next day", async () => {
    // Problem A: ideal = "2026-04-17", sortKey earlier (smaller timestamp)
    // Problem B: ideal = "2026-04-17", sortKey later (larger timestamp)
    // cap=1 → A gets April 17, B gets April 18
    let upsertArgs: any = null;
    const supabase = {
      from: (table: string) => {
        if (table === "problem_list_items") {
          return {
            select: () => ({
              eq: () =>
                Promise.resolve({
                  data: [{ problem_id: "A" }, { problem_id: "B" }],
                  error: null,
                }),
            }),
          };
        }
        if (table === "user_problem_progress") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  not: () => ({
                    gt: () =>
                      Promise.resolve({
                        data: [
                          // Both have ideal April 17 but A has slightly earlier timestamp
                          {
                            problem_id: "A",
                            last_attempt_at: "2026-04-10T00:00:00Z",
                            interval_days: 7, // ideal = April 17T00:00Z
                            next_review_at: "2026-04-17T00:00:00Z",
                          },
                          {
                            problem_id: "B",
                            last_attempt_at: "2026-04-10T06:00:00Z",
                            interval_days: 7, // ideal = April 17T06:00Z (slightly later)
                            next_review_at: "2026-04-17T06:00:00Z",
                          },
                        ],
                        error: null,
                      }),
                  }),
                }),
              }),
            }),
            upsert: (data: any, opts: any) => {
              upsertArgs = { data, opts };
              return Promise.resolve({ data: null, error: null });
            },
          };
        }
        return { select: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }) };
      },
    };
    await backfillReviewSchedule(supabase as any, userId, listId, 1, TODAY_LOCAL, null, NOW);
    expect(upsertArgs.data).toHaveLength(2);
    const aEntry = upsertArgs.data.find((d: any) => d.problem_id === "A");
    const bEntry = upsertArgs.data.find((d: any) => d.problem_id === "B");
    expect(aEntry.next_review_at).toBe("2026-04-17T00:00:00.000Z");
    expect(bEntry.next_review_at).toBe("2026-04-18T00:00:00.000Z");
  });

  it("8. Sort order: earlier ideal date gets earlier slot", async () => {
    // Problem A: ideal = April 18 (sortKey later)
    // Problem B: ideal = April 17 (sortKey earlier, gets sorted first)
    // cap=1 → B gets April 17, A gets April 18
    let upsertArgs: any = null;
    const supabase = {
      from: (table: string) => {
        if (table === "problem_list_items") {
          return {
            select: () => ({
              eq: () =>
                Promise.resolve({
                  data: [{ problem_id: "A" }, { problem_id: "B" }],
                  error: null,
                }),
            }),
          };
        }
        if (table === "user_problem_progress") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  not: () => ({
                    gt: () =>
                      Promise.resolve({
                        data: [
                          {
                            problem_id: "A",
                            last_attempt_at: "2026-04-11T00:00:00Z",
                            interval_days: 7, // ideal = April 18
                            next_review_at: "2026-04-18T00:00:00Z",
                          },
                          {
                            problem_id: "B",
                            last_attempt_at: "2026-04-10T00:00:00Z",
                            interval_days: 7, // ideal = April 17
                            next_review_at: "2026-04-17T00:00:00Z",
                          },
                        ],
                        error: null,
                      }),
                  }),
                }),
              }),
            }),
            upsert: (data: any, opts: any) => {
              upsertArgs = { data, opts };
              return Promise.resolve({ data: null, error: null });
            },
          };
        }
        return { select: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }) };
      },
    };
    await backfillReviewSchedule(supabase as any, userId, listId, 1, TODAY_LOCAL, null, NOW);
    const aEntry = upsertArgs.data.find((d: any) => d.problem_id === "A");
    const bEntry = upsertArgs.data.find((d: any) => d.problem_id === "B");
    expect(bEntry.next_review_at).toBe("2026-04-17T00:00:00.000Z"); // B gets April 17
    expect(aEntry.next_review_at).toBe("2026-04-18T00:00:00.000Z"); // A gets April 18
  });

  it("9. cap=2, 5 reviews across 3 days: A,B→Apr17; C,D→Apr18; E→Apr19", async () => {
    let upsertArgs: any = null;
    const progressData = [
      { problem_id: "A", last_attempt_at: "2026-04-10T00:00:00Z", interval_days: 7, next_review_at: "2026-04-17T00:00:00Z" },
      { problem_id: "B", last_attempt_at: "2026-04-10T01:00:00Z", interval_days: 7, next_review_at: "2026-04-17T01:00:00Z" },
      { problem_id: "C", last_attempt_at: "2026-04-11T00:00:00Z", interval_days: 7, next_review_at: "2026-04-18T00:00:00Z" },
      { problem_id: "D", last_attempt_at: "2026-04-11T01:00:00Z", interval_days: 7, next_review_at: "2026-04-18T01:00:00Z" },
      { problem_id: "E", last_attempt_at: "2026-04-12T00:00:00Z", interval_days: 7, next_review_at: "2026-04-19T00:00:00Z" },
    ];
    const supabase = {
      from: (table: string) => {
        if (table === "problem_list_items") {
          return {
            select: () => ({
              eq: () =>
                Promise.resolve({
                  data: progressData.map((p) => ({ problem_id: p.problem_id })),
                  error: null,
                }),
            }),
          };
        }
        if (table === "user_problem_progress") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  not: () => ({
                    gt: () => Promise.resolve({ data: progressData, error: null }),
                  }),
                }),
              }),
            }),
            upsert: (data: any, opts: any) => {
              upsertArgs = { data, opts };
              return Promise.resolve({ data: null, error: null });
            },
          };
        }
        return { select: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }) };
      },
    };
    await backfillReviewSchedule(supabase as any, userId, listId, 2, TODAY_LOCAL, null, NOW);
    const find = (id: string) => upsertArgs.data.find((d: any) => d.problem_id === id).next_review_at;
    expect(find("A")).toBe("2026-04-17T00:00:00.000Z");
    expect(find("B")).toBe("2026-04-17T00:00:00.000Z");
    expect(find("C")).toBe("2026-04-18T00:00:00.000Z");
    expect(find("D")).toBe("2026-04-18T00:00:00.000Z");
    expect(find("E")).toBe("2026-04-19T00:00:00.000Z");
  });

  it("10. CDT timezone (tzOffset=300): review placed at correct local day start", async () => {
    // Problem A: last_attempt_at="2026-04-14T10:00:00Z", interval_days=3
    // Ideal UTC = 2026-04-17T10:00:00Z
    // Local CDT: utcToLocalDateStr(ideal, 300) = "2026-04-17" (10AM UTC - 5h = 5AM CDT, still April 17)
    // baseDate = "2026-04-17"
    // next_review_at = localDayBoundsUTC("2026-04-17", 300).startMs = Date.UTC(2026,3,17) + 300*60*1000
    //                = "2026-04-17T05:00:00Z"
    let upsertArgs: any = null;
    const supabase = {
      from: (table: string) => {
        if (table === "problem_list_items") {
          return {
            select: () => ({
              eq: () =>
                Promise.resolve({ data: [{ problem_id: "A" }], error: null }),
            }),
          };
        }
        if (table === "user_problem_progress") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  not: () => ({
                    gt: () =>
                      Promise.resolve({
                        data: [
                          {
                            problem_id: "A",
                            last_attempt_at: "2026-04-14T10:00:00Z",
                            interval_days: 3,
                            next_review_at: "2026-04-17T10:00:00Z",
                          },
                        ],
                        error: null,
                      }),
                  }),
                }),
              }),
            }),
            upsert: (data: any, opts: any) => {
              upsertArgs = { data, opts };
              return Promise.resolve({ data: null, error: null });
            },
          };
        }
        return { select: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }) };
      },
    };
    await backfillReviewSchedule(supabase as any, userId, listId, 4, "2026-04-15", 300, NOW);
    expect(upsertArgs.data[0].next_review_at).toBe("2026-04-17T05:00:00.000Z");
  });

  it("11. CDT timezone: review crossing UTC midnight stays on correct local day", async () => {
    // Problem A: last_attempt_at="2026-04-16T03:00:00Z" (April 15, 10 PM CDT)
    // interval_days=1
    // Ideal UTC = "2026-04-17T03:00:00Z" (April 16 10 PM CDT)
    // Local CDT: utcToLocalDateStr("2026-04-17T03:00:00Z", 300) = "2026-04-16" (03:00Z - 5h = 22:00 April 16 CDT)
    // next_review_at = localDayBoundsUTC("2026-04-16", 300).startMs = "2026-04-16T05:00:00Z"
    let upsertArgs: any = null;
    const supabase = {
      from: (table: string) => {
        if (table === "problem_list_items") {
          return {
            select: () => ({
              eq: () =>
                Promise.resolve({ data: [{ problem_id: "A" }], error: null }),
            }),
          };
        }
        if (table === "user_problem_progress") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  not: () => ({
                    gt: () =>
                      Promise.resolve({
                        data: [
                          {
                            problem_id: "A",
                            last_attempt_at: "2026-04-16T03:00:00Z",
                            interval_days: 1,
                            next_review_at: "2026-04-17T03:00:00Z",
                          },
                        ],
                        error: null,
                      }),
                  }),
                }),
              }),
            }),
            upsert: (data: any, opts: any) => {
              upsertArgs = { data, opts };
              return Promise.resolve({ data: null, error: null });
            },
          };
        }
        return { select: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }) };
      },
    };
    // now is 2026-04-15T10:00:00Z (before the ideal date, so no clamping)
    await backfillReviewSchedule(
      supabase as any,
      userId,
      listId,
      4,
      "2026-04-15",
      300,
      new Date("2026-04-15T10:00:00Z"),
    );
    // CDT April 16 starts at "2026-04-16T05:00:00Z"
    expect(upsertArgs.data[0].next_review_at).toBe("2026-04-16T05:00:00.000Z");
  });

  it("12. Upsert not called if no future reviews exist (all filtered by gt(nowIso))", async () => {
    // progressRows returns empty because all reviews are in the past (filtered by gt)
    const supabase = createMockSupabase([
      ok([{ problem_id: "A" }]), // listItems
      ok([]),                     // progressRows empty (all past)
    ]);
    await backfillReviewSchedule(supabase, userId, listId, 4, TODAY_LOCAL, null, NOW);
    // Only 2 from() calls — no upsert
    expect(supabase.callCount).toBe(2);
  });

  it("13. Upsert data structure: each entry has exactly {user_id, problem_id, next_review_at} with correct onConflict", async () => {
    let capturedUpsertData: any = null;
    let capturedUpsertOpts: any = null;

    const supabase = {
      from: (table: string) => {
        if (table === "problem_list_items") {
          return {
            select: () => ({
              eq: () =>
                Promise.resolve({ data: [{ problem_id: "A" }, { problem_id: "B" }], error: null }),
            }),
          };
        }
        if (table === "user_problem_progress") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  not: () => ({
                    gt: () =>
                      Promise.resolve({
                        data: [
                          {
                            problem_id: "A",
                            last_attempt_at: "2026-04-10T00:00:00Z",
                            interval_days: 7,
                            next_review_at: "2026-04-17T00:00:00Z",
                          },
                          {
                            problem_id: "B",
                            last_attempt_at: "2026-04-11T00:00:00Z",
                            interval_days: 7,
                            next_review_at: "2026-04-18T00:00:00Z",
                          },
                        ],
                        error: null,
                      }),
                  }),
                }),
              }),
            }),
            upsert: (data: any, opts: any) => {
              capturedUpsertData = data;
              capturedUpsertOpts = opts;
              return Promise.resolve({ data: null, error: null });
            },
          };
        }
        return { select: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }) };
      },
    };

    await backfillReviewSchedule(supabase as any, userId, listId, 4, TODAY_LOCAL, null, NOW);

    expect(capturedUpsertData).not.toBeNull();
    expect(capturedUpsertData).toHaveLength(2);

    for (const entry of capturedUpsertData) {
      // Must have exactly these three keys
      expect(Object.keys(entry).sort()).toEqual(
        ["next_review_at", "problem_id", "user_id"].sort(),
      );
      expect(entry.user_id).toBe(userId);
      expect(typeof entry.problem_id).toBe("string");
      expect(typeof entry.next_review_at).toBe("string");
      // next_review_at must be a valid ISO string
      expect(new Date(entry.next_review_at).toISOString()).toBe(entry.next_review_at);
    }

    expect(capturedUpsertOpts).toEqual({ onConflict: "user_id,problem_id" });
  });
});

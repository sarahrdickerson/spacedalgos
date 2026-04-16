import { describe, it, expect } from "vitest";
import { addDays, computeNextProgress } from "@/lib/sr/algorithm";

// ---------------------------------------------------------------------------
// addDays
// ---------------------------------------------------------------------------
describe("addDays", () => {
  it("adds the correct number of UTC days", () => {
    const base = new Date("2026-04-15T00:00:00Z");
    const result = addDays(base, 5);
    expect(result.toISOString()).toBe("2026-04-20T00:00:00.000Z");
  });

  it("preserves time-of-day (timezone safety)", () => {
    const base = new Date("2026-03-06T22:00:00Z");
    const result = addDays(base, 1);
    expect(result.toISOString()).toBe("2026-03-07T22:00:00.000Z");
  });

  it("works across month boundaries", () => {
    const base = new Date("2026-01-28T12:00:00Z");
    const result = addDays(base, 5);
    expect(result.toISOString()).toBe("2026-02-02T12:00:00.000Z");
  });

  it("works across year boundaries", () => {
    const base = new Date("2026-12-30T00:00:00Z");
    const result = addDays(base, 3);
    expect(result.toISOString()).toBe("2027-01-02T00:00:00.000Z");
  });

  it("does not mutate the original date", () => {
    const base = new Date("2026-04-15T00:00:00Z");
    const originalIso = base.toISOString();
    addDays(base, 7);
    expect(base.toISOString()).toBe(originalIso);
  });

  it("handles adding zero days", () => {
    const base = new Date("2026-04-15T10:30:00Z");
    expect(addDays(base, 0).toISOString()).toBe("2026-04-15T10:30:00.000Z");
  });
});

// ---------------------------------------------------------------------------
// Helper — call computeNextProgress with first-attempt defaults
// ---------------------------------------------------------------------------
function firstAttempt(grade: 0 | 1 | 2, now: Date) {
  return computeNextProgress({
    prevStage: null,
    prevIntervalDays: null,
    prevAttemptCount: null,
    prevSuccessCount: null,
    prevFailCount: null,
    grade,
    now,
  });
}

function secondAttempt(grade: 0 | 1 | 2, prevIntervalDays: number, now: Date) {
  return computeNextProgress({
    prevStage: 1,
    prevIntervalDays,
    prevAttemptCount: 1,
    prevSuccessCount: 1,
    prevFailCount: 0,
    grade,
    now,
  });
}

function subsequentAttempt(
  grade: 0 | 1 | 2,
  prevIntervalDays: number,
  prevAttemptCount: number,
  prevStage: number,
  now: Date,
  prevSuccessCount = 2,
  prevFailCount = 0,
) {
  return computeNextProgress({
    prevStage,
    prevIntervalDays,
    prevAttemptCount,
    prevSuccessCount,
    prevFailCount,
    grade,
    now,
  });
}

// ---------------------------------------------------------------------------
// First attempt (prevIntervalDays=null, prevAttemptCount=null)
// ---------------------------------------------------------------------------
describe("computeNextProgress — first attempt", () => {
  const now = new Date("2026-04-15T12:00:00Z");

  it("grade 0: interval=1, stage=1, attempt_count=1, success_count=0, fail_count=1", () => {
    const r = firstAttempt(0, now);
    expect(r.interval_days).toBe(1);
    expect(r.stage).toBe(1);
    expect(r.attempt_count).toBe(1);
    expect(r.success_count).toBe(0);
    expect(r.fail_count).toBe(1);
  });

  it("grade 1: interval=1, stage=1, attempt_count=1, success_count=1, fail_count=0", () => {
    const r = firstAttempt(1, now);
    expect(r.interval_days).toBe(1);
    expect(r.stage).toBe(1);
    expect(r.attempt_count).toBe(1);
    expect(r.success_count).toBe(1);
    expect(r.fail_count).toBe(0);
  });

  it("grade 2: interval=3, stage=1, attempt_count=1, success_count=1, fail_count=0", () => {
    const r = firstAttempt(2, now);
    expect(r.interval_days).toBe(3);
    expect(r.stage).toBe(1);
    expect(r.attempt_count).toBe(1);
    expect(r.success_count).toBe(1);
    expect(r.fail_count).toBe(0);
  });

  it("grade 0: last_success_at is null", () => {
    const r = firstAttempt(0, now);
    expect(r.last_success_at).toBeNull();
  });

  it("grade 1: last_success_at is set", () => {
    const r = firstAttempt(1, now);
    expect(r.last_success_at).toBe(now.toISOString());
  });

  it("grade 2: last_success_at is set", () => {
    const r = firstAttempt(2, now);
    expect(r.last_success_at).toBe(now.toISOString());
  });

  it("next_review_at = addDays(now, interval).toISOString() for grade 0", () => {
    const r = firstAttempt(0, now);
    expect(r.next_review_at).toBe(addDays(now, 1).toISOString());
  });

  it("next_review_at = addDays(now, interval).toISOString() for grade 1", () => {
    const r = firstAttempt(1, now);
    expect(r.next_review_at).toBe(addDays(now, 1).toISOString());
  });

  it("next_review_at = addDays(now, interval).toISOString() for grade 2", () => {
    const r = firstAttempt(2, now);
    expect(r.next_review_at).toBe(addDays(now, 3).toISOString());
  });

  it("last_attempt_at = now.toISOString()", () => {
    const r = firstAttempt(1, now);
    expect(r.last_attempt_at).toBe(now.toISOString());
  });
});

// ---------------------------------------------------------------------------
// Second attempt (prevAttemptCount=1)
// ---------------------------------------------------------------------------
describe("computeNextProgress — second attempt", () => {
  const now = new Date("2026-04-16T12:00:00Z");

  it("grade 0: interval=1 (fixed for second attempt)", () => {
    const r = secondAttempt(0, 1, now);
    expect(r.interval_days).toBe(1);
  });

  it("grade 1: interval=3 (fixed for second attempt, NOT ×2.0 of 1)", () => {
    const r = secondAttempt(1, 1, now);
    expect(r.interval_days).toBe(3);
  });

  it("grade 2: interval=7 (fixed for second attempt)", () => {
    const r = secondAttempt(2, 3, now);
    expect(r.interval_days).toBe(7);
  });

  it("stage with prevStage=1, grade 1 → 2", () => {
    const r = secondAttempt(1, 1, now);
    expect(r.stage).toBe(2);
  });

  it("stage with prevStage=1, grade 2 → 2 (capped at min(3, max(1, 1+1))=2)", () => {
    const r = secondAttempt(2, 3, now);
    expect(r.stage).toBe(2);
  });

  it("stage with prevStage=1, grade 0 → 1 (cannot go below 1)", () => {
    const r = secondAttempt(0, 1, now);
    expect(r.stage).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Subsequent attempts (prevAttemptCount >= 2)
// ---------------------------------------------------------------------------
describe("computeNextProgress — subsequent attempts, grade 0 intervals", () => {
  const now = new Date("2026-04-15T12:00:00Z");

  const failInterval = (prev: number) =>
    subsequentAttempt(0, prev, 2, 2, now).interval_days;

  it("prevInterval=1 → 1 (floor(0.25) = 0 → min 1)", () => {
    expect(failInterval(1)).toBe(1);
  });

  it("prevInterval=4 → 1 (floor(1.0))", () => {
    expect(failInterval(4)).toBe(1);
  });

  it("prevInterval=8 → 2 (floor(2.0))", () => {
    expect(failInterval(8)).toBe(2);
  });

  it("prevInterval=30 → 7 (floor(7.5))", () => {
    expect(failInterval(30)).toBe(7);
  });

  it("prevInterval=90 → 22 (floor(22.5))", () => {
    expect(failInterval(90)).toBe(22);
  });
});

describe("computeNextProgress — subsequent attempts, grade 1 Good sequence from prevInterval=3", () => {
  const now = new Date("2026-04-15T12:00:00Z");

  it("3 → 6", () => {
    expect(subsequentAttempt(1, 3, 2, 1, now).interval_days).toBe(6);
  });

  it("6 → 12", () => {
    expect(subsequentAttempt(1, 6, 3, 1, now).interval_days).toBe(12);
  });

  it("12 → 24", () => {
    expect(subsequentAttempt(1, 12, 4, 1, now).interval_days).toBe(24);
  });

  it("24 → 30 (cap at MAX_INTERVAL_GOOD=30)", () => {
    expect(subsequentAttempt(1, 24, 5, 2, now).interval_days).toBe(30);
  });

  it("30 → 30 (stays at cap)", () => {
    expect(subsequentAttempt(1, 30, 6, 2, now).interval_days).toBe(30);
  });
});

describe("computeNextProgress — subsequent attempts, grade 2 Easy sequence from prevInterval=3", () => {
  const now = new Date("2026-04-15T12:00:00Z");

  it("3 → 7 (ceil(3 * 2.3) = ceil(6.9) = 7)", () => {
    expect(subsequentAttempt(2, 3, 2, 1, now).interval_days).toBe(7);
  });

  it("7 → 17 (ceil(7 * 2.3) = ceil(16.1) = 17)", () => {
    expect(subsequentAttempt(2, 7, 3, 2, now).interval_days).toBe(17);
  });

  it("17 → 40 (ceil(17 * 2.3) = ceil(39.1) = 40)", () => {
    expect(subsequentAttempt(2, 17, 4, 2, now).interval_days).toBe(40);
  });

  it("40 → 90 (ceil(40 * 2.3) = ceil(92) = 92 → capped at MAX_INTERVAL_EASY=90)", () => {
    expect(subsequentAttempt(2, 40, 5, 3, now).interval_days).toBe(90);
  });

  it("90 → 90 (stays at cap)", () => {
    expect(subsequentAttempt(2, 90, 6, 3, now).interval_days).toBe(90);
  });
});

// ---------------------------------------------------------------------------
// Stage transitions — all combinations
// ---------------------------------------------------------------------------
describe("computeNextProgress — stage transitions", () => {
  const now = new Date("2026-04-15T12:00:00Z");

  it("prevStage=null (first attempt), grade 0 → stage=1", () => {
    expect(firstAttempt(0, now).stage).toBe(1);
  });

  it("prevStage=null (first attempt), grade 1 → stage=1", () => {
    expect(firstAttempt(1, now).stage).toBe(1);
  });

  it("prevStage=null (first attempt), grade 2 → stage=1", () => {
    expect(firstAttempt(2, now).stage).toBe(1);
  });

  it("prevStage=1, grade 0 → stage=1 (floor at 1)", () => {
    expect(subsequentAttempt(0, 3, 2, 1, now).stage).toBe(1);
  });

  it("prevStage=1, grade 1 → stage=2", () => {
    expect(subsequentAttempt(1, 3, 2, 1, now).stage).toBe(2);
  });

  it("prevStage=1, grade 2 → stage=2", () => {
    expect(subsequentAttempt(2, 3, 2, 1, now).stage).toBe(2);
  });

  it("prevStage=2, grade 0 → stage=1", () => {
    expect(subsequentAttempt(0, 6, 3, 2, now).stage).toBe(1);
  });

  it("prevStage=2, grade 1 → stage=2 (stays)", () => {
    expect(subsequentAttempt(1, 6, 3, 2, now).stage).toBe(2);
  });

  it("prevStage=2, grade 2 → stage=3", () => {
    expect(subsequentAttempt(2, 6, 3, 2, now).stage).toBe(3);
  });

  it("prevStage=3, grade 0 → stage=2", () => {
    expect(subsequentAttempt(0, 30, 6, 3, now).stage).toBe(2);
  });

  it("prevStage=3, grade 1 → stage=2 (demoted — Good cannot maintain Mastered)", () => {
    expect(subsequentAttempt(1, 30, 6, 3, now).stage).toBe(2);
  });

  it("prevStage=3, grade 2 → stage=3 (stays Mastered)", () => {
    expect(subsequentAttempt(2, 90, 7, 3, now).stage).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Counter accumulation
// ---------------------------------------------------------------------------
describe("computeNextProgress — counter accumulation", () => {
  const now = new Date("2026-04-15T12:00:00Z");

  it("attempt_count accumulates correctly", () => {
    const r = computeNextProgress({
      prevStage: 2,
      prevIntervalDays: 6,
      prevAttemptCount: 5,
      prevSuccessCount: 4,
      prevFailCount: 1,
      grade: 1,
      now,
    });
    expect(r.attempt_count).toBe(6);
  });

  it("success_count accumulates on grade 1", () => {
    const r = computeNextProgress({
      prevStage: 1,
      prevIntervalDays: 3,
      prevAttemptCount: 3,
      prevSuccessCount: 2,
      prevFailCount: 1,
      grade: 1,
      now,
    });
    expect(r.success_count).toBe(3);
    expect(r.fail_count).toBe(1);
  });

  it("success_count accumulates on grade 2", () => {
    const r = computeNextProgress({
      prevStage: 2,
      prevIntervalDays: 7,
      prevAttemptCount: 4,
      prevSuccessCount: 3,
      prevFailCount: 1,
      grade: 2,
      now,
    });
    expect(r.success_count).toBe(4);
    expect(r.fail_count).toBe(1);
  });

  it("fail_count accumulates on grade 0", () => {
    const r = computeNextProgress({
      prevStage: 2,
      prevIntervalDays: 6,
      prevAttemptCount: 4,
      prevSuccessCount: 3,
      prevFailCount: 1,
      grade: 0,
      now,
    });
    expect(r.fail_count).toBe(2);
    expect(r.success_count).toBe(3);
  });

  it("accumulates correctly from null (zero) baseline", () => {
    // Simulates calling computeNextProgress from scratch
    let r = computeNextProgress({
      prevStage: null,
      prevIntervalDays: null,
      prevAttemptCount: null,
      prevSuccessCount: null,
      prevFailCount: null,
      grade: 1,
      now,
    });
    expect(r.attempt_count).toBe(1);
    expect(r.success_count).toBe(1);
    expect(r.fail_count).toBe(0);

    r = computeNextProgress({
      prevStage: r.stage,
      prevIntervalDays: r.interval_days,
      prevAttemptCount: r.attempt_count,
      prevSuccessCount: r.success_count,
      prevFailCount: r.fail_count,
      grade: 0,
      now,
    });
    expect(r.attempt_count).toBe(2);
    expect(r.success_count).toBe(1);
    expect(r.fail_count).toBe(1);

    r = computeNextProgress({
      prevStage: r.stage,
      prevIntervalDays: r.interval_days,
      prevAttemptCount: r.attempt_count,
      prevSuccessCount: r.success_count,
      prevFailCount: r.fail_count,
      grade: 2,
      now,
    });
    expect(r.attempt_count).toBe(3);
    expect(r.success_count).toBe(2);
    expect(r.fail_count).toBe(1);
  });
});

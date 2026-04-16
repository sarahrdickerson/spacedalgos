type Grade = 0 | 1 | 2;

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

const MAX_INTERVAL_GOOD = 30;
const MAX_INTERVAL_EASY = 90;

export function computeNextProgress(params: {
  prevStage: number | null;
  prevIntervalDays: number | null;
  prevAttemptCount: number | null;
  prevSuccessCount: number | null;
  prevFailCount: number | null;
  grade: Grade;
  now: Date;
}) {
  const {
    prevStage,
    prevIntervalDays,
    prevAttemptCount,
    prevSuccessCount,
    prevFailCount,
    grade,
    now,
  } = params;

  const attempt_count = (prevAttemptCount ?? 0) + 1;
  const isSuccess = grade >= 1;
  const success_count = (prevSuccessCount ?? 0) + (isSuccess ? 1 : 0);
  const fail_count = (prevFailCount ?? 0) + (!isSuccess ? 1 : 0);

  let stage = prevStage ?? 0;
  if (grade === 0) {
    stage = Math.max(1, stage - 1);
  } else if (grade === 1) {
    stage = Math.min(2, Math.max(1, stage + 1));
  } else {
    stage = Math.min(3, Math.max(1, stage + 1));
  }

  let interval_days: number;
  if (!prevIntervalDays || prevIntervalDays <= 0) {
    interval_days = grade === 2 ? 3 : 1;
  } else if (prevAttemptCount === 1) {
    interval_days = grade === 0 ? 1 : grade === 2 ? 7 : 3;
  } else if (grade === 0) {
    interval_days = Math.max(1, Math.floor(prevIntervalDays * 0.25));
  } else if (grade === 1) {
    interval_days = Math.min(MAX_INTERVAL_GOOD, Math.ceil(prevIntervalDays * 2.0));
  } else {
    interval_days = Math.min(MAX_INTERVAL_EASY, Math.ceil(prevIntervalDays * 2.3));
  }

  const next_review_at = addDays(now, interval_days).toISOString();

  return {
    stage,
    interval_days,
    next_review_at,
    attempt_count,
    success_count,
    fail_count,
    last_attempt_at: now.toISOString(),
    last_success_at: isSuccess ? now.toISOString() : null,
  };
}

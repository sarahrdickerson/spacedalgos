/**
 * Pure helper for building the due-problem queue.
 *
 * Used by both /api/problemlists/[listKey]/due and /api/dashboard-data so that
 * the bucketing/capping algorithm stays in one place and bugfixes apply everywhere.
 *
 * Algorithm overview (see docs/SPACED_REPETITION.md for full details):
 *   1. Build reviewProblems: problems that have a scheduled next_review_at.
 *   2. Split into three buckets by date:
 *      - overdue  (next_review_at < localDayStartMs) — uncapped, always shown
 *      - today    (localDayStartMs ≤ … < localDayEndMs) — capped to reviewPerDay
 *      - future   (next_review_at ≥ localDayEndMs) — uncapped, powers "this week"
 *   3. newProblems: unseen problems shown only when there are zero overdue reviews,
 *      up to (newPerDay − slots already consumed today).
 *   4. upcomingNewProblems: projected new problems through end of this calendar week.
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export interface DueQueueParams {
  /** problem_list_items rows with the problems relation joined in */
  items: any[];
  /** user_problem_progress rows for the problems in this list */
  progressData: any[];
  /** UTC ms of the start of the user's local calendar day */
  localDayStartMs: number;
  /** UTC ms of the end of the user's local calendar day */
  localDayEndMs: number;
  /** User's local calendar year/month/day — used for upcoming projection */
  localYear: number;
  localMonth: number;
  localDay: number;
  /** From user_study_plans */
  newPerDay: number;
  reviewPerDay: number;
}

/** Shapes a problem row + list-item metadata into the common response object. */
function problemFields(problem: any, item: any) {
  return {
    id: problem.id,
    key: problem.key,
    title: problem.title,
    difficulty: problem.difficulty,
    category: problem.category,
    leetcode_url: `https://leetcode.com/problems/${problem.leetcode_slug}/`,
    is_premium: problem.is_premium,
    order_index: item.order_index,
    list_tags: item.list_tags,
  };
}

/**
 * Returns the complete ordered due-problems array:
 *   [...overdue, ...cappedToday, ...future, ...newProblems, ...upcomingNewProblems]
 */
export function buildDueQueue(params: DueQueueParams): any[] {
  const {
    items,
    progressData,
    localDayStartMs,
    localDayEndMs,
    localYear,
    localMonth,
    localDay,
    newPerDay,
    reviewPerDay,
  } = params;

  const progressMap = new Map(progressData.map((p) => [p.problem_id, p]));

  // 1) Build review candidates.
  // nextReviewMs is computed once here and cached on each candidate so that
  // the bucketing filters and sort comparator never re-parse the date string.
  const reviewCandidates = items
    .map((item: any) => {
      const problem = item.problems;
      if (!problem) return null;
      const progress = progressMap.get(problem.id);
      if (!progress?.next_review_at) return null;
      const nextReviewMs = new Date(progress.next_review_at).getTime();
      if (!Number.isFinite(nextReviewMs)) return null;
      const daysUntil = Math.floor(
        (nextReviewMs - localDayStartMs) / MS_PER_DAY,
      );
      return {
        nextReviewMs, // cached — used for bucketing/sorting, not included in output
        problem: {
          ...problemFields(problem, item),
          progress: {
            stage: progress.stage,
            next_review_at: progress.next_review_at,
            last_attempt_at: progress.last_attempt_at,
            last_success_at: progress.last_success_at,
            attempt_count: progress.attempt_count,
            success_count: progress.success_count,
            fail_count: progress.fail_count,
            interval_days: progress.interval_days,
            days_until: daysUntil,
            days_overdue: daysUntil < 0 ? Math.abs(daysUntil) : 0,
          },
        },
      };
    })
    .filter(Boolean) as Array<{ nextReviewMs: number; problem: any }>;

  // 2) Split into three buckets and cap today's reviews.
  // The comparator operates directly on the cached nextReviewMs value.
  const compareMs = (
    a: { nextReviewMs: number },
    b: { nextReviewMs: number },
  ) => a.nextReviewMs - b.nextReviewMs;

  const overdueProblems = reviewCandidates
    .filter((c) => c.nextReviewMs < localDayStartMs)
    .sort(compareMs)
    .map((c) => c.problem);

  const todayScheduled = reviewCandidates
    .filter(
      (c) => c.nextReviewMs >= localDayStartMs && c.nextReviewMs < localDayEndMs,
    )
    .sort(compareMs)
    .map((c) => c.problem);

  const futureScheduled = reviewCandidates
    .filter((c) => c.nextReviewMs >= localDayEndMs)
    .sort(compareMs)
    .map((c) => c.problem);

  const cappedToday =
    reviewPerDay > 0 ? todayScheduled.slice(0, reviewPerDay) : todayScheduled;
  const cappedReviewProblems = [
    ...overdueProblems,
    ...cappedToday,
    ...futureScheduled,
  ];

  // 3) New problems — only when all overdue reviews are cleared.
  // overdueProblems is already computed from the same dataset; no need to rescan.
  const hasOverdueReviews = overdueProblems.length > 0;

  let newProblems: any[] = [];
  if (newPerDay > 0 && !hasOverdueReviews) {
    const seenProblemIds = new Set(progressData.map((p: any) => p.problem_id));

    // Subtract slots already consumed today: problems whose first-ever attempt was
    // logged today (attempt_count === 1 and last_attempt_at falls within today's
    // local-day bounds). Uses timezone-aware bounds so post-6PM CST attempts (which
    // are already UTC "tomorrow") are still counted against today's quota.
    const newSlotsUsedToday = progressData.filter((p: any) => {
      if (p.attempt_count !== 1 || !p.last_attempt_at) return false;
      const t = Date.parse(p.last_attempt_at);
      return t >= localDayStartMs && t < localDayEndMs;
    }).length;

    const effectiveNewPerDay = Math.max(0, newPerDay - newSlotsUsedToday);
    const unseenItems = items
      .filter(
        (item: any) => item.problems && !seenProblemIds.has(item.problems.id),
      )
      .slice(0, effectiveNewPerDay);

    newProblems = unseenItems.map((item: any) => ({
      ...problemFields(item.problems, item),
      is_new: true,
      progress: null,
    }));
  }

  // 4) Project upcoming new problems through end of this calendar week.
  // Uses the full newPerDay (not effectiveNewPerDay) since tomorrow's quota resets.
  // Treat today's new problems as already seen so they don't double-appear.
  let upcomingNewProblems: any[] = [];
  if (newPerDay > 0) {
    const allSeenIds = new Set(progressData.map((p: any) => p.problem_id));
    newProblems.forEach((p: any) => allSeenIds.add(p.id));

    const allUnseenItems = items.filter(
      (item: any) => item.problems && !allSeenIds.has(item.problems.id),
    );

    const tomorrowUTC = new Date(
      Date.UTC(localYear, localMonth - 1, localDay + 1),
    );
    // Project through end of this calendar week (through Saturday).
    // getUTCDay(): 0=Sun … 6=Sat. Count days from tomorrow through Saturday (inclusive).
    const tomorrowDow = tomorrowUTC.getUTCDay();
    const maxDays = (7 - tomorrowDow) % 7 || 7;
    let problemIndex = 0;
    let dayOffset = 0;

    while (problemIndex < allUnseenItems.length && dayOffset < maxDays) {
      const date = new Date(tomorrowUTC);
      date.setUTCDate(tomorrowUTC.getUTCDate() + dayOffset);
      const dateStr = date.toISOString().split("T")[0];

      for (
        let i = 0;
        i < newPerDay &&
        problemIndex < allUnseenItems.length &&
        dayOffset < maxDays;
        i++
      ) {
        const item = allUnseenItems[problemIndex] as any;
        upcomingNewProblems.push({
          ...problemFields(item.problems, item),
          is_new: true,
          projected_date: dateStr,
          progress: null,
        });
        problemIndex++;
      }
      dayOffset++;
    }
  }

  return [...cappedReviewProblems, ...newProblems, ...upcomingNewProblems];
}

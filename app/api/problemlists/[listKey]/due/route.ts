import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseLocalDateBounds } from "@/lib/api/parseLocalDateBounds";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ listKey: string }> },
) {
  try {
    const supabase = await createClient();

    // 1) Auth
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listKey } = await params;
    let decodedListKey: string;
    try {
      decodedListKey = decodeURIComponent(listKey);
    } catch (err) {
      if (err instanceof URIError) {
        return NextResponse.json(
          { error: "Invalid problem list key" },
          { status: 400 },
        );
      }
      throw err;
    }

    // 2) Get the problem list by key
    const { data: problemList, error: listErr } = await supabase
      .from("problem_lists")
      .select("id, key, name")
      .eq("key", decodedListKey)
      .single();

    if (listErr || !problemList) {
      return NextResponse.json(
        { error: `Problem list not found: ${decodedListKey}` },
        { status: 404 },
      );
    }

    // 3) Get all problems in this list
    const { data: items, error: itemsErr } = await supabase
      .from("problem_list_items")
      .select(
        `
        order_index,
        list_tags,
        problems (
          id,
          key,
          title,
          difficulty,
          category,
          leetcode_slug,
          is_premium
        )
      `,
      )
      .eq("list_id", problemList.id)
      .order("order_index", { ascending: true });

    if (itemsErr) {
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({
        list: problemList,
        due_problems: [],
      });
    }

    // 4) Get user progress for all problems in this list
    const problemIds = items
      .map((item: any) => item.problems?.id)
      .filter(Boolean);

    let dueProgressData: any[] | null = [];
    let progressErr: any = null;

    if (problemIds.length > 0) {
      const { data, error } = await supabase
        .from("user_problem_progress")
        .select("*")
        .eq("user_id", user.id)
        .in("problem_id", problemIds);

      dueProgressData = data;
      progressErr = error;
    }

    if (progressErr) {
      return NextResponse.json({ error: progressErr.message }, { status: 500 });
    }

    // 5) Map progress by problem_id
    const dueProgressMap = new Map();
    if (dueProgressData) {
      dueProgressData.forEach((p) => {
        dueProgressMap.set(p.problem_id, p);
      });
    }

    // 6) Fetch the user's study plan for new/review problem scheduling
    const { data: studyPlan, error: studyPlanErr } = await supabase
      .from("user_study_plans")
      .select("new_per_day, review_per_day")
      .eq("user_id", user.id)
      .eq("list_id", problemList.id)
      .eq("is_active", true)
      .maybeSingle();

    if (studyPlanErr) {
      console.error("Error fetching study plan:", studyPlanErr);
    }

    // Default to 0 on error so the review queue still returns normally
    const newPerDay = studyPlanErr ? 0 : (studyPlan?.new_per_day ?? 0);
    // null/0 means no cap
    const reviewPerDay: number = studyPlanErr
      ? 0
      : (studyPlan?.review_per_day ?? 0);

    // 7) Build the review queue (all problems that have a progress row)
    // Use client's local date/timezone so "today" boundaries match the user's clock.
    const { searchParams } = new URL(request.url);
    const dateBounds = parseLocalDateBounds(searchParams);
    if (!dateBounds) {
      return NextResponse.json(
        { error: "Invalid localDate format, expected YYYY-MM-DD" },
        { status: 400 },
      );
    }
    const {
      localYear,
      localMonth,
      localDay,
      localDayStartUTC,
      localDayEndUTC,
    } = dateBounds;

    const reviewProblems = items
      .map((item: any) => {
        const problem = item.problems;
        if (!problem) return null;

        const progress = dueProgressMap.get(problem.id);
        if (!progress) return null; // Only include problems with progress
        if (!progress.next_review_at) return null; // No review scheduled yet — skip

        // Calculate days until/overdue using calendar dates rather than raw
        // millisecond durations, so DST transitions (23h/25h days) do not cause
        // off-by-one errors.
        const nextReview = new Date(progress.next_review_at);
        const startDate = new Date(localDayStartUTC);

        // Normalize both timestamps to their UTC "date-only" midnights.
        const startUtcMidnight = Date.UTC(
          startDate.getUTCFullYear(),
          startDate.getUTCMonth(),
          startDate.getUTCDate(),
        );
        const reviewUtcMidnight = Date.UTC(
          nextReview.getUTCFullYear(),
          nextReview.getUTCMonth(),
          nextReview.getUTCDate(),
        );

        const daysUntil = Math.round(
          (reviewUtcMidnight - startUtcMidnight) / (1000 * 60 * 60 * 24),
        );

        return {
          ...problem,
          leetcode_url: `https://leetcode.com/problems/${problem.leetcode_slug}/`,
          order_index: item.order_index,
          list_tags: item.list_tags,
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
        };
      })
      .filter(Boolean);

    // 7b) Split reviews into three buckets using localDayStartUTC / localDayEndUTC:
    //   - overdue:   next_review_at < localDayStartUTC (before today in user's TZ) — shown uncapped
    //   - today:     localDayStartUTC <= next_review_at < localDayEndUTC — capped to review_per_day
    //   - future:    next_review_at >= localDayEndUTC — always included uncapped (for "this week" view)
    const localDayStartMs = new Date(localDayStartUTC).getTime();
    const localDayEndMs = new Date(localDayEndUTC).getTime();

    const reviewProblemsWithMs = (reviewProblems ?? []).map((p: any) => ({
      ...p,
      progress: {
        ...p.progress,
        nextReviewMs: p.progress?.next_review_at
          ? new Date(p.progress.next_review_at).getTime()
          : NaN,
      },
    }));

    const compareNextReviewMs = (a: any, b: any) => {
      const aMs = a.progress?.nextReviewMs;
      const bMs = b.progress?.nextReviewMs;
      if (!Number.isFinite(aMs) || !Number.isFinite(bMs)) return 0;
      return aMs - bMs;
    };

    const overdueProblems = reviewProblemsWithMs
      .filter((p: any) => p.progress.nextReviewMs < localDayStartMs)
      .sort(compareNextReviewMs);

    const todayScheduled = reviewProblemsWithMs
      .filter(
        (p: any) =>
          p.progress.nextReviewMs >= localDayStartMs &&
          p.progress.nextReviewMs < localDayEndMs,
      )
      .sort(compareNextReviewMs);

    const futureScheduled = reviewProblemsWithMs
      .filter((p: any) => p.progress.nextReviewMs >= localDayEndMs)
      .sort(compareNextReviewMs);

    const cappedToday =
      reviewPerDay > 0 ? todayScheduled.slice(0, reviewPerDay) : todayScheduled;

    const cappedReviewProblems = [
      ...overdueProblems,
      ...cappedToday,
      ...futureScheduled,
    ];

    // 8) Check if any reviews are overdue using localDayStartUTC (consistent with
    // the local-day-based daysUntil logic above and correct for non-UTC timezones).
    const hasOverdueReviews = (dueProgressData ?? []).some((p: any) => {
      if (!p.next_review_at) return false;
      const nextReviewTime = new Date(p.next_review_at).getTime();
      const localDayStartTime = localDayStartMs;
      return nextReviewTime < localDayStartTime;
    });

    // 9) Add new problems only when all reviews are caught up
    let newProblems: any[] = [];
    if (newPerDay > 0 && !hasOverdueReviews) {
      const seenProblemIds = new Set(
        (dueProgressData ?? []).map((p: any) => p.problem_id),
      );

      // Subtract slots already consumed today: problems whose first-ever attempt
      // was logged today (attempt_count === 1 and last_attempt_at is today).
      // Use timezone-aware local-day bounds so post-6PM CST attempts (which are
      // already UTC "tomorrow") are still counted as today's consumed slot.
      const newSlotsUsedToday = (dueProgressData ?? []).filter((p: any) => {
        if (
          p.attempt_count !== 1 ||
          !p.last_attempt_at
        ) {
          return false;
        }
        const lastAttemptTime = new Date(p.last_attempt_at).getTime();
        const localDayStartTimeUTC = new Date(localDayStartUTC).getTime();
        const localDayEndTimeUTC = new Date(localDayEndUTC).getTime();
        return (
          lastAttemptTime >= localDayStartTimeUTC &&
          lastAttemptTime < localDayEndTimeUTC
        );
      }).length;
      const effectiveNewPerDay = Math.max(0, newPerDay - newSlotsUsedToday);

      const unseenItems = items
        .filter(
          (item: any) => item.problems && !seenProblemIds.has(item.problems.id),
        )
        .slice(0, effectiveNewPerDay);

      newProblems = unseenItems.map((item: any) => ({
        ...item.problems,
        leetcode_url: `https://leetcode.com/problems/${item.problems.leetcode_slug}/`,
        order_index: item.order_index,
        list_tags: item.list_tags,
        is_new: true,
        progress: null,
      }));
    }

    // 10) Project upcoming new problems for the next 7 days (for "due this week" view).
    // Uses full newPerDay (not effectiveNewPerDay) since tomorrow's quota resets.
    let upcomingNewProblems: any[] = [];
    if (newPerDay > 0) {
      // Treat today's new problems as already "seen" so they don't double-appear
      const allSeenIds = new Set(
        (dueProgressData ?? []).map((p: any) => p.problem_id),
      );
      newProblems.forEach((p: any) => allSeenIds.add(p.id));

      const allUnseenItems = items.filter(
        (item: any) => item.problems && !allSeenIds.has(item.problems.id),
      );

      const tomorrowUTC = new Date(
        Date.UTC(localYear, localMonth - 1, localDay + 1),
      );
      let problemIndex = 0;
      let dayOffset = 0;
      // Project through end of this calendar week (through Saturday).
      // getUTCDay(): 0=Sun … 6=Sat. Count days from tomorrow through Saturday (inclusive).
      const tomorrowDow = tomorrowUTC.getUTCDay();
      const maxDays = (7 - tomorrowDow) % 7 || 7;

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
            ...item.problems,
            leetcode_url: `https://leetcode.com/problems/${item.problems.leetcode_slug}/`,
            order_index: item.order_index,
            list_tags: item.list_tags,
            is_new: true,
            projected_date: dateStr,
            progress: null,
          });
          problemIndex++;
        }
        dayOffset++;
      }
    }

    const dueProblems = [
      ...cappedReviewProblems,
      ...newProblems,
      ...upcomingNewProblems,
    ];

    return NextResponse.json({
      list: problemList,
      due_problems: dueProblems,
      count: dueProblems.length,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: "Unexpected error fetching due problems" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseLocalDateBounds } from "@/lib/api/parseLocalDateBounds";

/**
 * GET /api/dashboard-data?localDate=YYYY-MM-DD&tzOffset=number
 *
 * Combined endpoint that returns everything the dashboard and problems tab
 * need in a single request. Replaces the serial waterfall of:
 *   active-study-plan → problemlists → streak → stats + due + progress
 *
 * DB query plan (4 serial waves, heavily parallelised within each):
 *   1. auth.getUser()
 *   2. [user_preferences, problem_lists+count, user_daily_activity]
 *   3. [active list details, user_study_plans, problem_list_items+problems]
 *   4. user_problem_progress  (needs problem IDs from wave 3)
 *
 * Response shape mirrors what DashboardProvider assembled from the
 * individual endpoints so the provider swap is a near-drop-in.
 */
export async function GET(request: Request) {
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
    const localDayStartMs = Date.parse(localDayStartUTC);
    const localDayEndMs = Date.parse(localDayEndUTC);
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    // 2) Independent data in parallel
    const [prefsRes, allListsRes, activityRes] = await Promise.all([
      supabase
        .from("user_preferences")
        .select(
          "active_list_id, current_streak, longest_streak, last_activity_date",
        )
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("problem_lists")
        .select(
          "id, key, name, source, version, description, problem_list_items(count)",
        ),
      supabase
        .from("user_daily_activity")
        .select("activity_date, problems_reviewed, problems_due_completed")
        .eq("user_id", user.id)
        .order("activity_date", { ascending: false })
        .limit(30),
    ]);

    // Preferences: a missing row (PGRST116) means no active plan yet — not an error
    if (prefsRes.error && prefsRes.error.code !== "PGRST116") {
      return NextResponse.json(
        { error: "Failed to fetch user preferences" },
        { status: 500 },
      );
    }
    const prefs = prefsRes.error ? null : prefsRes.data;

    if (allListsRes.error) {
      return NextResponse.json(
        { error: "Failed to fetch problem lists" },
        { status: 500 },
      );
    }

    if (activityRes.error) {
      return NextResponse.json(
        { error: "Failed to fetch activity data" },
        { status: 500 },
      );
    }

    // All problem lists (for list picker)
    const problemLists = (allListsRes.data ?? []).map((list: any) => ({
      id: list.id,
      key: list.key,
      name: list.name,
      source: list.source,
      version: list.version,
      description: list.description,
      problem_count:
        (list.problem_list_items as { count: number }[])[0]?.count ?? 0,
    }));

    // Streak — check staleness against the client's local date
    let currentStreak = prefs?.current_streak ?? 0;
    const lastActivity = prefs?.last_activity_date ?? null;
    if (lastActivity) {
      const yesterdayStr = new Date(
        Date.UTC(localYear, localMonth - 1, localDay - 1),
      )
        .toISOString()
        .split("T")[0];
      if (lastActivity < yesterdayStr) {
        currentStreak = 0;
      }
    }
    const streak = {
      current_streak: currentStreak,
      longest_streak: prefs?.longest_streak ?? 0,
      last_activity_date: lastActivity,
      recent_activity: activityRes.data ?? [],
    };

    const activeListId = prefs?.active_list_id ?? null;

    // No active list — return early, nothing else to fetch
    if (!activeListId) {
      return NextResponse.json({
        user_id: user.id,
        active_list: null,
        study_plan: null,
        problem_lists: problemLists,
        streak,
        due_problems: [],
        all_problems: [],
        stats: null,
      });
    }

    // 3) List-dependent data in parallel
    const [listRes, studyPlanRes, itemsRes] = await Promise.all([
      supabase
        .from("problem_lists")
        .select("id, key, name, source, version, description")
        .eq("id", activeListId)
        .single(),
      supabase
        .from("user_study_plans")
        .select(
          "pace, new_per_day, review_per_day, start_date, target_end_date",
        )
        .eq("user_id", user.id)
        .eq("list_id", activeListId)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("problem_list_items")
        .select(
          `
          order_index,
          list_tags,
          problems (
            id, key, title, difficulty, category, leetcode_slug, is_premium
          )
        `,
        )
        .eq("list_id", activeListId)
        .order("order_index", { ascending: true }),
    ]);

    if (listRes.error || !listRes.data) {
      return NextResponse.json(
        { error: "Active problem list not found" },
        { status: 404 },
      );
    }
    if (itemsRes.error) {
      return NextResponse.json(
        { error: itemsRes.error.message },
        { status: 500 },
      );
    }

    const activeList = listRes.data;
    const studyPlan = studyPlanRes.data ?? null;
    const items = itemsRes.data ?? [];

    // 4) User progress (needs problem IDs from step 3)
    const problemIds = items
      .map((item: any) => item.problems?.id)
      .filter(Boolean);

    let progressData: any[] = [];
    if (problemIds.length > 0) {
      const { data, error } = await supabase
        .from("user_problem_progress")
        .select(
          "problem_id, stage, next_review_at, last_attempt_at, last_success_at, attempt_count, success_count, fail_count, interval_days",
        )
        .eq("user_id", user.id)
        .in("problem_id", problemIds);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      progressData = data ?? [];
    }

    const progressMap = new Map(progressData.map((p) => [p.problem_id, p]));

    const newPerDay = studyPlan?.new_per_day ?? 0;
    const reviewPerDay = studyPlan?.review_per_day ?? 0;

    // --- all_problems (problems tab) ---
    const allProblems = items
      .map((item: any) => {
        const problem = item.problems;
        if (!problem) return null;
        const progress = progressMap.get(problem.id);
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
          progress: progress
            ? {
                stage: progress.stage,
                next_review_at: progress.next_review_at,
                last_attempt_at: progress.last_attempt_at,
                last_success_at: progress.last_success_at,
                attempt_count: progress.attempt_count,
                success_count: progress.success_count,
                fail_count: progress.fail_count,
                interval_days: progress.interval_days,
              }
            : null,
        };
      })
      .filter(Boolean);

    // --- stats (computed from allProblems — no extra DB query needed) ---
    const now = new Date();
    let mastered = 0,
      inProgress = 0,
      notStarted = 0,
      dueToday = 0;
    for (const problem of allProblems as any[]) {
      if (!problem.progress) {
        notStarted++;
      } else {
        const stage = problem.progress.stage;
        if (stage === 3) mastered++;
        else if (stage === 1 || stage === 2) inProgress++;
        if (
          problem.progress.next_review_at &&
          new Date(problem.progress.next_review_at) <= now
        ) {
          dueToday++;
        }
      }
    }
    const stats = {
      total: problemIds.length,
      mastered,
      dueToday,
      inProgress,
      notStarted,
    };

    // --- due_problems review queue (same logic as /due endpoint) ---
    const getNextReviewMs = (p: any) =>
      p?.progress?.next_review_at
        ? new Date(p.progress.next_review_at).getTime()
        : NaN;

    const compareNextReviewMs = (a: any, b: any) => {
      const aMs = getNextReviewMs(a);
      const bMs = getNextReviewMs(b);
      if (!Number.isFinite(aMs) || !Number.isFinite(bMs)) return 0;
      return aMs - bMs;
    };

    const reviewProblems = items
      .map((item: any) => {
        const problem = item.problems;
        if (!problem) return null;
        const progress = progressMap.get(problem.id);
        if (!progress?.next_review_at) return null;
        const daysUntil = Math.floor(
          (new Date(progress.next_review_at).getTime() - localDayStartMs) /
            MS_PER_DAY,
        );
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

    const overdueProblems = reviewProblems
      .filter((p: any) => getNextReviewMs(p) < localDayStartMs)
      .sort(compareNextReviewMs);
    const todayScheduled = reviewProblems
      .filter(
        (p: any) =>
          getNextReviewMs(p) >= localDayStartMs &&
          getNextReviewMs(p) < localDayEndMs,
      )
      .sort(compareNextReviewMs);
    const futureScheduled = reviewProblems
      .filter((p: any) => getNextReviewMs(p) >= localDayEndMs)
      .sort(compareNextReviewMs);

    const cappedToday =
      reviewPerDay > 0 ? todayScheduled.slice(0, reviewPerDay) : todayScheduled;
    const cappedReviewProblems = [
      ...overdueProblems,
      ...cappedToday,
      ...futureScheduled,
    ];

    // New problems (only when no overdue reviews)
    const hasOverdueReviews = progressData.some(
      (p: any) =>
        p.next_review_at && Date.parse(p.next_review_at) < localDayStartMs,
    );

    let newProblems: any[] = [];
    if (newPerDay > 0 && !hasOverdueReviews) {
      const seenProblemIds = new Set(
        progressData.map((p: any) => p.problem_id),
      );
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
        id: item.problems.id,
        key: item.problems.key,
        title: item.problems.title,
        difficulty: item.problems.difficulty,
        category: item.problems.category,
        leetcode_url: `https://leetcode.com/problems/${item.problems.leetcode_slug}/`,
        is_premium: item.problems.is_premium,
        order_index: item.order_index,
        list_tags: item.list_tags,
        is_new: true,
        progress: null,
      }));
    }

    // Projected upcoming new problems (rest of calendar week)
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
            id: item.problems.id,
            key: item.problems.key,
            title: item.problems.title,
            difficulty: item.problems.difficulty,
            category: item.problems.category,
            leetcode_url: `https://leetcode.com/problems/${item.problems.leetcode_slug}/`,
            is_premium: item.problems.is_premium,
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
      user_id: user.id,
      active_list: activeList,
      study_plan: studyPlan,
      problem_lists: problemLists,
      streak,
      due_problems: dueProblems,
      all_problems: allProblems,
      stats,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: "Unexpected error fetching dashboard data" },
      { status: 500 },
    );
  }
}

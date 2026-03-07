import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseLocalDateBounds } from "@/lib/api/parseLocalDateBounds";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ listKey: string }> }
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
          { status: 400 }
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
        { status: 404 }
      );
    }

    // 3) Get all problems in this list
    const { data: items, error: itemsErr } = await supabase
      .from("problem_list_items")
      .select(`
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
      `)
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
      return NextResponse.json(
        { error: progressErr.message },
        { status: 500 }
      );
    }

    // 5) Map progress by problem_id
    const dueProgressMap = new Map();
    if (dueProgressData) {
      dueProgressData.forEach((p) => {
        dueProgressMap.set(p.problem_id, p);
      });
    }

    // 6) Fetch the user's study plan for new-problem scheduling
    const { data: studyPlan, error: studyPlanErr } = await supabase
      .from("user_study_plans")
      .select("new_per_day")
      .eq("user_id", user.id)
      .eq("list_id", problemList.id)
      .eq("is_active", true)
      .maybeSingle();

    if (studyPlanErr) {
      console.error("Error fetching study plan:", studyPlanErr);
    }

    // Default to 0 on error so the review queue still returns normally
    const newPerDay = studyPlanErr ? 0 : (studyPlan?.new_per_day ?? 0);

    // 7) Build the review queue (all problems that have a progress row)
    const now = new Date();

    // Use client's local date/timezone so "today" boundaries match the user's clock.
    const { searchParams } = new URL(request.url);
    const dateBounds = parseLocalDateBounds(searchParams);
    if (!dateBounds) {
      return NextResponse.json(
        { error: "Invalid localDate format, expected YYYY-MM-DD" },
        { status: 400 }
      );
    }
    const { localYear, localMonth, localDay, todayMidnightUTC, localDayStartUTC, localDayEndUTC } = dateBounds;

    const reviewProblems = items
      .map((item: any) => {
        const problem = item.problems;
        if (!problem) return null;

        const progress = dueProgressMap.get(problem.id);
        if (!progress) return null; // Only include problems with progress
        if (!progress.next_review_at) return null; // No review scheduled yet — skip

        // Calculate days until/overdue
        const nextReview = new Date(progress.next_review_at);
        const diffMs = nextReview.getTime() - now.getTime();
        const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

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

    // 8) Check if any reviews are overdue (scheduled before today's midnight UTC)
    const hasOverdueReviews = (dueProgressData ?? []).some(
      (p: any) => p.next_review_at && p.next_review_at < todayMidnightUTC
    );

    // 9) Add new problems only when all reviews are caught up
    let newProblems: any[] = [];
    if (newPerDay > 0 && !hasOverdueReviews) {
      const seenProblemIds = new Set(
        (dueProgressData ?? []).map((p: any) => p.problem_id)
      );

      // Subtract slots already consumed today: problems whose first-ever attempt
      // was logged today (attempt_count === 1 and last_attempt_at is today).
      // Use timezone-aware local-day bounds so post-6PM CST attempts (which are
      // already UTC "tomorrow") are still counted as today's consumed slot.
      const newSlotsUsedToday = (dueProgressData ?? []).filter(
        (p: any) =>
          p.attempt_count === 1 &&
          p.last_attempt_at &&
          p.last_attempt_at >= localDayStartUTC &&
          p.last_attempt_at < localDayEndUTC
      ).length;
      const effectiveNewPerDay = Math.max(0, newPerDay - newSlotsUsedToday);

      const unseenItems = items
        .filter((item: any) => item.problems && !seenProblemIds.has(item.problems.id))
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
      const allSeenIds = new Set((dueProgressData ?? []).map((p: any) => p.problem_id));
      newProblems.forEach((p: any) => allSeenIds.add(p.id));

      const allUnseenItems = items.filter(
        (item: any) => item.problems && !allSeenIds.has(item.problems.id)
      );

      const tomorrowUTC = new Date(
        Date.UTC(localYear, localMonth - 1, localDay + 1)
      );
      let problemIndex = 0;
      let dayOffset = 0;
      // Project through end of this calendar week (through Saturday).
      // getUTCDay(): 0=Sun … 6=Sat. Count days from tomorrow through Saturday (inclusive).
      const tomorrowDow = tomorrowUTC.getUTCDay();
      const maxDays = ((7 - tomorrowDow) % 7) || 7;

      while (problemIndex < allUnseenItems.length && dayOffset < maxDays) {
        const date = new Date(tomorrowUTC);
        date.setUTCDate(tomorrowUTC.getUTCDate() + dayOffset);
        const dateStr = date.toISOString().split("T")[0];

        for (let i = 0; i < newPerDay && problemIndex < allUnseenItems.length && dayOffset < maxDays; i++) {
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

    const dueProblems = [...reviewProblems, ...newProblems, ...upcomingNewProblems];

    return NextResponse.json({
      list: problemList,
      due_problems: dueProblems,
      count: dueProblems.length,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: "Unexpected error fetching due problems" },
      { status: 500 }
    );
  }
}

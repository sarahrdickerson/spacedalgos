import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  props: { params: Promise<{ listKey: string }> }
) {
  try {
    const params = await props.params;
    let listKey: string;

    try {
      listKey = decodeURIComponent(params.listKey);
    } catch (err) {
      if (err instanceof URIError) {
        return NextResponse.json(
          { error: "Invalid list key" },
          { status: 400 }
        );
      }
      throw err;
    }

    const supabase = await createClient();

    // Get user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the problem list
    const { data: list, error: listError } = await supabase
      .from("problem_lists")
      .select("id")
      .eq("key", listKey)
      .single();

    if (listError || !list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Get all problems in this list
    const { data: listItems, error: itemsError } = await supabase
      .from("problem_list_items")
      .select(`
        problem_id,
        order_index,
        problems (
          id,
          key,
          title,
          difficulty,
          category
        )
      `)
      .eq("list_id", list.id)
      .order("order_index", { ascending: true });

    if (itemsError) {
      return NextResponse.json(
        { error: "Failed to fetch list items" },
        { status: 500 }
      );
    }

    const problemIds = listItems?.map((item) => item.problem_id) || [];

    if (problemIds.length === 0) {
      return NextResponse.json({
        past_attempts: [],
        upcoming_reviews: [],
        projected_new: [],
      });
    }

    // Fetch all attempts for these problems
    // TODO: limit by time range for better performance once we setup time bounds for study plan
    const { data: attempts, error: attemptsError } = await supabase
      .from("user_problem_attempts")
      .select("problem_id, attempted_at, grade, stage")
      .eq("user_id", user.id)
      .in("problem_id", problemIds)
      .order("attempted_at", { ascending: false });

    if (attemptsError) {
      console.error("Error fetching attempts:", attemptsError);
      return NextResponse.json(
        { error: "Failed to fetch attempts" },
        { status: 500 }
      );
    }

    // Fetch ALL progress rows (for seen-problem tracking + upcoming reviews)
    const { data: progress, error: progressError } = await supabase
      .from("user_problem_progress")
      .select("problem_id, next_review_at, stage, attempt_count")
      .eq("user_id", user.id)
      .in("problem_id", problemIds);

    if (progressError) {
      console.error("Error fetching progress:", progressError);
      return NextResponse.json(
        { error: "Failed to fetch progress" },
        { status: 500 }
      );
    }

    // Build a map of problem details
    const problemMap = new Map();
    listItems?.forEach((item: any) => {
      if (item.problems) {
        problemMap.set(item.problem_id, item.problems);
      }
    });

    // Build per-problem attempt count map for O(n) attempt numbering
    const problemAttemptCounts = new Map<string, number>();
    attempts?.forEach((attempt: any) => {
      problemAttemptCounts.set(
        attempt.problem_id,
        (problemAttemptCounts.get(attempt.problem_id) || 0) + 1
      );
    });

    // Format past attempts with attempt numbers (O(n) - single pass with decrementing counter)
    const problemCounters = new Map<string, number>();
    const pastAttempts = (attempts || []).map((attempt: any) => {
      // Initialize counter to total count for this problem on first encounter
      if (!problemCounters.has(attempt.problem_id)) {
        problemCounters.set(
          attempt.problem_id,
          problemAttemptCounts.get(attempt.problem_id) || 0
        );
      }
      
      // Get current counter value and decrement for next iteration
      const attemptNumber = problemCounters.get(attempt.problem_id)!;
      problemCounters.set(attempt.problem_id, attemptNumber - 1);
      
      return {
        problem_id: attempt.problem_id,
        problem_key: problemMap.get(attempt.problem_id)?.key,
        problem_title: problemMap.get(attempt.problem_id)?.title,
        difficulty: problemMap.get(attempt.problem_id)?.difficulty,
        category: problemMap.get(attempt.problem_id)?.category,
        attempted_at: attempt.attempted_at,
        grade: attempt.grade,
        stage: attempt.stage,
        attempt_number: attemptNumber,
      };
    });

    // Format upcoming reviews (only problems with a scheduled next_review_at)
    const upcomingReviews = (progress || [])
      .filter((prog: any) => prog.next_review_at != null)
      .map((prog: any) => ({
        problem_id: prog.problem_id,
        problem_key: problemMap.get(prog.problem_id)?.key,
        problem_title: problemMap.get(prog.problem_id)?.title,
        difficulty: problemMap.get(prog.problem_id)?.difficulty,
        category: problemMap.get(prog.problem_id)?.category,
        next_review_at: prog.next_review_at,
        stage: prog.stage,
        attempt_count: prog.attempt_count,
      }));

    // Projected new problems: unseen problems assigned to future calendar days
    const { data: studyPlan, error: studyPlanErr } = await supabase
      .from("user_study_plans")
      .select("new_per_day")
      .eq("user_id", user.id)
      .eq("list_id", list.id)
      .eq("is_active", true)
      .maybeSingle();

    if (studyPlanErr) {
      console.error("Error fetching study plan for calendar:", studyPlanErr);
    }

    // Default to 0 on error — calendar still renders past attempts and upcoming reviews
    const newPerDay = studyPlanErr ? 0 : (studyPlan?.new_per_day ?? 0);
    const seenProblemIds = new Set((progress ?? []).map((p: any) => p.problem_id));

    const unseenItems = (listItems ?? [])
      .filter((item: any) => !seenProblemIds.has(item.problem_id))
      // already ordered by order_index ASC from the query
      ;

    const projectedNew: any[] = [];
    if (newPerDay > 0 && unseenItems.length > 0) {
      // Use client's local date so midnight boundary matches the user's timezone
      const { searchParams } = new URL(request.url);
      const localDateParam = searchParams.get("localDate");
      if (localDateParam && !/^\d{4}-\d{2}-\d{2}$/.test(localDateParam)) {
        return NextResponse.json(
          { error: "Invalid localDate format, expected YYYY-MM-DD" },
          { status: 400 }
        );
      }
      const now = new Date();
      const [localYear, localMonth, localDay] = localDateParam
        ? localDateParam.split("-").map(Number)
        : [now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate()];

      const todayMidnightUTC = new Date(
        Date.UTC(localYear, localMonth - 1, localDay)
      ).toISOString();
      const tomorrowMidnightUTC = new Date(
        Date.UTC(localYear, localMonth - 1, localDay + 1)
      ).toISOString();

      // Compute timezone-aware local-day bounds for slot counting.
      // getTimezoneOffset() returns (UTC − local) in minutes, e.g. CST = +360.
      // Adding it to UTC midnight gives the user's actual local midnight in UTC
      // so post-6PM CST attempts (already UTC "tomorrow") still count as today.
      const tzOffsetParam = searchParams.get("tzOffset");
      const tzOffsetMinutes = tzOffsetParam !== null && /^-?\d+$/.test(tzOffsetParam)
        ? Math.max(-720, Math.min(840, parseInt(tzOffsetParam, 10)))
        : 0;
      const localDayStartUTC = new Date(
        Date.UTC(localYear, localMonth - 1, localDay) + tzOffsetMinutes * 60 * 1000
      ).toISOString();
      const localDayEndUTC = new Date(
        Date.UTC(localYear, localMonth - 1, localDay) + tzOffsetMinutes * 60 * 1000 + 86_400_000
      ).toISOString();

      // Count "new" slots already consumed today: problems whose very first attempt
      // was logged today. Attempts are sorted descending, so the last write per
      // problem_id is the earliest (first-ever) attempt.
      const firstAttemptByProblem = new Map<string, string>();
      (attempts ?? []).forEach((a: any) => {
        firstAttemptByProblem.set(a.problem_id, a.attempted_at);
      });
      let newSlotsUsedToday = 0;
      firstAttemptByProblem.forEach((earliestAttempt) => {
        if (earliestAttempt >= localDayStartUTC && earliestAttempt < localDayEndUTC) {
          newSlotsUsedToday++;
        }
      });
      // Remaining slots for new problems today
      const todayNewSlots = Math.max(0, newPerDay - newSlotsUsedToday);

      const hasOverdueReviews = (progress ?? []).some(
        (p: any) => p.next_review_at && p.next_review_at < todayMidnightUTC
      );

      // When no overdue reviews the first todayNewSlots unseen problems are in today's
      // due queue — emit them with is_today_new so the client can pin them to today's
      // local date, then project the remainder from tomorrow onward.
      let projectionStartIndex = 0;
      if (!hasOverdueReviews && todayNewSlots > 0) {
        const todayItems = unseenItems.slice(0, todayNewSlots);
        todayItems.forEach((item: any) => {
          const problem = problemMap.get(item.problem_id);
          projectedNew.push({
            problem_id: item.problem_id,
            problem_key: problem?.key,
            problem_title: problem?.title,
            difficulty: problem?.difficulty,
            category: problem?.category,
            projected_date: null,
            is_today_new: true,
            order_index: item.order_index,
          });
        });
        projectionStartIndex = todayNewSlots;
      }

      const itemsToProject = unseenItems.slice(projectionStartIndex);
      const tomorrow = new Date(
        Date.UTC(localYear, localMonth - 1, localDay + 1)
      );

      let problemIndex = 0;
      let dayOffset = 0;

      while (problemIndex < itemsToProject.length) {
        const date = new Date(tomorrow);
        date.setUTCDate(tomorrow.getUTCDate() + dayOffset);
        const dateStr = date.toISOString().split("T")[0];

        for (let i = 0; i < newPerDay && problemIndex < itemsToProject.length; i++) {
          const item = itemsToProject[problemIndex] as any;
          const problem = problemMap.get(item.problem_id);
          projectedNew.push({
            problem_id: item.problem_id,
            problem_key: problem?.key,
            problem_title: problem?.title,
            difficulty: problem?.difficulty,
            category: problem?.category,
            projected_date: dateStr,
            is_today_new: false,
            order_index: item.order_index,
          });
          problemIndex++;
        }
        dayOffset++;
      }
    }

    return NextResponse.json({
      past_attempts: pastAttempts,
      upcoming_reviews: upcomingReviews,
      projected_new: projectedNew,
    });
  } catch (e) {
    console.error("Error in calendar endpoint:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

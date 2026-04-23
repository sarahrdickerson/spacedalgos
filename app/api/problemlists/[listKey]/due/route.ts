import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseLocalDateBounds } from "@/lib/api/parseLocalDateBounds";
import { buildDueQueue } from "@/lib/api/buildDueQueue";

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

    // 5) Fetch the user's study plan for new/review problem scheduling
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

    // 6) Parse local date bounds
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

    // 7) Build the due queue
    const dueProblems = buildDueQueue({
      items,
      progressData,
      localDayStartMs: Date.parse(localDayStartUTC),
      localDayEndMs: Date.parse(localDayEndUTC),
      localYear,
      localMonth,
      localDay,
      newPerDay,
      reviewPerDay,
    });

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

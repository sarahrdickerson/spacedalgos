import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  req: Request,
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

    // 2) Get the problem list by key
    const { data: problemList, error: listErr } = await supabase
      .from("problem_lists")
      .select("id, key, name")
      .eq("key", listKey)
      .single();

    if (listErr || !problemList) {
      return NextResponse.json(
        { error: `Problem list not found: ${listKey}` },
        { status: 404 }
      );
    }

    // 3) Get all problems in this list with their progress
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
        problems: [],
      });
    }

    // 4) Get user progress for all these problems
    const problemIds = items
      .map((item: any) => item.problems?.id)
      .filter(Boolean);

    const { data: progressData, error: progressErr } = await supabase
      .from("user_problem_progress")
      .select("*")
      .eq("user_id", user.id)
      .in("problem_id", problemIds);

    if (progressErr) {
      return NextResponse.json(
        { error: progressErr.message },
        { status: 500 }
      );
    }

    // 5) Map progress by problem_id for quick lookup
    const progressMap = new Map();
    if (progressData) {
      progressData.forEach((p) => {
        progressMap.set(p.problem_id, p);
      });
    }

    // 6) Combine problems with their progress
    const problems = items.map((item: any) => {
      const problem = item.problems;
      if (!problem) return null;

      const progress = progressMap.get(problem.id);

      return {
        ...problem,
        leetcode_url: `https://leetcode.com/problems/${problem.leetcode_slug}/`,
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
    }).filter(Boolean);

    return NextResponse.json({
      list: problemList,
      problems,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: "Unexpected error fetching problem list progress" },
      { status: 500 }
    );
  }
}

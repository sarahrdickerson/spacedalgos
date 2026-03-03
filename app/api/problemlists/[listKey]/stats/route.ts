import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  context: { params: Promise<{ listKey: string }> }
) {
  try {
    const supabase = await createClient();
    const { listKey } = await context.params;

    // 1) Auth
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) Get the problem list
    const { data: problemList, error: listErr } = await supabase
      .from("problem_lists")
      .select("id")
      .eq("key", listKey)
      .single();

    if (listErr || !problemList) {
      return NextResponse.json(
        { error: "Problem list not found" },
        { status: 404 }
      );
    }

    // 3) Get all problem IDs in the list
    const { data: items, error: itemsErr } = await supabase
      .from("problem_list_items")
      .select("problem_id")
      .eq("list_id", problemList.id);

    if (itemsErr) {
      console.error("Error fetching problem items:", itemsErr);
      return NextResponse.json(
        { error: "Failed to fetch problem items" },
        { status: 500 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json({
        total: 0,
        mastered: 0,
        dueToday: 0,
        inProgress: 0,
        notStarted: 0,
      });
    }

    const problemIds = items.map((item) => item.problem_id);

    // 4) Get progress for these problems
    const { data: progressData, error: progressErr } = await supabase
      .from("user_problem_progress")
      .select("problem_id, stage, next_review_at")
      .eq("user_id", user.id)
      .in("problem_id", problemIds);

    if (progressErr) {
      console.error("Error fetching progress:", progressErr);
      return NextResponse.json(
        { error: "Failed to fetch progress" },
        { status: 500 }
      );
    }

    const now = new Date();

    // Create a map of problem_id -> progress
    const progressMap = new Map(
      progressData?.map((p) => [p.problem_id, p]) || []
    );

    // Calculate statistics
    const total = problemIds.length;
    let mastered = 0;
    let dueToday = 0;
    let inProgress = 0;
    let notStarted = 0;

    problemIds.forEach((problemId) => {
      const progress = progressMap.get(problemId);

      if (!progress) {
        notStarted++;
      } else {
        const stage = progress.stage;
        const nextReview = progress.next_review_at
          ? new Date(progress.next_review_at)
          : null;

        if (stage === 3) {
          mastered++;
        } else if (stage === 1 || stage === 2) {
          inProgress++;
        }

        if (nextReview && nextReview <= now) {
          dueToday++;
        }
      }
    });

    return NextResponse.json({
      total,
      mastered,
      dueToday,
      inProgress,
      notStarted,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: "Unexpected error fetching stats" },
      { status: 500 }
    );
  }
}

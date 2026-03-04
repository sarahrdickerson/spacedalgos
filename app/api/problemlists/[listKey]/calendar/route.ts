import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
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
        problems (
          id,
          key,
          title,
          difficulty,
          category
        )
      `)
      .eq("list_id", list.id);

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
      });
    }

    // Fetch all attempts for these problems
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

    // Fetch progress for upcoming reviews
    const { data: progress, error: progressError } = await supabase
      .from("user_problem_progress")
      .select("problem_id, next_review_at, stage, attempt_count")
      .eq("user_id", user.id)
      .in("problem_id", problemIds)
      .not("next_review_at", "is", null);

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

    // Calculate attempt numbers for each attempt (grouped by problem)
    const attemptsByProblem = new Map<string, any[]>();
    attempts?.forEach((attempt: any) => {
      if (!attemptsByProblem.has(attempt.problem_id)) {
        attemptsByProblem.set(attempt.problem_id, []);
      }
      attemptsByProblem.get(attempt.problem_id)!.push(attempt);
    });

    // Format past attempts with attempt numbers
    const pastAttempts = (attempts || []).map((attempt: any) => {
      const problemAttempts = attemptsByProblem.get(attempt.problem_id) || [];
      const attemptNumber = problemAttempts.length - problemAttempts.indexOf(attempt);
      
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

    // Format upcoming reviews
    const upcomingReviews = (progress || []).map((prog: any) => ({
      problem_id: prog.problem_id,
      problem_key: problemMap.get(prog.problem_id)?.key,
      problem_title: problemMap.get(prog.problem_id)?.title,
      difficulty: problemMap.get(prog.problem_id)?.difficulty,
      category: problemMap.get(prog.problem_id)?.category,
      next_review_at: prog.next_review_at,
      stage: prog.stage,
      attempt_count: prog.attempt_count,
    }));

    return NextResponse.json({
      past_attempts: pastAttempts,
      upcoming_reviews: upcomingReviews,
    });
  } catch (e) {
    console.error("Error in calendar endpoint:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

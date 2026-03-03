import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  props: { params: Promise<{ problemKey: string }> }
) {
  try {
    const params = await props.params;
    let problemKey: string;

    try {
      problemKey = decodeURIComponent(params.problemKey);
    } catch (err) {
      if (err instanceof URIError) {
        return NextResponse.json(
          { error: "Invalid problem key" },
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

    // Fetch the problem to get its ID
    const { data: problem, error: problemError } = await supabase
      .from("problems")
      .select("id, title")
      .eq("key", problemKey)
      .single();

    if (problemError || !problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    // Fetch all attempts for this user+problem
    const { data: attempts, error: attemptsError } = await supabase
      .from("user_problem_attempts")
      .select("id, grade, time_bucket, note, attempted_at")
      .eq("user_id", user.id)
      .eq("problem_id", problem.id)
      .order("attempted_at", { ascending: false });

    if (attemptsError) {
      console.error("Error fetching attempts:", attemptsError);
      return NextResponse.json(
        { error: "Failed to fetch history" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      problem: {
        id: problem.id,
        title: problem.title,
      },
      attempts: attempts || [],
    });
  } catch (e) {
    console.error("Error in history endpoint:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

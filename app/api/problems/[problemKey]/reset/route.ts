import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  request: Request,
  props: { params: Promise<{ problemKey: string }> }
) {
  const params = await props.params;
  const problemKey = decodeURIComponent(params.problemKey);

  try {
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

    // Delete all attempts for this user+problem
    const { error: attemptsError } = await supabase
      .from("user_problem_attempts")
      .delete()
      .eq("user_id", user.id)
      .eq("problem_id", problem.id);

    if (attemptsError) {
      console.error("Error deleting attempts:", attemptsError);
      return NextResponse.json(
        { error: "Failed to delete attempts" },
        { status: 500 }
      );
    }

    // Delete progress for this user+problem
    const { error: progressError } = await supabase
      .from("user_problem_progress")
      .delete()
      .eq("user_id", user.id)
      .eq("problem_id", problem.id);

    if (progressError) {
      console.error("Error deleting progress:", progressError);
      return NextResponse.json(
        { error: "Failed to delete progress" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Progress and history reset for ${problem.title}`,
    });
  } catch (e) {
    console.error("Error in reset endpoint:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

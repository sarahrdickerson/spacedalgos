import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ problemKey: string }> }
) {
  try {
    const params = await props.params;
    let problemKey: string;
    try {
      problemKey = decodeURIComponent(params.problemKey);
    } catch (e) {
      if (e instanceof URIError) {
        return NextResponse.json(
          { error: "Invalid problem key" },
          { status: 400 }
        );
      }
      throw e;
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

    // Atomically reset attempts and progress for this user+problem via Postgres RPC
    const { error: resetError } = await supabase.rpc("reset_user_problem", {
      user_id: user.id,
      problem_id: problem.id,
    });

    if (resetError) {
      console.error("Error resetting problem state:", resetError);
      return NextResponse.json(
        { error: "Failed to reset problem state" },
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

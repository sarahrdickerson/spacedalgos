import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function DELETE() {
  try {
    const supabase = await createClient();

    // 1) Auth — must be logged in
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // 2) Delete all user data in dependency order
    //    (children before parents to avoid FK violations)
    const deletions: Array<{ table: string; error: unknown }> = [];

    for (const table of [
      "user_problem_attempts",
      "user_problem_progress",
      "user_daily_activity",
      "user_study_plans",
      "user_preferences",
      "feedback",
    ]) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("user_id", userId);
      if (error) deletions.push({ table, error });
    }

    if (deletions.length > 0) {
      console.error("Errors deleting user data:", deletions);
      return NextResponse.json(
        { error: "Failed to delete some user data" },
        { status: 500 }
      );
    }

    // 3) Delete the auth user itself — requires service role key
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);

    if (deleteErr) {
      console.error("Error deleting auth user:", deleteErr);
      return NextResponse.json(
        { error: "Failed to delete account" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Unexpected error deleting account:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

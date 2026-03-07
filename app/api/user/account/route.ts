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

    // 2) Build the admin client (bypasses RLS for both data deletions and auth)
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3) Delete the auth user FIRST.
    //
    //    Ordering rationale: deleting the auth record is the irreversible
    //    operation that ends the user's ability to log in. If we deleted
    //    application data first and then the auth deletion failed, the user
    //    would be left with a working login but no data — an unrecoverable
    //    broken state. Deleting auth first means that if the subsequent data
    //    cleanup fails, the orphaned rows are just dead storage (no login
    //    possible) rather than a functional account with missing data.
    //    A background cleanup job or Supabase cascade deletes can handle
    //    any orphaned rows left by a partial failure.
    const { error: deleteAuthErr } = await admin.auth.admin.deleteUser(userId);

    if (deleteAuthErr) {
      console.error("Error deleting auth user:", deleteAuthErr);
      return NextResponse.json(
        { error: "Failed to delete account" },
        { status: 500 }
      );
    }

    // 4) Delete all application data in dependency order.
    //    A failure here leaves orphaned rows but no working login — log it so
    //    it can be cleaned up manually or by a background job.
    const deletions: Array<{ table: string; error: unknown }> = [];

    for (const table of [
      "user_problem_attempts",
      "user_problem_progress",
      "user_daily_activity",
      "user_study_plans",
      "user_preferences",
      "feedback",
    ]) {
      const { error } = await admin
        .from(table)
        .delete()
        .eq("user_id", userId);
      if (error) deletions.push({ table, error });
    }

    if (deletions.length > 0) {
      // Auth user is already gone — log for manual cleanup but don't surface
      // the error to the client since the account is effectively deleted.
      console.error("Orphaned rows after auth deletion:", deletions);
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

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

    // 2) Get user preferences with streak data
    const { data: prefs, error: prefsErr } = await supabase
      .from("user_preferences")
      .select("current_streak, longest_streak, last_activity_date")
      .eq("user_id", user.id)
      .single();

    if (prefsErr && prefsErr.code !== "PGRST116") {
      return NextResponse.json(
        { error: "Failed to fetch streak data" },
        { status: 500 }
      );
    }

    // 3) Get recent activity for calendar/chart
    const { data: activities, error: activitiesErr } = await supabase
      .from("user_daily_activity")
      .select("activity_date, problems_reviewed, problems_due_completed")
      .eq("user_id", user.id)
      .order("activity_date", { ascending: false })
      .limit(30); // Last 30 days

    if (activitiesErr) {
      return NextResponse.json(
        { error: "Failed to fetch activity data" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      current_streak: prefs?.current_streak ?? 0,
      longest_streak: prefs?.longest_streak ?? 0,
      last_activity_date: prefs?.last_activity_date ?? null,
      recent_activity: activities ?? [],
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: "Unexpected error fetching streak data" },
      { status: 500 }
    );
  }
}

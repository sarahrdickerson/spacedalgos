import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
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

    // 4) Check if streak has gone stale
    let currentStreak = prefs?.current_streak ?? 0;
    const lastActivity = prefs?.last_activity_date ?? null;
    if (lastActivity) {
      // Use the client's local date so the boundary is correct after 6 PM CST
      // (when UTC has already flipped to the next day).
      const { searchParams } = new URL(request.url);
      const localDateParam = searchParams.get("localDate");
      if (localDateParam && !/^\d{4}-\d{2}-\d{2}$/.test(localDateParam)) {
        return NextResponse.json(
          { error: "Invalid localDate format, expected YYYY-MM-DD" },
          { status: 400 }
        );
      }
      const yesterdayStr = localDateParam
        ? (() => {
            const [y, m, d] = localDateParam.split("-").map(Number);
            return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().split("T")[0];
          })()
        : new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
      // If the last activity was before yesterday the streak is broken
      if (lastActivity < yesterdayStr) {
        currentStreak = 0;
      }
    }

    return NextResponse.json({
      current_streak: currentStreak,
      longest_streak: prefs?.longest_streak ?? 0,
      last_activity_date: lastActivity,
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

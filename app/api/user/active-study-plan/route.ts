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

    // 2) Get user preferences
    const { data: prefs, error: prefsErr } = await supabase
      .from("user_preferences")
      .select("active_list_id")
      .eq("user_id", user.id)
      .single();

    // If no preferences exist yet, return null active plan
    if (prefsErr && prefsErr.code === "PGRST116") {
      return NextResponse.json({
        active_list: null,
        study_plan: null,
      });
    }

    if (prefsErr) {
      console.error("Error fetching user preferences:", prefsErr);
      return NextResponse.json(
        { error: "Failed to fetch user preferences" },
        { status: 500 }
      );
    }

    // If no active list set
    if (!prefs?.active_list_id) {
      return NextResponse.json({
        active_list: null,
        study_plan: null,
      });
    }

    // 3) Fetch the actual problem list details
    const { data: list, error: listErr } = await supabase
      .from("problem_lists")
      .select("id, key, name, source, version, description")
      .eq("id", prefs.active_list_id)
      .single();

    if (listErr || !list) {
      console.error("Error fetching problem list:", listErr);
      return NextResponse.json({
        active_list: null,
        study_plan: null,
      });
    }

    // 4) Fetch pace settings from user_study_plans
    const { data: studyPlan } = await supabase
      .from("user_study_plans")
      .select("pace, new_per_day, review_per_day, start_date, target_end_date")
      .eq("user_id", user.id)
      .eq("list_id", prefs.active_list_id)
      .eq("is_active", true)
      .maybeSingle();

    return NextResponse.json({
      active_list: list,
      study_plan: studyPlan ?? null,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: "Unexpected error fetching active study plan" },
      { status: 500 }
    );
  }
}
export async function DELETE() {
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

    // 2) Clear active_list_id from user preferences
    const { error: updateErr } = await supabase
      .from("user_preferences")
      .update({
        active_list_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateErr) {
      console.error("Error clearing active study plan:", updateErr);
      return NextResponse.json(
        { error: "Failed to remove active study plan" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Active study plan removed",
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: "Unexpected error removing active study plan" },
      { status: 500 }
    );
  }
}
export async function POST(req: Request) {
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

    // 2) Parse body
    const body = await req.json();
    const { list_id, pace = "normal", new_per_day, review_per_day } = body;

    if (!list_id) {
      return NextResponse.json(
        { error: "list_id is required" },
        { status: 400 }
      );
    }

    const validPaces = ["leisurely", "normal", "accelerated", "custom"];
    if (!validPaces.includes(pace)) {
      return NextResponse.json(
        { error: "pace must be one of: leisurely, normal, accelerated, custom" },
        { status: 400 }
      );
    }

    if (pace === "custom" && (new_per_day == null || review_per_day == null)) {
      return NextResponse.json(
        { error: "new_per_day and review_per_day are required for custom pace" },
        { status: 400 }
      );
    }

    // Resolve counts from preset if not explicitly provided
    const presetValues: Record<string, { new_per_day: number; review_per_day: number }> = {
      leisurely:   { new_per_day: 1, review_per_day: 2 },
      normal:      { new_per_day: 2, review_per_day: 4 },
      accelerated: { new_per_day: 3, review_per_day: 6 },
      custom:      { new_per_day: 2, review_per_day: 4 },
    };
    const resolvedNewPerDay    = new_per_day    ?? presetValues[pace].new_per_day;
    const resolvedReviewPerDay = review_per_day ?? presetValues[pace].review_per_day;

    // 3) Validate that the problem list exists
    const { data: list, error: listErr } = await supabase
      .from("problem_lists")
      .select("id, key, name, source, version")
      .eq("id", list_id)
      .single();

    if (listErr || !list) {
      return NextResponse.json(
        { error: "Problem list not found" },
        { status: 404 }
      );
    }

    // 4) Deactivate all existing plans for this user
    const { error: deactivateErr } = await supabase
      .from("user_study_plans")
      .update({ is_active: false })
      .eq("user_id", user.id);

    if (deactivateErr) {
      console.error("Error deactivating study plans:", deactivateErr);
      return NextResponse.json(
        { error: "Failed to deactivate existing plans" },
        { status: 500 }
      );
    }

    // 5) Upsert the new active study plan
    const { error: planErr } = await supabase
      .from("user_study_plans")
      .upsert(
        {
          user_id: user.id,
          list_id,
          pace,
          new_per_day: resolvedNewPerDay,
          review_per_day: resolvedReviewPerDay,
          start_date: new Date().toISOString().split("T")[0],
          is_active: true,
        },
        { onConflict: "user_id,list_id" }
      );

    if (planErr) {
      console.error("Error upserting study plan:", planErr);
      return NextResponse.json(
        { error: "Failed to save study plan" },
        { status: 500 }
      );
    }

    // 6) Keep user_preferences.active_list_id in sync
    const { error: upsertErr } = await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: user.id,
          active_list_id: list_id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertErr) {
      console.error("Error upserting user preferences:", upsertErr);
      return NextResponse.json(
        { error: "Failed to set active study plan" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      active_list: list,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: "Unexpected error setting active study plan" },
      { status: 500 }
    );
  }
}
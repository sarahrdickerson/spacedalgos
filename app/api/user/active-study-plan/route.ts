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
      });
    }

    // 3) Fetch the actual problem list details
    const { data: list, error: listErr } = await supabase
      .from("problem_lists")
      .select("id, key, name, source, version")
      .eq("id", prefs.active_list_id)
      .single();

    if (listErr || !list) {
      console.error("Error fetching problem list:", listErr);
      return NextResponse.json({
        active_list: null,
      });
    }

    return NextResponse.json({
      active_list: list,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: "Unexpected error fetching active study plan" },
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
    const { list_id } = body;

    if (!list_id) {
      return NextResponse.json(
        { error: "list_id is required" },
        { status: 400 }
      );
    }

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

    // 4) Upsert user preferences (insert or update)
    const { error: upsertErr } = await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: user.id,
          active_list_id: list_id,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
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
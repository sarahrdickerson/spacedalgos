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
        { status: 500 },
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
    const { data: studyPlan, error: studyPlanErr } = await supabase
      .from("user_study_plans")
      .select("pace, new_per_day, review_per_day, start_date, target_end_date")
      .eq("user_id", user.id)
      .eq("list_id", prefs.active_list_id)
      .eq("is_active", true)
      .maybeSingle();

    if (studyPlanErr) {
      console.error("Error fetching study plan:", studyPlanErr);
      return NextResponse.json(
        { error: "Failed to fetch study plan" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      active_list: list,
      study_plan: studyPlan ?? null,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: "Unexpected error fetching active study plan" },
      { status: 500 },
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

    // 2) Read the current active_list_id before clearing it so we can deactivate
    //    the corresponding study plan row.
    const { data: prefs, error: prefsReadErr } = await supabase
      .from("user_preferences")
      .select("active_list_id")
      .eq("user_id", user.id)
      .single();

    if (prefsReadErr && prefsReadErr.code !== "PGRST116") {
      console.error("Error reading user preferences:", prefsReadErr);
      return NextResponse.json(
        { error: "Failed to fetch user preferences" },
        { status: 500 },
      );
    }

    const activeListId = prefs?.active_list_id ?? null;

    // 3) Clear active_list_id from user preferences
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
        { status: 500 },
      );
    }

    // 4) Deactivate the study plan row so list-scoped routes (due/calendar) stop
    //    treating it as active.
    if (activeListId) {
      const { error: deactivateErr } = await supabase
        .from("user_study_plans")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("list_id", activeListId);

      if (deactivateErr) {
        console.error("Error deactivating study plan:", deactivateErr);
        return NextResponse.json(
          { error: "Failed to deactivate active study plan" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Active study plan removed",
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: "Unexpected error removing active study plan" },
      { status: 500 },
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
        { status: 400 },
      );
    }

    const validPaces = ["leisurely", "normal", "accelerated", "custom"];
    if (!validPaces.includes(pace)) {
      return NextResponse.json(
        {
          error: "pace must be one of: leisurely, normal, accelerated, custom",
        },
        { status: 400 },
      );
    }

    if (pace === "custom" && (new_per_day == null || review_per_day == null)) {
      return NextResponse.json(
        {
          error: "new_per_day and review_per_day are required for custom pace",
        },
        { status: 400 },
      );
    }

    // Resolve counts from preset if not explicitly provided
    const presetValues: Record<
      string,
      { new_per_day: number; review_per_day: number }
    > = {
      leisurely: { new_per_day: 1, review_per_day: 2 },
      normal: { new_per_day: 2, review_per_day: 4 },
      accelerated: { new_per_day: 3, review_per_day: 6 },
      custom: { new_per_day: 2, review_per_day: 4 },
    };
    const resolvedNewPerDay = new_per_day ?? presetValues[pace].new_per_day;
    const resolvedReviewPerDay =
      review_per_day ?? presetValues[pace].review_per_day;

    // Validate resolved counts: must be finite positive integers
    const isValidCount = (v: unknown): v is number =>
      typeof v === "number" &&
      Number.isFinite(v) &&
      Number.isInteger(v) &&
      v >= 1;

    if (!isValidCount(resolvedNewPerDay)) {
      return NextResponse.json(
        { error: "new_per_day must be a positive integer" },
        { status: 400 },
      );
    }
    if (!isValidCount(resolvedReviewPerDay)) {
      return NextResponse.json(
        { error: "review_per_day must be a positive integer" },
        { status: 400 },
      );
    }

    const localDate: string | null =
      typeof body.localDate === "string" ? body.localDate : null;
    if (localDate != null && !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
      return NextResponse.json(
        { error: "localDate must be YYYY-MM-DD" },
        { status: 400 },
      );
    }

    const tzOffset: number | null =
      body.tzOffset != null && Number.isFinite(body.tzOffset)
        ? Math.round(body.tzOffset)
        : null;

    // 3) Validate that the problem list exists
    const { data: list, error: listErr } = await supabase
      .from("problem_lists")
      .select("id, key, name, source, version")
      .eq("id", list_id)
      .single();

    if (listErr || !list) {
      return NextResponse.json(
        { error: "Problem list not found" },
        { status: 404 },
      );
    }

    // 4) Read the current plan so we can detect a review_per_day change.
    const { data: existingPlan, error: existingPlanErr } = await supabase
      .from("user_study_plans")
      .select("review_per_day")
      .eq("user_id", user.id)
      .eq("list_id", list_id)
      .maybeSingle();

    if (existingPlanErr) {
      console.error("Failed to fetch existing study plan", existingPlanErr);
      return NextResponse.json(
        { error: "Failed to fetch existing study plan" },
        { status: 500 },
      );
    }

    const previousReviewPerDay: number | null =
      existingPlan?.review_per_day ?? null;

    // 5) Upsert the new active study plan first, so the user always has an
    //    active plan even if the deactivation step below fails.
    const { error: planErr } = await supabase.from("user_study_plans").upsert(
      {
        user_id: user.id,
        list_id,
        pace,
        new_per_day: resolvedNewPerDay,
        review_per_day: resolvedReviewPerDay,
        start_date: new Date().toISOString().split("T")[0],
        is_active: true,
      },
      { onConflict: "user_id,list_id" },
    );

    if (planErr) {
      console.error("Error upserting study plan:", planErr);
      return NextResponse.json(
        { error: "Failed to save study plan" },
        { status: 500 },
      );
    }

    // 6) Deactivate all other plans for this user (excluding the one we just upserted).
    //    Done after the upsert so a failure here leaves the user with a valid active plan
    //    rather than no active plan.
    const { error: deactivateErr } = await supabase
      .from("user_study_plans")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .neq("list_id", list_id);

    if (deactivateErr) {
      // Non-fatal: the new plan is already active. Log and continue.
      console.error("Error deactivating old study plans:", deactivateErr);
    }

    // 7) Keep user_preferences.active_list_id in sync
    const { error: upsertErr } = await supabase.from("user_preferences").upsert(
      {
        user_id: user.id,
        active_list_id: list_id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (upsertErr) {
      console.error("Error upserting user preferences:", upsertErr);
      return NextResponse.json(
        { error: "Failed to set active study plan" },
        { status: 500 },
      );
    }

    // 8) Backfill scheduled reviews if review_per_day changed on an existing plan.
    //    Uses last_attempt_at + interval_days as the ideal base date so the
    //    redistribution is reversible regardless of prior pace changes.
    if (
      previousReviewPerDay !== null &&
      previousReviewPerDay !== resolvedReviewPerDay
    ) {
      await backfillReviewSchedule(
        supabase,
        user.id,
        list_id,
        resolvedReviewPerDay,
        localDate,
        tzOffset,
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
      { status: 500 },
    );
  }
}

// Redistribute all future scheduled reviews for a list to fit a new review_per_day cap.
// Uses last_attempt_at + interval_days as the "ideal" date (pure algorithm output)
// rather than the current next_review_at, making this fully reversible — changing pace
// multiple times always produces the same result as if you'd had that pace from the start.
//
// Uses local day boundaries (via tzOffset) so slot counts match what the user sees in
// the calendar, not UTC midnight boundaries.
async function backfillReviewSchedule(
  supabase: any,
  userId: string,
  listId: string,
  newReviewPerDay: number,
  localDate: string | null,
  tzOffset: number | null,
) {
  // 1) Get all problem IDs in this list
  const { data: listItems } = await supabase
    .from("problem_list_items")
    .select("problem_id")
    .eq("list_id", listId);

  const problemIds = (listItems ?? []).map(
    (item: any) => item.problem_id as string,
  );
  if (problemIds.length === 0) return;

  // 2) Fetch all future progress rows (overdue reviews are left untouched)
  const nowIso = new Date().toISOString();
  const { data: progressRows, error: progressErr } = await supabase
    .from("user_problem_progress")
    .select("problem_id, next_review_at, last_attempt_at, interval_days")
    .eq("user_id", userId)
    .in("problem_id", problemIds)
    .not("next_review_at", "is", null)
    .gt("next_review_at", nowIso);

  if (progressErr) {
    console.error("Error fetching progress for backfill:", progressErr);
    return;
  }
  if (!progressRows || progressRows.length === 0) return;

  // Convert a UTC timestamp (ms) to a local YYYY-MM-DD string using tzOffset.
  // tzOffset = getTimezoneOffset() = minutes west of UTC (positive for US).
  // local time = UTC - tzOffset minutes, so shift ms back by tzOffset.
  const toLocalDateStr = (utcMs: number): string => {
    const shifted = tzOffset != null ? utcMs - tzOffset * 60 * 1000 : utcMs;
    return new Date(shifted).toISOString().slice(0, 10);
  };

  // Get the UTC start/end ms for a local YYYY-MM-DD.
  const localDayBounds = (ds: string): { startMs: number; endMs: number } => {
    const [y, m, d] = ds.split("-").map(Number);
    const startMs =
      tzOffset != null
        ? Date.UTC(y, m - 1, d) + tzOffset * 60 * 1000
        : Date.UTC(y, m - 1, d);
    return { startMs, endMs: startMs + 24 * 60 * 60 * 1000 };
  };

  // Advance a local date string by one calendar day.
  const nextLocalDate = (ds: string): string => {
    const [y, m, d] = ds.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  };

  const todayStr = localDate ?? toLocalDateStr(Date.now());

  // 3) Compute ideal LOCAL date for each row: last_attempt_at + interval_days.
  //    Clamp to today if the ideal date is already in the past.
  const items = progressRows.map((row: any) => {
    const ideal = new Date(row.last_attempt_at);
    ideal.setUTCDate(ideal.getUTCDate() + (row.interval_days ?? 1));
    const idealLocalStr = toLocalDateStr(ideal.getTime());
    return {
      problem_id: row.problem_id as string,
      baseDate: idealLocalStr < todayStr ? todayStr : idealLocalStr,
      sortKey: ideal.getTime(),
    };
  });

  // 4) Sort by ideal date so earlier reviews claim slots first
  items.sort(
    (a: { sortKey: number }, b: { sortKey: number }) => a.sortKey - b.sortKey,
  );

  // 5) Cascade forward with the new cap, counting by LOCAL date.
  //    Set next_review_at to the local day's UTC start so the review always
  //    falls unambiguously within the correct local calendar day.
  const slotsByDate = new Map<string, number>();
  const updates: { problem_id: string; next_review_at: string }[] = [];

  for (const item of items) {
    let dateStr = item.baseDate;
    for (let i = 0; i < 365; i++) {
      const count = slotsByDate.get(dateStr) ?? 0;
      if (count < newReviewPerDay) {
        slotsByDate.set(dateStr, count + 1);
        const { startMs } = localDayBounds(dateStr);
        updates.push({
          problem_id: item.problem_id,
          next_review_at: new Date(startMs).toISOString(),
        });
        break;
      }
      dateStr = nextLocalDate(dateStr);
    }
  }

  // 6) Apply all updates in a single upsert (one round-trip).
  //    onConflict generates: ON CONFLICT (user_id, problem_id) DO UPDATE SET next_review_at = EXCLUDED.next_review_at
  //    so only next_review_at is touched; all other columns are left intact.
  if (updates.length === 0) return;

  const { error: upsertErr } = await supabase
    .from("user_problem_progress")
    .upsert(
      updates.map((u) => ({
        user_id: userId,
        problem_id: u.problem_id,
        next_review_at: u.next_review_at,
      })),
      { onConflict: "user_id,problem_id" },
    );

  if (upsertErr) {
    console.error("Error backfilling review schedule:", upsertErr);
  }
}

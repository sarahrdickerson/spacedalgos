import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeNextProgress } from "@/lib/sr/algorithm";
import { cascadeNextReviewDate } from "@/lib/sr/cascade";

// Grade meaning:
// 0 = again/fail, 1 = good, 2 = easy
type Grade = 0 | 1 | 2;

type Body = {
  grade: Grade;
  time_bucket?: string | null;
  note?: string | null;
  attempted_at?: string | null; // ISO string optional
  localDate?: string | null; // YYYY-MM-DD in client's local timezone
  tzOffset?: number | null; // minutes from getTimezoneOffset() — positive = west of UTC
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ problemKey: string }> },
) {
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

    const { problemKey: problemKeyRaw } = await params;
    let problemKey: string;
    try {
      problemKey = decodeURIComponent(problemKeyRaw);
    } catch (err) {
      if (err instanceof URIError) {
        return NextResponse.json(
          { error: "Invalid problem key" },
          { status: 400 },
        );
      }
      throw err;
    }

    // 2) Parse body
    const body = (await req.json()) as Body;

    if (body.grade === undefined || body.grade === null) {
      return NextResponse.json({ error: "grade is required" }, { status: 400 });
    }
    if (![0, 1, 2].includes(body.grade)) {
      return NextResponse.json(
        { error: "grade must be 0 (again), 1 (good), or 2 (easy)" },
        { status: 400 },
      );
    }

    const now = body.attempted_at ? new Date(body.attempted_at) : new Date();
    if (Number.isNaN(now.getTime())) {
      return NextResponse.json(
        { error: "attempted_at must be ISO date string" },
        { status: 400 },
      );
    }

    if (body.localDate != null && !/^\d{4}-\d{2}-\d{2}$/.test(body.localDate)) {
      return NextResponse.json(
        { error: "localDate must be YYYY-MM-DD" },
        { status: 400 },
      );
    }

    const MIN_TZ_OFFSET_MINUTES = -720;
    const MAX_TZ_OFFSET_MINUTES = 840;

    const roundedTzOffset =
      body.tzOffset != null && Number.isFinite(body.tzOffset)
        ? Math.round(body.tzOffset)
        : null;

    if (
      roundedTzOffset != null &&
      (roundedTzOffset < MIN_TZ_OFFSET_MINUTES ||
        roundedTzOffset > MAX_TZ_OFFSET_MINUTES)
    ) {
      return NextResponse.json(
        {
          error: `tzOffset must be between ${MIN_TZ_OFFSET_MINUTES} and ${MAX_TZ_OFFSET_MINUTES} minutes`,
        },
        { status: 400 },
      );
    }

    const tzOffset: number | null = roundedTzOffset;

    // 3) Resolve problem id by key
    const { data: problemRow, error: problemErr } = await supabase
      .from("problems")
      .select("id, key")
      .eq("key", problemKey)
      .single();

    if (problemErr || !problemRow) {
      return NextResponse.json(
        { error: `Problem not found: ${problemKey}` },
        { status: 404 },
      );
    }

    const problemId = problemRow.id;

    // 4) Read existing progress (if any) BEFORE inserting attempt
    const { data: existingProgress, error: progressReadErr } = await supabase
      .from("user_problem_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("problem_id", problemId)
      .maybeSingle();

    if (progressReadErr) {
      return NextResponse.json(
        { error: progressReadErr.message },
        { status: 500 },
      );
    }

    // Record the stage BEFORE this attempt (for history tracking)
    const stageBeforeAttempt = existingProgress?.stage ?? 0;

    // 5) Insert attempt row with the stage before this attempt
    const { data: attempt, error: attemptErr } = await supabase
      .from("user_problem_attempts")
      .insert({
        user_id: user.id,
        problem_id: problemId,
        attempted_at: now.toISOString(),
        grade: body.grade,
        time_bucket: body.time_bucket ?? null,
        note: body.note ?? null,
        stage: stageBeforeAttempt,
      })
      .select("*")
      .single();

    if (attemptErr) {
      return NextResponse.json({ error: attemptErr.message }, { status: 500 });
    }

    // 6) Compute next progress based on existing progress

    const next = computeNextProgress({
      prevStage: existingProgress?.stage ?? null,
      prevIntervalDays: existingProgress?.interval_days ?? null,
      prevAttemptCount: existingProgress?.attempt_count ?? null,
      prevSuccessCount: existingProgress?.success_count ?? null,
      prevFailCount: existingProgress?.fail_count ?? null,
      grade: body.grade,
      now,
    });

    // If they succeeded, keep/update last_success_at; if they failed, preserve old last_success_at
    const last_success_at =
      next.last_success_at ?? existingProgress?.last_success_at ?? null;

    // Determine if problem was due BEFORE updating progress
    const wasDue =
      existingProgress?.next_review_at &&
      new Date(existingProgress.next_review_at) <= now;

    // 6b) Cascade next_review_at to the first date with capacity under review_per_day.
    // interval_days stays as computed (reflects actual algorithm output); only the
    // scheduled date shifts to avoid overloading a single day.
    await cascadeNextReviewDate(supabase, user.id, problemId, next, tzOffset);

    // 7) Upsert progress
    const { data: progress, error: progressUpsertErr } = await supabase
      .from("user_problem_progress")
      .upsert(
        {
          user_id: user.id,
          problem_id: problemId,
          stage: next.stage,
          last_attempt_at: next.last_attempt_at,
          last_success_at,
          next_review_at: next.next_review_at,
          attempt_count: next.attempt_count,
          success_count: next.success_count,
          fail_count: next.fail_count,
          interval_days: next.interval_days,
        },
        { onConflict: "user_id,problem_id" },
      )
      .select("*")
      .single();

    if (progressUpsertErr) {
      return NextResponse.json(
        { error: progressUpsertErr.message },
        { status: 500 },
      );
    }

    // 8) Update daily activity and streak
    await updateDailyActivityAndStreak(
      supabase,
      user.id,
      now,
      wasDue,
      body.localDate ?? null,
    );

    return NextResponse.json({
      attempt,
      progress,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: "Unexpected error logging attempt" },
      { status: 500 },
    );
  }
}

// Update daily activity table and calculate streak
async function updateDailyActivityAndStreak(
  supabase: any,
  userId: string,
  attemptDate: Date,
  wasDue: boolean,
  localDate?: string | null,
) {
  // Use the client's local date if provided so activity is recorded on the correct
  // calendar day even after 6 PM CST when UTC has already flipped to the next day.
  const activityDate = localDate ?? attemptDate.toISOString().split("T")[0]; // YYYY-MM-DD

  // Check if a row already exists for today
  const { data: existingActivity } = await supabase
    .from("user_daily_activity")
    .select("problems_reviewed, problems_due_completed")
    .eq("user_id", userId)
    .eq("activity_date", activityDate)
    .maybeSingle();

  const { error: activityErr } = await supabase
    .from("user_daily_activity")
    .upsert(
      {
        user_id: userId,
        activity_date: activityDate,
        problems_reviewed: (existingActivity?.problems_reviewed ?? 0) + 1,
        problems_due_completed:
          (existingActivity?.problems_due_completed ?? 0) + (wasDue ? 1 : 0),
      },
      { onConflict: "user_id,activity_date" },
    );

  if (activityErr) {
    console.error("Error updating daily activity:", activityErr);
    return;
  }

  // Calculate streak
  const { data: activities } = await supabase
    .from("user_daily_activity")
    .select("activity_date")
    .eq("user_id", userId)
    .order("activity_date", { ascending: false })
    .limit(365); // Check last year

  if (!activities || activities.length === 0) {
    return;
  }

  // Calculate current streak
  let currentStreak = 0;
  const yesterday = localDate
    ? (() => {
        const [y, m, d] = localDate.split("-").map(Number);
        return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().split("T")[0];
      })()
    : new Date(Date.now() - 86400000).toISOString().split("T")[0];

  // Start from today or yesterday
  let expectedDate =
    activities[0].activity_date >= yesterday
      ? activities[0].activity_date
      : null;

  if (!expectedDate) {
    currentStreak = 0;
  } else {
    for (const activity of activities) {
      if (activity.activity_date === expectedDate) {
        currentStreak++;
        // Move to previous day
        const prevDate = new Date(expectedDate);
        prevDate.setDate(prevDate.getDate() - 1);
        expectedDate = prevDate.toISOString().split("T")[0];
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 1;

  for (let i = 0; i < activities.length - 1; i++) {
    const currentDate = new Date(activities[i].activity_date);
    const nextDate = new Date(activities[i + 1].activity_date);
    const diffDays = Math.floor(
      (currentDate.getTime() - nextDate.getTime()) / 86400000,
    );

    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // Update user preferences
  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("longest_streak")
    .eq("user_id", userId)
    .single();

  const newLongestStreak = Math.max(
    longestStreak,
    currentStreak,
    prefs?.longest_streak ?? 0,
  );

  await supabase.from("user_preferences").upsert(
    {
      user_id: userId,
      current_streak: currentStreak,
      longest_streak: newLongestStreak,
      last_activity_date: activityDate,
    },
    { onConflict: "user_id" },
  );
}

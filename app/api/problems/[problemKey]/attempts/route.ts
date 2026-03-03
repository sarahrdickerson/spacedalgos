import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Grade meaning:
// 0 = again/fail, 1 = good, 2 = easy
type Grade = 0 | 1 | 2;

type Body = {
  grade: Grade;
  time_bucket?: string | null;
  note?: string | null;
  attempted_at?: string | null; // ISO string optional
};

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// Very simple spaced-rep logic (tweak later)
function computeNextProgress(params: {
  prevStage: number | null;
  prevIntervalDays: number | null;
  prevAttemptCount: number | null;
  prevSuccessCount: number | null;
  prevFailCount: number | null;
  grade: Grade;
  now: Date;
}) {
  const {
    prevStage,
    prevIntervalDays,
    prevAttemptCount,
    prevSuccessCount,
    prevFailCount,
    grade,
    now,
  } = params;

  const attempt_count = (prevAttemptCount ?? 0) + 1;

  const isSuccess = grade >= 1;
  const success_count = (prevSuccessCount ?? 0) + (isSuccess ? 1 : 0);
  const fail_count = (prevFailCount ?? 0) + (!isSuccess ? 1 : 0);

  // Stage rules:
  // - First attempt (any grade) puts you in stage 1
  // - Repeated successes promote to 2 then 3
  // - Fail drops you down (but not below 1 once started)
  let stage = prevStage ?? 0;

  if (grade === 0) {
    // again/fail: drop a stage, minimum 1 if they've started
    if (stage >= 2) stage -= 1;
    else if (stage === 1) stage = 1;
    else stage = 1; // if first attempt is fail, we still consider them started
  } else if (grade === 1) {
    // good: promote up to 3
    stage = Math.min(3, Math.max(1, stage || 1) + (stage >= 1 ? 1 : 0));
    // if stage was 0, becomes 1; if 1->2; if 2->3
    if (prevStage === null || prevStage === 0) stage = 1;
  } else if (grade === 2) {
    // easy: promote faster
    if (!stage) stage = 1;
    else stage = Math.min(3, stage + 1);
  }

  // Interval rules:
  // stage 1: short intervals
  // stage 2: medium
  // stage 3: longer with enhanced growth
  // grade influences multiplier a bit
  const baseByStage = stage === 1 ? 2 : stage === 2 ? 5 : 21; // days
  const mult = grade === 2 ? 1.5 : grade === 1 ? 1.0 : 0.3; // easy, good, or again

  // If we have a previous interval, grow it (for successes), shrink it (for fails)
  let interval_days: number;
  if (prevIntervalDays && prevIntervalDays > 0) {
    if (grade >= 1) {
      // Success: grow the interval
      // Stage 3 bonus (2.0x) applies when already at stage 3
      // First time reaching stage 3: use minimum of calculated or base (21 days)
      if (prevStage === 3) {
        interval_days = Math.ceil(prevIntervalDays * 2.0 * 1.4 * mult);
      } else if (stage === 3 && prevStage !== 3) {
        // Just reached mastered from stage 2: ensure minimum 21 day interval
        const calculated = Math.ceil(prevIntervalDays * 1.5 * mult);
        interval_days = Math.max(calculated, baseByStage);
      } else {
        interval_days = Math.ceil(prevIntervalDays * 1.3 * mult);
      }
    } else {
      // Failure: shrink the interval
      interval_days = Math.max(1, Math.floor(prevIntervalDays * mult));
    }
  } else {
    interval_days = Math.max(1, Math.round(baseByStage * mult));
  }

  const next_review_at = addDays(now, interval_days).toISOString();

  return {
    stage,
    interval_days,
    next_review_at,
    attempt_count,
    success_count,
    fail_count,
    last_attempt_at: now.toISOString(),
    last_success_at: isSuccess ? now.toISOString() : null,
  };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ problemKey: string }> }
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
          { status: 400 }
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
        { status: 400 }
      );
    }

    const now = body.attempted_at ? new Date(body.attempted_at) : new Date();
    if (Number.isNaN(now.getTime())) {
      return NextResponse.json(
        { error: "attempted_at must be ISO date string" },
        { status: 400 }
      );
    }

    // 3) Resolve problem id by key
    const { data: problemRow, error: problemErr } = await supabase
      .from("problems")
      .select("id, key")
      .eq("key", problemKey)
      .single();

    if (problemErr || !problemRow) {
      return NextResponse.json(
        { error: `Problem not found: ${problemKey}` },
        { status: 404 }
      );
    }

    const problemId = problemRow.id;

    // 4) Insert attempt row
    const { data: attempt, error: attemptErr } = await supabase
      .from("user_problem_attempts")
      .insert({
        user_id: user.id,
        problem_id: problemId,
        attempted_at: now.toISOString(),
        grade: body.grade,
        time_bucket: body.time_bucket ?? null,
        note: body.note ?? null,
      })
      .select("*")
      .single();

    if (attemptErr) {
      return NextResponse.json({ error: attemptErr.message }, { status: 500 });
    }

    // 5) Read existing progress (if any)
    const { data: existingProgress, error: progressReadErr } = await supabase
      .from("user_problem_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("problem_id", problemId)
      .maybeSingle();

    if (progressReadErr) {
      return NextResponse.json(
        { error: progressReadErr.message },
        { status: 500 }
      );
    }

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

    // 6) Upsert progress
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
        { onConflict: "user_id,problem_id" }
      )
      .select("*")
      .single();

    if (progressUpsertErr) {
      return NextResponse.json(
        { error: progressUpsertErr.message },
        { status: 500 }
      );
    }

    // 7) Update daily activity and streak
    await updateDailyActivityAndStreak(supabase, user.id, now, wasDue);

    return NextResponse.json({
      attempt,
      progress,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: "Unexpected error logging attempt" },
      { status: 500 }
    );
  }
}

// Update daily activity table and calculate streak
async function updateDailyActivityAndStreak(
  supabase: any,
  userId: string,
  attemptDate: Date,
  wasDue: boolean
) {
  const activityDate = attemptDate.toISOString().split("T")[0]; // YYYY-MM-DD

  // Upsert daily activity
  const { error: activityErr } = await supabase.rpc("upsert_daily_activity", {
    p_user_id: userId,
    p_activity_date: activityDate,
    p_was_due: wasDue,
  });

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
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  // Start from today or yesterday
  let expectedDate = activities[0].activity_date >= yesterday ? activities[0].activity_date : null;
  
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
      (currentDate.getTime() - nextDate.getTime()) / 86400000
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
    prefs?.longest_streak ?? 0
  );

  await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        current_streak: currentStreak,
        longest_streak: newLongestStreak,
        last_activity_date: activityDate,
      },
      { onConflict: "user_id" }
    );
}

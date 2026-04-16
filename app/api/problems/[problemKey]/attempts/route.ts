import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  utcToLocalDateStr,
  localDayBoundsUTC,
  nextLocalDateStr,
} from "@/lib/api/localDateUtils";

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

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// Interval caps — prevent runaway growth
const MAX_INTERVAL_GOOD = 30; // Grade 1: caps at monthly maintenance
const MAX_INTERVAL_EASY = 90; // Grade 2: caps at quarterly maintenance

// Spaced repetition logic
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

  // Stage drives the UI label (Learning / Reinforcing / Mastered) — not intervals.
  // Grade 0 drops one stage (min 1).
  // Grade 1 (Good): from stage 1 → 2, from 2 → 2 (stay), from 3 → 2 (demote; Good cannot stay Mastered).
  // Grade 2 (Easy): from stage 1 → 2, from 2 → 3, from 3 → 3 (Mastered).
  // First attempt (prevStage null/0) always lands at stage 1 regardless of grade.
  let stage = prevStage ?? 0;
  if (grade === 0) {
    stage = Math.max(1, stage - 1);
  } else if (grade === 1) {
    stage = Math.min(2, Math.max(1, stage + 1));
  } else {
    stage = Math.min(3, Math.max(1, stage + 1));
  }

  // Interval calculation — uses fixed intervals for the first two attempts,
  // then grows from the previous interval and grade from the third attempt onward.
  //   First attempt        → 1 day (Easy → 3 days)
  //   Second attempt       → Good: 3 days, Easy: 7 days, Again: 1 day
  //   Grade 0 (fail)       → ×0.25, min 1 day   (same/next-day repair)
  //   Grade 1 (good)       → ×2.0,  cap 30 days  (monthly maintenance once stable)
  //   Grade 2 (easy)       → ×2.3,  cap 90 days  (quarterly maintenance once stable)
  //
  // Approximate sequences produced:
  //   Easy:  3 → 7 → 17 → 40 → 90 (cap) → 90 → …
  //   Good:  1 → 3 → 6  → 12 → 24 → 30 (cap) → 30 → …
  //   Fail:  current × 0.25 → min 1 day (next-day repair for short intervals)
  let interval_days: number;
  if (!prevIntervalDays || prevIntervalDays <= 0) {
    // First attempt: Easy gets a head start (3 days), Good/Again review next day
    interval_days = grade === 2 ? 3 : 1;
  } else if (prevAttemptCount === 1) {
    // Second attempt: 7 days for Easy, 3 days for Good, 1 day for Again
    interval_days = grade === 0 ? 1 : grade === 2 ? 7 : 3;
  } else if (grade === 0) {
    // Fail: drop to 25% of previous interval, min 1 day (same/next-day repair)
    interval_days = Math.max(1, Math.floor(prevIntervalDays * 0.25));
  } else if (grade === 1) {
    // Good: double the previous interval, capped at MAX_INTERVAL_GOOD to prevent runaway growth
    // If mastered, a good review demotes to reinforcing but still gets the easier monthly maintenance interval instead of quarterly
    interval_days = Math.min(
      MAX_INTERVAL_GOOD,
      Math.ceil(prevIntervalDays * 2.0),
    );
  } else {
    // Easy: multiply previous interval by 2.3, capped at MAX_INTERVAL_EASY to prevent runaway growth
    // grade === 2
    interval_days = Math.min(
      MAX_INTERVAL_EASY,
      Math.ceil(prevIntervalDays * 2.3),
    );
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

// Shift next_review_at forward until it lands on a day with remaining capacity.
// interval_days is left unchanged — it reflects the algorithm's output, not the
// scheduling offset. Only next_review_at on the `next` object is mutated.
//
// Uses the client's local day boundaries (via tzOffset) so the cap is enforced
// against the same day the user sees in the calendar, not UTC midnight boundaries.
async function cascadeNextReviewDate(
  supabase: any,
  userId: string,
  problemId: string,
  next: { next_review_at: string; interval_days: number },
  tzOffset: number | null,
) {
  // Find which list this problem belongs to and get its study plan cap.
  const { data: listItem, error: listItemError } = await supabase
    .from("problem_list_items")
    .select("list_id")
    .eq("problem_id", problemId)
    .limit(1)
    .maybeSingle();

  if (listItemError) {
    console.error("Failed to look up problem list membership for review cap enforcement", {
      userId,
      problemId,
      error: listItemError,
    });
    return;
  }

  if (!listItem) return; // Problem not in any list — no cap to enforce

  const { data: planData, error: planDataError } = await supabase
    .from("user_study_plans")
    .select("review_per_day")
    .eq("user_id", userId)
    .eq("list_id", listItem.list_id)
    .eq("is_active", true)
    .maybeSingle();

  if (planDataError) {
    console.error("Failed to look up study plan for review cap enforcement", {
      userId,
      problemId,
      listId: listItem.list_id,
      error: planDataError,
    });
    return;
  }

  const reviewPerDay: number = planData?.review_per_day ?? 0;
  if (reviewPerDay <= 0) return; // No cap configured

  // Fetch all problem IDs in this list except the current one (its old slot is being freed).
  const { data: allListItems, error: allListItemsError } = await supabase
    .from("problem_list_items")
    .select("problem_id")
    .eq("list_id", listItem.list_id);

  if (allListItemsError) {
    console.error("Failed to look up list problems for review cap enforcement", {
      userId,
      problemId,
      listId: listItem.list_id,
      error: allListItemsError,
    });
    return;
  }

  const listProblemIds: string[] = (allListItems ?? [])
    .map((item: any) => item.problem_id as string)
    .filter((id: string) => id !== problemId);

  if (listProblemIds.length === 0) return;

  // Walk forward from the computed local date until we find a day with capacity.
  // Safety limit: never push more than 7 days out.
  //
  // Uses local day boundaries derived from tzOffset so the cap matches what the
  // user sees in the calendar. Without this, a review at 10 PM CST (= next UTC day
  // 04:00Z) would be counted on a different UTC date than the calendar shows it,
  // allowing the daily cap to be silently exceeded in the local view.
  //
  // If tzOffset is unavailable, falls back to UTC midnight boundaries.

  let dateStr = utcToLocalDateStr(next.next_review_at, tzOffset);

  const originalDate = dateStr;
  const { startMs: windowStartMs } = localDayBoundsUTC(originalDate, tzOffset);
  let windowEndDate = originalDate;
  for (let i = 0; i < 6; i++) {
    windowEndDate = nextLocalDateStr(windowEndDate);
  }
  const { endMs: windowEndMs } = localDayBoundsUTC(windowEndDate, tzOffset);

  const {
    data: scheduledReviews,
    error: scheduledReviewsError,
  } = await supabase
    .from("user_problem_progress")
    .select("next_review_at")
    .eq("user_id", userId)
    .in("problem_id", listProblemIds)
    .gte("next_review_at", new Date(windowStartMs).toISOString())
    .lt("next_review_at", new Date(windowEndMs).toISOString());

  if (scheduledReviewsError) {
    console.error("Failed to fetch scheduled reviews for daily cap check", {
      userId,
      problemKey,
      windowStart: new Date(windowStartMs).toISOString(),
      windowEnd: new Date(windowEndMs).toISOString(),
      error: scheduledReviewsError,
    });
    throw scheduledReviewsError;
  }

  const reviewCountsByLocalDate = new Map<string, number>();
  for (const row of scheduledReviews ?? []) {
    if (!row?.next_review_at) continue;
    const localReviewDate = utcToLocalDateStr(row.next_review_at, tzOffset);
    reviewCountsByLocalDate.set(
      localReviewDate,
      (reviewCountsByLocalDate.get(localReviewDate) ?? 0) + 1,
    );
  }

  for (let i = 0; i < 7; i++) {
    const { startMs } = localDayBoundsUTC(dateStr, tzOffset);
    const count = reviewCountsByLocalDate.get(dateStr) ?? 0;

    if (count < reviewPerDay) {
      if (dateStr !== originalDate) {
        // Bumped to a new local date — place at the start of that local day (UTC).
        next.next_review_at = new Date(startMs).toISOString();
      }
      // If no bump, keep addDays output as-is (preserves timezone-safe time-of-day).
      return;
    }

    dateStr = nextLocalDateStr(dateStr);
  }
  // If no slot found within 7 days, keep original date (better than pushing indefinitely).
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

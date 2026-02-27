import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Grade meaning (you can change):
// 0 = fail, 1 = hard, 2 = ok, 3 = easy
type Grade = 0 | 1 | 2 | 3;

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

  const isSuccess = grade >= 2;
  const success_count = (prevSuccessCount ?? 0) + (isSuccess ? 1 : 0);
  const fail_count = (prevFailCount ?? 0) + (!isSuccess ? 1 : 0);

  // Stage rules:
  // - First success puts you in stage 1
  // - Repeated successes promote to 2 then 3
  // - Fail drops you down (but not below 1 if started)
  let stage = prevStage ?? 0;

  if (grade === 0) {
    // fail: drop a stage, minimum 1 if they've started
    if (stage >= 2) stage -= 1;
    else if (stage === 1) stage = 1;
    else stage = 1; // if first attempt is fail, we still consider them started
  } else if (grade === 1) {
    // hard: keep stage (or start at 1)
    stage = Math.max(1, stage || 1);
  } else if (grade === 2) {
    // ok: promote up to 3
    stage = Math.min(3, Math.max(1, stage || 1) + (stage >= 1 ? 1 : 0));
    // if stage was 0, becomes 1; if 1->2; if 2->3
    if (prevStage === null || prevStage === 0) stage = 1;
  } else if (grade === 3) {
    // easy: promote faster
    if (!stage) stage = 1;
    else stage = Math.min(3, stage + 1);
  }

  // Interval rules:
  // stage 1: short intervals
  // stage 2: medium
  // stage 3: longer
  // grade influences multiplier a bit
  const baseByStage = stage === 1 ? 2 : stage === 2 ? 5 : 12; // days
  const mult = grade === 3 ? 1.4 : grade === 2 ? 1.0 : grade === 1 ? 0.6 : 0.3;

  // If we have a previous interval, grow it (for successes), shrink it (for fails)
  let interval_days: number;
  if (prevIntervalDays && prevIntervalDays > 0) {
    if (grade >= 2)
      interval_days = Math.ceil(
        prevIntervalDays * (stage === 3 ? 1.6 : 1.3) * mult
      );
    else interval_days = Math.max(1, Math.floor(prevIntervalDays * mult));
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
  { params }: { params: { problemKey: string } }
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

    const problemKey = decodeURIComponent(params.problemKey);

    // 2) Parse body
    const body = (await req.json()) as Body;

    if (body.grade === undefined || body.grade === null) {
      return NextResponse.json({ error: "grade is required" }, { status: 400 });
    }
    if (![0, 1, 2, 3].includes(body.grade)) {
      return NextResponse.json(
        { error: "grade must be 0,1,2,3" },
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

import {
  utcToLocalDateStr,
  localDayBoundsUTC,
  nextLocalDateStr,
} from "@/lib/api/localDateUtils";

export async function cascadeNextReviewDate(
  supabase: any,
  userId: string,
  problemId: string,
  next: { next_review_at: string; interval_days: number },
  tzOffset: number | null,
): Promise<void> {
  const { data: listItem, error: listItemError } = await supabase
    .from("problem_list_items")
    .select("list_id")
    .eq("problem_id", problemId)
    .limit(1)
    .maybeSingle();

  if (listItemError) {
    console.error("Failed to look up problem list membership for review cap enforcement", {
      userId, problemId, error: listItemError,
    });
    return;
  }

  if (!listItem) return;

  const { data: planData, error: planDataError } = await supabase
    .from("user_study_plans")
    .select("review_per_day")
    .eq("user_id", userId)
    .eq("list_id", listItem.list_id)
    .eq("is_active", true)
    .maybeSingle();

  if (planDataError) {
    console.error("Failed to look up study plan for review cap enforcement", {
      userId, problemId, listId: listItem.list_id, error: planDataError,
    });
    return;
  }

  const reviewPerDay: number = planData?.review_per_day ?? 0;
  if (reviewPerDay <= 0) return;

  const { data: allListItems, error: allListItemsError } = await supabase
    .from("problem_list_items")
    .select("problem_id")
    .eq("list_id", listItem.list_id);

  if (allListItemsError) {
    console.error("Failed to look up list problems for review cap enforcement", {
      userId, problemId, listId: listItem.list_id, error: allListItemsError,
    });
    return;
  }

  const listProblemIds: string[] = (allListItems ?? [])
    .map((item: any) => item.problem_id as string)
    .filter((id: string) => id !== problemId);

  if (listProblemIds.length === 0) return;

  let dateStr = utcToLocalDateStr(next.next_review_at, tzOffset);

  const originalDate = dateStr;
  const { startMs: windowStartMs } = localDayBoundsUTC(originalDate, tzOffset);
  let windowEndDate = originalDate;
  for (let i = 0; i < 6; i++) {
    windowEndDate = nextLocalDateStr(windowEndDate);
  }
  const { endMs: windowEndMs } = localDayBoundsUTC(windowEndDate, tzOffset);

  const { data: scheduledReviews, error: scheduledReviewsError } = await supabase
    .from("user_problem_progress")
    .select("next_review_at")
    .eq("user_id", userId)
    .in("problem_id", listProblemIds)
    .gte("next_review_at", new Date(windowStartMs).toISOString())
    .lt("next_review_at", new Date(windowEndMs).toISOString());

  if (scheduledReviewsError) {
    console.error("Failed to fetch scheduled reviews for daily cap check", {
      userId, problemId,
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
        next.next_review_at = new Date(startMs).toISOString();
      }
      return;
    }

    dateStr = nextLocalDateStr(dateStr);
  }
}

import {
  utcToLocalDateStr,
  localDayBoundsUTC,
  nextLocalDateStr,
} from "@/lib/api/localDateUtils";

export async function backfillReviewSchedule(
  supabase: any,
  userId: string,
  listId: string,
  newReviewPerDay: number,
  localDate: string | null,
  tzOffset: number | null,
  now: Date = new Date(),
): Promise<void> {
  const { data: listItems, error: listItemsErr } = await supabase
    .from("problem_list_items")
    .select("problem_id")
    .eq("list_id", listId);

  if (listItemsErr) {
    console.error("Error fetching problem list items for backfill:", {
      listId, userId, error: listItemsErr,
    });
    return;
  }

  const problemIds = (listItems ?? []).map((item: any) => item.problem_id as string);
  if (problemIds.length === 0) return;

  const nowIso = now.toISOString();
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

  const todayStr = localDate ?? utcToLocalDateStr(now.getTime(), tzOffset);

  const items = progressRows.map((row: any) => {
    const ideal = new Date(row.last_attempt_at);
    ideal.setUTCDate(ideal.getUTCDate() + (row.interval_days ?? 1));
    const idealLocalStr = utcToLocalDateStr(ideal.getTime(), tzOffset);
    return {
      problem_id: row.problem_id as string,
      baseDate: idealLocalStr < todayStr ? todayStr : idealLocalStr,
      sortKey: ideal.getTime(),
    };
  });

  items.sort(
    (a: { sortKey: number }, b: { sortKey: number }) => a.sortKey - b.sortKey,
  );

  const slotsByDate = new Map<string, number>();
  const updates: { problem_id: string; next_review_at: string }[] = [];

  for (const item of items) {
    let dateStr = item.baseDate;
    for (let i = 0; i < 365; i++) {
      const count = slotsByDate.get(dateStr) ?? 0;
      if (count < newReviewPerDay) {
        slotsByDate.set(dateStr, count + 1);
        const { startMs } = localDayBoundsUTC(dateStr, tzOffset);
        updates.push({
          problem_id: item.problem_id,
          next_review_at: new Date(startMs).toISOString(),
        });
        break;
      }
      dateStr = nextLocalDateStr(dateStr);
    }
  }

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

/**
 * Shared timezone-aware date helpers used by write-time review scheduling
 * (cascadeNextReviewDate, backfillReviewSchedule).
 *
 * tzOffset convention: value from Date.prototype.getTimezoneOffset(), i.e.
 * minutes **west** of UTC (positive for US, negative for east-of-UTC zones).
 * local time = UTC − tzOffset minutes.
 */

/**
 * Convert a UTC ISO string (or UTC milliseconds) to the user's local
 * calendar date as a YYYY-MM-DD string.
 */
export function utcToLocalDateStr(
  utcMsOrIso: number | string,
  tzOffset: number | null,
): string {
  const utcMs =
    typeof utcMsOrIso === "string" ? Date.parse(utcMsOrIso) : utcMsOrIso;
  const shifted = tzOffset != null ? utcMs - tzOffset * 60 * 1000 : utcMs;
  return new Date(shifted).toISOString().slice(0, 10);
}

/**
 * Return the UTC millisecond boundaries (start and exclusive end) of the
 * user's local calendar day for a given YYYY-MM-DD date string.
 */
export function localDayBoundsUTC(
  dateStr: string,
  tzOffset: number | null,
): { startMs: number; endMs: number } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const startMs =
    tzOffset != null
      ? Date.UTC(y, m - 1, d) + tzOffset * 60 * 1000
      : Date.UTC(y, m - 1, d);
  return { startMs, endMs: startMs + 24 * 60 * 60 * 1000 };
}

/**
 * Advance a local YYYY-MM-DD date string by one calendar day.
 */
export function nextLocalDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

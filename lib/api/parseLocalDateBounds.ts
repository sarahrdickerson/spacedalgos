/**
 * Parses `localDate` (YYYY-MM-DD) and `tzOffset` (minutes, UTC − local, as
 * returned by `Date.prototype.getTimezoneOffset()`) from URL search params and
 * returns the date boundary ISO strings needed for server-side "today" logic.
 *
 * Returns `null` when `localDate` is present but malformed — callers should
 * respond with a 400 in that case.
 *
 * Bounds explained:
 *  - `todayMidnightUTC`  — UTC midnight of the user's local calendar day
 *                          (used for review scheduling comparisons that are
 *                           already stored as UTC midnight values)
 *  - `tomorrowMidnightUTC` — UTC midnight of the next local calendar day
 *  - `localDayStartUTC` / `localDayEndUTC` — the actual 24-hour window of
 *                          the user's local calendar day in UTC, adjusted by
 *                          tzOffset so post-6 PM CST timestamps (which are
 *                          already UTC "tomorrow") still count as today.
 */
export type LocalDateBounds = {
  localYear: number;
  localMonth: number;
  localDay: number;
  todayMidnightUTC: string;
  tomorrowMidnightUTC: string;
  localDayStartUTC: string;
  localDayEndUTC: string;
};

export function parseLocalDateBounds(
  searchParams: URLSearchParams
): LocalDateBounds | null {
  const localDateParam = searchParams.get("localDate");

  if (localDateParam && !/^\d{4}-\d{2}-\d{2}$/.test(localDateParam)) {
    return null; // caller should return 400
  }

  const now = new Date();
  const [localYear, localMonth, localDay] = localDateParam
    ? localDateParam.split("-").map(Number)
    : [now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate()];

  const utcMidnightMs = Date.UTC(localYear, localMonth - 1, localDay);

  const todayMidnightUTC = new Date(utcMidnightMs).toISOString();
  const tomorrowMidnightUTC = new Date(
    Date.UTC(localYear, localMonth - 1, localDay + 1)
  ).toISOString();

  // getTimezoneOffset() = (UTC − local) in minutes, e.g. CST = +360.
  // Adding it to UTC midnight gives the user's actual local midnight in UTC,
  // so post-6 PM CST attempts (already stored as UTC "tomorrow") are still
  // recognised as belonging to today's local calendar day.
  const tzOffsetParam = searchParams.get("tzOffset");
  const tzOffsetMinutes =
    tzOffsetParam !== null && /^-?\d+$/.test(tzOffsetParam)
      ? Math.max(-720, Math.min(840, parseInt(tzOffsetParam, 10)))
      : 0;
  const shiftedMidnightMs = utcMidnightMs + tzOffsetMinutes * 60 * 1000;

  const localDayStartUTC = new Date(shiftedMidnightMs).toISOString();
  const localDayEndUTC = new Date(shiftedMidnightMs + 86_400_000).toISOString();

  return {
    localYear,
    localMonth,
    localDay,
    todayMidnightUTC,
    tomorrowMidnightUTC,
    localDayStartUTC,
    localDayEndUTC,
  };
}

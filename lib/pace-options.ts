export const PACE_OPTIONS = [
  {
    key: "leisurely" as const,
    label: "Leisurely",
    emoji: "⏳",
    new_per_day: 1,
    review_per_day: 2,
  },
  {
    key: "normal" as const,
    label: "Normal",
    emoji: "🚶‍♀️‍➡️",
    new_per_day: 2,
    review_per_day: 4,
  },
  {
    key: "accelerated" as const,
    label: "Accelerated",
    emoji: "🏎️💨",
    new_per_day: 3,
    review_per_day: 6,
  },
] as const;

export type Pace = (typeof PACE_OPTIONS)[number]["key"];

export function normalizePace(pace: string): Pace {
  return PACE_OPTIONS.find((p) => p.key === pace)?.key ?? "normal";
}

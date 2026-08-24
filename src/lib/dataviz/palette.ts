/**
 * Validated categorical palette (see globals.css --series-1..8). Fixed hue
 * order is the CVD-safety mechanism — don't reorder without re-running the
 * dataviz skill's validator. Referencing the CSS vars (not hex) means charts
 * pick up the light/dark step automatically via the .dark class.
 */
export const SERIES_COLORS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
  "var(--series-7)",
  "var(--series-8)",
] as const;

/** Slots 1-4 are the only ones validated for all-pairs comparison (pie/donut, scatter) — fold anything past 4 into "Other". */
export const MAX_ALL_PAIRS_SLOTS = 4;

export function seriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

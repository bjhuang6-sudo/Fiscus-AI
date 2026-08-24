export interface HoldingWeight {
  ticker: string;
  weight: number; // 0-1
}

/** Ranked, single-hue magnitude bars — longer bar means more of the book is in that name. */
export function ConcentrationBars({ holdings }: { holdings: HoldingWeight[] }) {
  const sorted = [...holdings].sort((a, b) => b.weight - a.weight);

  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground">No positions yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {sorted.map((h) => (
        <li key={h.ticker} className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-xs font-medium text-foreground">{h.ticker}</span>
          <div className="h-4 flex-1 overflow-hidden rounded-sm bg-muted">
            <div
              className="h-full rounded-sm bg-primary"
              style={{ width: `${Math.max(h.weight * 100, 2)}%` }}
            />
          </div>
          <span className="num w-12 shrink-0 text-right text-xs text-muted-foreground">
            {(h.weight * 100).toFixed(1)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

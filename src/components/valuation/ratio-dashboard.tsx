import { cn } from "@/lib/utils";
import type { RatioSet } from "@/lib/market-data";

interface RatioRowSpec {
  label: string;
  key: keyof RatioSet;
  format: (v: number) => string;
  higherIsBetter: boolean;
}

const GROUPS: { title: string; rows: RatioRowSpec[] }[] = [
  {
    title: "Liquidity",
    rows: [
      { label: "Current ratio", key: "currentRatio", format: (v) => `${v.toFixed(2)}x`, higherIsBetter: true },
      { label: "Quick ratio", key: "quickRatio", format: (v) => `${v.toFixed(2)}x`, higherIsBetter: true },
    ],
  },
  {
    title: "Profitability",
    rows: [
      { label: "Gross margin", key: "grossMargin", format: (v) => `${(v * 100).toFixed(1)}%`, higherIsBetter: true },
      { label: "Net margin", key: "netMargin", format: (v) => `${(v * 100).toFixed(1)}%`, higherIsBetter: true },
      { label: "Return on equity", key: "returnOnEquity", format: (v) => `${(v * 100).toFixed(1)}%`, higherIsBetter: true },
      { label: "Return on assets", key: "returnOnAssets", format: (v) => `${(v * 100).toFixed(1)}%`, higherIsBetter: true },
    ],
  },
  {
    title: "Leverage",
    rows: [
      { label: "Debt / equity", key: "debtToEquity", format: (v) => `${v.toFixed(2)}x`, higherIsBetter: false },
    ],
  },
];

export function RatioDashboard({
  subject,
  peerAverage,
}: {
  subject: RatioSet;
  peerAverage: RatioSet | null;
}) {
  return (
    <div className="space-y-4">
      {GROUPS.map((group) => (
        <div key={group.title} className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-2.5">
            <h3 className="text-sm font-semibold">{group.title}</h3>
          </div>
          <div className="divide-y divide-border">
            {group.rows.map((row) => {
              const value = subject[row.key] as number | null;
              const peerValue = peerAverage ? (peerAverage[row.key] as number | null) : null;
              if (value === null) return null;
              const isBetter =
                peerValue !== null &&
                (row.higherIsBetter ? value >= peerValue : value <= peerValue);
              return (
                <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <div className="flex items-center gap-4">
                    {peerValue !== null && (
                      <span className="num text-xs text-muted-foreground">
                        peer avg {row.format(peerValue)}
                      </span>
                    )}
                    <span
                      className={cn(
                        "num w-20 text-right text-sm font-semibold",
                        peerValue !== null && (isBetter ? "text-positive" : "text-negative")
                      )}
                    >
                      {row.format(value)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

import { seriesColor } from "@/lib/dataviz/palette";

export interface SectorWeight {
  sector: string;
  weight: number; // 0-1
}

const MAX_SLOTS = 4;

export function SectorAllocationBar({ sectors }: { sectors: SectorWeight[] }) {
  const sorted = [...sectors].sort((a, b) => b.weight - a.weight);
  const top = sorted.slice(0, MAX_SLOTS);
  const otherWeight = sorted.slice(MAX_SLOTS).reduce((sum, s) => sum + s.weight, 0);

  const segments = otherWeight > 0 ? [...top, { sector: "Other", weight: otherWeight }] : top;

  if (segments.length === 0) {
    return <p className="text-sm text-muted-foreground">No positions yet.</p>;
  }

  return (
    <div>
      <div className="flex h-6 w-full gap-0.5 overflow-hidden rounded-md">
        {segments.map((s, i) => (
          <div
            key={s.sector}
            style={{
              width: `${Math.max(s.weight * 100, 1)}%`,
              backgroundColor: s.sector === "Other" ? "var(--muted-foreground)" : seriesColor(i),
            }}
            title={`${s.sector}: ${(s.weight * 100).toFixed(1)}%`}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s, i) => (
          <li key={s.sector} className="flex items-center gap-1.5 text-xs">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: s.sector === "Other" ? "var(--muted-foreground)" : seriesColor(i) }}
            />
            <span className="text-foreground">{s.sector}</span>
            <span className="num text-muted-foreground">{(s.weight * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

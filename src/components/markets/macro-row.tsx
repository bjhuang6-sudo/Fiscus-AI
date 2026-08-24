import type { MacroIndicator } from "@/lib/market-data";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export function MacroRow({ items }: { items: MacroIndicator[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-border bg-card px-3.5 py-3">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="num text-base font-semibold">{item.value}</span>
            {item.changePercent !== 0 && (
              <span
                className={cn(
                  "num text-xs font-medium",
                  item.changePercent > 0 ? "text-positive" : "text-negative"
                )}
              >
                {formatPercent(item.changePercent)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

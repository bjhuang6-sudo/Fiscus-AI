import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ValuationResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AdviceDisclaimer } from "@/components/advice-disclaimer";

export function ValuationCard({ data }: { data: ValuationResult }) {
  const isUpside = data.upside >= 0;

  return (
    <div className="w-full max-w-md rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            {data.companyName} ({data.ticker})
          </p>
          <p className="text-xs text-muted-foreground">{data.method}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {data.assumptions.map((a) => (
          <div key={a.label} className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{a.label}</span>
            <span className="num font-medium">{a.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-end justify-between gap-4 border-t border-border pt-3">
        <div>
          <p className="text-xs text-muted-foreground">Implied value</p>
          <p className="num text-lg font-semibold leading-none">
            ${data.impliedValue.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Current price</p>
          <p className="num text-sm font-medium leading-none">
            ${data.currentPrice.toFixed(2)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Implied upside</p>
          <div
            className={cn(
              "num flex items-center justify-end gap-0.5 text-sm font-semibold",
              isUpside ? "text-positive" : "text-negative"
            )}
          >
            {isUpside ? (
              <ArrowUpRight className="size-3.5" />
            ) : (
              <ArrowDownRight className="size-3.5" />
            )}
            {isUpside ? "+" : ""}
            {data.upside.toFixed(1)}%
          </div>
        </div>
      </div>

      <AdviceDisclaimer className="mt-3" />
    </div>
  );
}

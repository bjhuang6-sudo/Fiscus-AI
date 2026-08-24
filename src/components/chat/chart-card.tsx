"use client";

import { PriceChart } from "@/components/finance/price-chart";
import type { ChartCardData } from "@/lib/types";

export function ChartCard({ data }: { data: ChartCardData }) {
  return (
    <div className="w-full max-w-md rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{data.ticker}</span>
        <span className="text-xs text-muted-foreground">{data.companyName}</span>
      </div>
      <div className="mt-2">
        <PriceChart
          ticker={data.ticker}
          initialSeries={data.series}
          initialRange={data.range}
          compact
        />
      </div>
    </div>
  );
}

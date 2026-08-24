"use client";

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { QuoteData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ConfidenceBadge } from "@/components/ui/confidence-badge";

export function PriceCard({ data }: { data: QuoteData }) {
  const isPositive = data.changePercent >= 0;
  const chartData = data.sparkline.map((value, i) => ({ i, value }));

  return (
    <div className="w-full max-w-sm rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{data.ticker}</span>
            <span className="text-xs text-muted-foreground">{data.currency}</span>
            {data.confidence && (
              <ConfidenceBadge
                confidence={data.confidence}
                sources={data.sources}
                note={data.confidenceNote}
              />
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{data.companyName}</p>
        </div>
        <div className="text-right">
          <p className="num text-lg font-semibold leading-none">
            ${data.price.toFixed(2)}
          </p>
          <div
            className={cn(
              "mt-1 flex items-center justify-end gap-0.5 text-xs font-medium num",
              isPositive ? "text-positive" : "text-negative"
            )}
          >
            {isPositive ? (
              <ArrowUpRight className="size-3" />
            ) : (
              <ArrowDownRight className="size-3" />
            )}
            {isPositive ? "+" : ""}
            {data.change.toFixed(2)} ({isPositive ? "+" : ""}
            {data.changePercent.toFixed(2)}%)
          </div>
        </div>
      </div>
      <div className="mt-3 h-12 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <YAxis domain={["dataMin", "dataMax"]} hide />
            <Line
              type="monotone"
              dataKey="value"
              stroke={isPositive ? "var(--positive)" : "var(--negative)"}
              strokeWidth={1.75}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

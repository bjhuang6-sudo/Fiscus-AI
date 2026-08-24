"use client";

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { IndexQuote } from "@/lib/market-data";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";

export function IndexCard({ index }: { index: IndexQuote }) {
  const isPositive = index.changePercent >= 0;
  const chartData = index.sparkline.map((value, i) => ({ i, value }));

  return (
    <div className="rounded-lg border border-border bg-card p-3.5">
      <p className="text-xs text-muted-foreground">{index.name}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="num text-lg font-semibold leading-none">
          {index.value.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </p>
        <span
          className={cn(
            "num flex items-center gap-0.5 text-xs font-medium",
            isPositive ? "text-positive" : "text-negative"
          )}
        >
          {isPositive ? (
            <ArrowUpRight className="size-3" />
          ) : (
            <ArrowDownRight className="size-3" />
          )}
          {formatPercent(index.changePercent)}
        </span>
      </div>
      <div className="mt-2 h-10 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <YAxis domain={["dataMin", "dataMax"]} hide />
            <Line
              type="monotone"
              dataKey="value"
              stroke={isPositive ? "var(--positive)" : "var(--negative)"}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

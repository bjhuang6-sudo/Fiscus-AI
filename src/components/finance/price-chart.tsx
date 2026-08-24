"use client";

import * as React from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ChartRange, ChartSeries } from "@/lib/market-data";
import { cn } from "@/lib/utils";

const RANGES: ChartRange[] = ["1D", "5D", "1M", "6M", "1Y", "5Y", "ALL"];

function formatTick(dateIso: string, range: ChartRange): string {
  const d = new Date(dateIso);
  if (range === "1D") return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (range === "5D") return d.toLocaleDateString("en-US", { weekday: "short" });
  if (range === "5Y" || range === "ALL") return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PriceChart({
  ticker,
  initialSeries,
  initialRange = "1D",
  compact = false,
}: {
  ticker: string;
  initialSeries: ChartSeries;
  initialRange?: ChartRange;
  compact?: boolean;
}) {
  const [range, setRange] = React.useState<ChartRange>(initialRange);
  const [series, setSeries] = React.useState<ChartSeries>(initialSeries);
  const [loading, setLoading] = React.useState(false);
  const isFirstRender = React.useRef(true);

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/market/chart?ticker=${encodeURIComponent(ticker)}&range=${range}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ChartSeries | null) => {
        if (!cancelled && data) setSeries(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, ticker]);

  const isPositive = series.changePercent >= 0;
  const color = isPositive ? "var(--positive)" : "var(--negative)";
  const chartData = series.points.map((p) => ({ date: p.date, close: p.close }));

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div
          className={cn(
            "num flex items-center gap-1 text-sm font-medium",
            isPositive ? "text-positive" : "text-negative"
          )}
        >
          {isPositive ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
          {isPositive ? "+" : "-"}${Math.abs(series.change).toFixed(2)} ({isPositive ? "+" : ""}
          {series.changePercent.toFixed(2)}%) · {range === "ALL" ? "all time" : `past ${range}`}
        </div>
        <div className="flex gap-0.5 rounded-md bg-muted p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-sm px-2 py-1 text-xs font-medium transition-colors",
                r === range
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "mt-3 w-full transition-opacity",
          compact ? "h-40" : "h-64",
          loading && "opacity-50"
        )}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickFormatter={(v: string) => formatTick(v, range)}
              axisLine={false}
              tickLine={false}
              minTickGap={50}
            />
            <YAxis domain={["dataMin", "dataMax"]} hide />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(v) => (typeof v === "string" ? formatTick(v, range) : "")}
              labelStyle={{ color: "var(--muted-foreground)" }}
              formatter={(value) => [`$${Number(value).toFixed(2)}`, "Close"]}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke={color}
              strokeWidth={1.75}
              fill="url(#priceFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

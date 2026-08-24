"use client";

import { motion } from "framer-motion";
import { AdviceDisclaimer } from "@/components/advice-disclaimer";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CompanyFundamentals } from "@/lib/market-data";

function formatRecommendation(key: string | null): string | null {
  if (!key || key === "none") return null;
  return key
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function AnalystView({
  fundamentals,
  currentPrice,
}: {
  fundamentals: CompanyFundamentals;
  currentPrice: number;
}) {
  const { analystTargetLow, analystTargetMean, analystTargetHigh, analystRecommendation, analystCount } =
    fundamentals;

  if (analystTargetLow === null || analystTargetHigh === null || analystTargetMean === null) {
    return null;
  }

  const range = analystTargetHigh - analystTargetLow || 1;
  const pct = (value: number) => Math.min(100, Math.max(0, ((value - analystTargetLow) / range) * 100));
  const recommendation = formatRecommendation(analystRecommendation);
  const upside = ((analystTargetMean - currentPrice) / currentPrice) * 100;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Analyst price targets</h3>
        {recommendation && (
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
            {recommendation}
          </span>
        )}
      </div>

      <div className="mt-5">
        <div className="relative h-1.5 rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct(analystTargetMean)}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 rounded-full bg-primary/40"
          />
          <div
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary"
            style={{ left: `${pct(currentPrice)}%` }}
            title="Current price"
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span className="num">{formatCurrency(analystTargetLow, 0)} low</span>
          <span className="num">{formatCurrency(analystTargetHigh, 0)} high</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <div>
          <p className="text-xs text-muted-foreground">Mean target</p>
          <p className="num text-lg font-semibold">{formatCurrency(analystTargetMean, 0)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Implied vs. current</p>
          <p
            className={cn(
              "num text-lg font-semibold",
              upside >= 0 ? "text-positive" : "text-negative"
            )}
          >
            {upside >= 0 ? "+" : ""}
            {upside.toFixed(1)}%
          </p>
        </div>
        {analystCount !== null && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Analysts</p>
            <p className="num text-lg font-semibold">{analystCount}</p>
          </div>
        )}
      </div>
      <AdviceDisclaimer className="mt-3" />
    </div>
  );
}

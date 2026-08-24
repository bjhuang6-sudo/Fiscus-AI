"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { AdviceDisclaimer } from "@/components/advice-disclaimer";
import { runDcf } from "@/lib/finance/dcf";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CompanyFundamentals, QuoteSnapshot } from "@/lib/market-data";
import { StressTest } from "@/components/valuation/stress-test";

interface DcfCalculatorProps {
  quote: QuoteSnapshot;
  fundamentals: CompanyFundamentals;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function AssumptionSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix = "%",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="num font-medium text-foreground">
          {value.toFixed(1)}
          {suffix}
        </span>
      </div>
      <Slider
        className="mt-2"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
    </div>
  );
}

const DEFAULT_DISCOUNT_RATE = 9;
const DEFAULT_TERMINAL_GROWTH = 2.5;

export function DcfCalculator({ quote, fundamentals }: DcfCalculatorProps) {
  const hasRealFcf = fundamentals.freeCashflow !== null && fundamentals.freeCashflow > 0;
  const defaultGrowth = fundamentals.revenueGrowth !== null
    ? clamp(Math.round(fundamentals.revenueGrowth * 100 * 2) / 2, -10, 35)
    : 8;

  const [growthRate, setGrowthRate] = React.useState(defaultGrowth);
  const [discountRate, setDiscountRate] = React.useState(DEFAULT_DISCOUNT_RATE);
  const [terminalGrowthRate, setTerminalGrowthRate] = React.useState(DEFAULT_TERMINAL_GROWTH);
  const years = 5;

  const resetAssumptions = React.useCallback(() => {
    setGrowthRate(defaultGrowth);
    setDiscountRate(DEFAULT_DISCOUNT_RATE);
    setTerminalGrowthRate(DEFAULT_TERMINAL_GROWTH);
  }, [defaultGrowth]);

  // Reset assumptions when the underlying ticker (and its real growth rate) changes.
  React.useEffect(() => {
    resetAssumptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fundamentals.ticker]);

  const isDirty =
    growthRate !== defaultGrowth || discountRate !== DEFAULT_DISCOUNT_RATE || terminalGrowthRate !== DEFAULT_TERMINAL_GROWTH;

  const baseFcf = React.useMemo(() => {
    if (hasRealFcf) return fundamentals.freeCashflow as number;
    // Fallback only when the provider has no reported FCF for this ticker.
    return fundamentals.revenueTtm * (fundamentals.netMargin ?? 0.15) * 0.85 || fundamentals.marketCap * 0.04;
  }, [fundamentals, hasRealFcf]);

  const sharesOutstanding = fundamentals.sharesOutstanding ?? fundamentals.marketCap / quote.price;

  const netDebt =
    fundamentals.totalDebt !== null && fundamentals.totalCash !== null
      ? fundamentals.totalDebt - fundamentals.totalCash
      : 0;

  const result = React.useMemo(
    () =>
      runDcf({
        baseFcf,
        growthRate: growthRate / 100,
        discountRate: discountRate / 100,
        terminalGrowthRate: terminalGrowthRate / 100,
        years,
        sharesOutstanding,
        netDebt,
      }),
    [baseFcf, growthRate, discountRate, terminalGrowthRate, sharesOutstanding, netDebt]
  );

  const upside = ((result.impliedSharePrice - quote.price) / quote.price) * 100;
  const isUpside = upside >= 0;

  const growthSteps = [-4, -2, 0, 2, 4];
  const discountSteps = [-2, -1, 0, 1, 2];

  const dcfInputs = {
    baseFcf,
    growthRate: growthRate / 100,
    discountRate: discountRate / 100,
    terminalGrowthRate: terminalGrowthRate / 100,
    years,
    sharesOutstanding,
    netDebt,
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <div className="space-y-5 rounded-lg border border-border bg-card p-4 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Assumptions</h3>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                hasRealFcf ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {hasRealFcf ? "Reported FCF" : "Estimated FCF"}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              disabled={!isDirty}
              onClick={resetAssumptions}
              aria-label="Reset assumptions"
            >
              <RotateCcw />
            </Button>
          </div>
        </div>
        <AssumptionSlider
          label="FCF growth rate (5yr)"
          value={growthRate}
          onChange={setGrowthRate}
          min={-10}
          max={40}
          step={0.5}
        />
        <AssumptionSlider
          label="Discount rate (WACC)"
          value={discountRate}
          onChange={setDiscountRate}
          min={4}
          max={18}
          step={0.25}
        />
        <AssumptionSlider
          label="Terminal growth rate"
          value={terminalGrowthRate}
          onChange={setTerminalGrowthRate}
          min={0}
          max={5}
          step={0.25}
        />

        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">Implied share price</p>
          <motion.p
            key={Math.round(result.impliedSharePrice * 100)}
            initial={{ opacity: 0.4, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="num mt-1 text-3xl font-semibold"
          >
            {formatCurrency(result.impliedSharePrice)}
          </motion.p>
          <div
            className={cn(
              "num mt-1 flex items-center gap-1 text-sm font-medium",
              isUpside ? "text-positive" : "text-negative"
            )}
          >
            {isUpside ? (
              <ArrowUpRight className="size-4" />
            ) : (
              <ArrowDownRight className="size-4" />
            )}
            {formatPercent(upside)} vs current price of {formatCurrency(quote.price)}
          </div>
          {fundamentals.analystTargetMean !== null && (
            <p className="num mt-2 text-xs text-muted-foreground">
              Wall St. consensus target: {formatCurrency(fundamentals.analystTargetMean, 0)}
              {fundamentals.analystCount ? ` (${fundamentals.analystCount} analysts)` : ""}
            </p>
          )}
          {Math.abs(upside) > 30 && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              A DCF this far from the market price usually isn&apos;t a data problem — a {years}-year explicit
              forecast followed by a flat terminal growth rate can badly undervalue a company the market expects
              to keep growing fast for years past that window. The analyst target above uses a different
              methodology and often sits closer to the market price for exactly that reason.
            </p>
          )}
        </div>
        <AdviceDisclaimer />
      </div>

      <div className="rounded-lg border border-border bg-card p-4 lg:col-span-3">
        <h3 className="text-sm font-semibold">Sensitivity — implied price</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Growth rate (rows) vs. discount rate (columns), centered on your current assumptions.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-xs">
            <thead>
              <tr>
                <th className="p-1.5 text-left font-medium text-muted-foreground">g \ WACC</th>
                {discountSteps.map((d) => (
                  <th key={d} className="num p-1.5 text-center font-medium text-muted-foreground">
                    {(discountRate + d).toFixed(2)}%
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {growthSteps.map((g) => (
                <tr key={g}>
                  <td className="num p-1.5 font-medium text-muted-foreground">
                    {(growthRate + g).toFixed(1)}%
                  </td>
                  {discountSteps.map((d) => {
                    const gRate = (growthRate + g) / 100;
                    const dRate = (discountRate + d) / 100;
                    if (dRate <= terminalGrowthRate / 100) {
                      return (
                        <td key={d} className="p-1.5 text-center text-muted-foreground/50">
                          —
                        </td>
                      );
                    }
                    const cellResult = runDcf({
                      baseFcf,
                      growthRate: gRate,
                      discountRate: dRate,
                      terminalGrowthRate: terminalGrowthRate / 100,
                      years,
                      sharesOutstanding,
                      netDebt,
                    });
                    const cellUpside =
                      ((cellResult.impliedSharePrice - quote.price) / quote.price) * 100;
                    const isCenter = g === 0 && d === 0;
                    return (
                      <td
                        key={d}
                        className={cn(
                          "num p-1.5 text-center",
                          isCenter && "rounded bg-accent font-semibold"
                        )}
                      >
                        <span className={cellUpside >= 0 ? "text-positive" : "text-negative"}>
                          {formatCurrency(cellResult.impliedSharePrice, 0)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="lg:col-span-5">
        <StressTest baseInputs={dcfInputs} currentPrice={quote.price} />
      </div>
    </div>
  );
}

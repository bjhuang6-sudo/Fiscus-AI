"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { AdviceDisclaimer } from "@/components/advice-disclaimer";
import { runLbo } from "@/lib/finance/lbo";
import { formatCurrency, formatCompactCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CompanyFundamentals, QuoteSnapshot } from "@/lib/market-data";

interface LboCalculatorProps {
  quote: QuoteSnapshot;
  fundamentals: CompanyFundamentals;
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
      <Slider className="mt-2" value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)} />
    </div>
  );
}

const DEFAULTS = {
  premium: 20,
  leverage: 60,
  ebitdaGrowth: 6,
  exitMultipleDelta: 0,
  interestRate: 8,
};
const HOLDING_YEARS = 5;
const FCF_CONVERSION = 0.5;

export function LboCalculator({ quote, fundamentals }: LboCalculatorProps) {
  // No direct EBITDA field from the provider — same revenue x net margin x 1.3
  // add-back approximation already used for EV/EBITDA elsewhere in this app,
  // for consistency.
  const estimatedEbitda = fundamentals.revenueTtm * (fundamentals.netMargin ?? 0.15) * 1.3;
  const netDebt =
    fundamentals.totalDebt !== null && fundamentals.totalCash !== null
      ? fundamentals.totalDebt - fundamentals.totalCash
      : 0;
  const currentEV = fundamentals.marketCap + netDebt;
  const entryMultiple = estimatedEbitda > 0 ? currentEV / estimatedEbitda : 0;

  const [premium, setPremium] = React.useState(DEFAULTS.premium);
  const [leverage, setLeverage] = React.useState(DEFAULTS.leverage);
  const [ebitdaGrowth, setEbitdaGrowth] = React.useState(DEFAULTS.ebitdaGrowth);
  const [exitMultipleDelta, setExitMultipleDelta] = React.useState(DEFAULTS.exitMultipleDelta);
  const [interestRate, setInterestRate] = React.useState(DEFAULTS.interestRate);

  const resetAssumptions = React.useCallback(() => {
    setPremium(DEFAULTS.premium);
    setLeverage(DEFAULTS.leverage);
    setEbitdaGrowth(DEFAULTS.ebitdaGrowth);
    setExitMultipleDelta(DEFAULTS.exitMultipleDelta);
    setInterestRate(DEFAULTS.interestRate);
  }, []);

  React.useEffect(() => {
    resetAssumptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fundamentals.ticker]);

  const isDirty =
    premium !== DEFAULTS.premium ||
    leverage !== DEFAULTS.leverage ||
    ebitdaGrowth !== DEFAULTS.ebitdaGrowth ||
    exitMultipleDelta !== DEFAULTS.exitMultipleDelta ||
    interestRate !== DEFAULTS.interestRate;

  const entryEV = currentEV * (1 + premium / 100);
  const exitMultiple = entryMultiple + exitMultipleDelta;

  const result = React.useMemo(
    () =>
      runLbo({
        entryEV,
        entryEbitda: estimatedEbitda,
        ebitdaGrowthRate: ebitdaGrowth / 100,
        leverageRatio: leverage / 100,
        interestRate: interestRate / 100,
        fcfConversion: FCF_CONVERSION,
        exitMultiple,
        years: HOLDING_YEARS,
      }),
    [entryEV, estimatedEbitda, ebitdaGrowth, leverage, interestRate, exitMultiple]
  );

  if (estimatedEbitda <= 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
        Not enough data to estimate EBITDA for this ticker.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <div className="space-y-5 rounded-lg border border-border bg-card p-4 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Deal assumptions</h3>
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
        <p className="text-xs text-muted-foreground">
          Entry EV/EBITDA ~{entryMultiple.toFixed(1)}x on an estimated EBITDA of{" "}
          {formatCompactCurrency(estimatedEbitda)} (revenue × net margin, add-back adjusted).
        </p>
        <AssumptionSlider label="Takeover premium" value={premium} onChange={setPremium} min={0} max={50} step={1} />
        <AssumptionSlider label="Leverage (debt / EV)" value={leverage} onChange={setLeverage} min={20} max={85} step={1} />
        <AssumptionSlider label="EBITDA growth (annual)" value={ebitdaGrowth} onChange={setEbitdaGrowth} min={-5} max={25} step={0.5} />
        <AssumptionSlider
          label="Exit multiple vs. entry"
          value={exitMultipleDelta}
          onChange={setExitMultipleDelta}
          min={-3}
          max={3}
          step={0.25}
          suffix="x"
        />
        <AssumptionSlider label="Interest rate on debt" value={interestRate} onChange={setInterestRate} min={3} max={14} step={0.25} />

        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">5-year MOIC</p>
          <motion.p
            key={Math.round(result.moic * 100)}
            initial={{ opacity: 0.4, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="num mt-1 text-3xl font-semibold"
          >
            {result.moic.toFixed(2)}x
          </motion.p>
          <div className={cn("num mt-1 text-sm font-medium", result.irr >= 0 ? "text-positive" : "text-negative")}>
            {formatPercent(result.irr * 100)} IRR
          </div>
          <p className="num mt-2 text-xs text-muted-foreground">
            Entry equity check: {formatCompactCurrency(result.entryEquity)} · Entry debt:{" "}
            {formatCompactCurrency(result.entryDebt)}
          </p>
          {result.schedule.every((y) => y.debtPaydown === 0) && result.entryDebt > 0 && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Debt never gets paid down here — at this size, interest on {formatCompactCurrency(result.entryDebt)}{" "}
              of debt alone exceeds the free cash flow the business generates. That&apos;s not a modeling error, it&apos;s
              the real reason mega-caps essentially never get taken private: there isn&apos;t enough leveraged loan
              capacity in the market to fund a deal this size. Try lowering the leverage slider to see a more
              realistic structure.
            </p>
          )}
        </div>
        <AdviceDisclaimer />
      </div>

      <div className="rounded-lg border border-border bg-card p-4 lg:col-span-3">
        <h3 className="text-sm font-semibold">Debt paydown schedule</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Free cash flow ({(FCF_CONVERSION * 100).toFixed(0)}% of EBITDA, after interest) sweeps against the debt
          balance each year.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-xs">
            <thead>
              <tr>
                <th className="p-1.5 text-left font-medium text-muted-foreground">Year</th>
                <th className="num p-1.5 text-right font-medium text-muted-foreground">EBITDA</th>
                <th className="num p-1.5 text-right font-medium text-muted-foreground">Interest</th>
                <th className="num p-1.5 text-right font-medium text-muted-foreground">Paydown</th>
                <th className="num p-1.5 text-right font-medium text-muted-foreground">Debt remaining</th>
              </tr>
            </thead>
            <tbody>
              {result.schedule.map((y) => (
                <tr key={y.year}>
                  <td className="p-1.5 font-medium">{y.year}</td>
                  <td className="num p-1.5 text-right">{formatCompactCurrency(y.ebitda)}</td>
                  <td className="num p-1.5 text-right text-muted-foreground">{formatCompactCurrency(y.interestExpense)}</td>
                  <td className="num p-1.5 text-right text-positive">{formatCompactCurrency(y.debtPaydown)}</td>
                  <td className="num p-1.5 text-right">{formatCompactCurrency(y.endingDebt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-xs">
          <div>
            <p className="text-muted-foreground">Exit EV</p>
            <p className="num mt-0.5 font-medium">{formatCompactCurrency(result.exitEV)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Exit debt</p>
            <p className="num mt-0.5 font-medium">{formatCompactCurrency(result.exitDebt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Exit equity</p>
            <p className="num mt-0.5 font-medium">{formatCompactCurrency(result.exitEquity)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

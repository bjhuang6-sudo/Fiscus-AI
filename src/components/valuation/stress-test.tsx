"use client";

import { AlertTriangle } from "lucide-react";
import { runDcf, type DcfInputs } from "@/lib/finance/dcf";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

interface StressTestProps {
  baseInputs: DcfInputs;
  currentPrice: number;
}

interface Scenario {
  name: string;
  description: string;
  apply: (inputs: DcfInputs) => DcfInputs;
}

const SCENARIOS: Scenario[] = [
  {
    name: "Rate shock",
    description: "+200bps discount rate",
    apply: (inputs) => ({ ...inputs, discountRate: inputs.discountRate + 0.02 }),
  },
  {
    name: "Revenue slowdown",
    description: "Growth rate cut 10pts",
    apply: (inputs) => ({ ...inputs, growthRate: Math.max(inputs.growthRate - 0.1, -0.15) }),
  },
  {
    name: "Margin compression",
    description: "Free cash flow -20%",
    apply: (inputs) => ({ ...inputs, baseFcf: inputs.baseFcf * 0.8 }),
  },
  {
    name: "Combined bear case",
    description: "All three shocks together",
    apply: (inputs) => ({
      ...inputs,
      discountRate: inputs.discountRate + 0.02,
      growthRate: Math.max(inputs.growthRate - 0.1, -0.15),
      baseFcf: inputs.baseFcf * 0.8,
    }),
  },
];

export function StressTest({ baseInputs, currentPrice }: StressTestProps) {
  const baseResult = runDcf(baseInputs);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-1.5">
        <AlertTriangle className="size-3.5 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Stress test</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        How the DCF holds up under adverse scenarios, applied on top of your current assumptions.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-xs">
          <thead>
            <tr>
              <th className="p-1.5 text-left font-medium text-muted-foreground">Scenario</th>
              <th className="p-1.5 text-left font-medium text-muted-foreground">Shock</th>
              <th className="num p-1.5 text-right font-medium text-muted-foreground">Implied price</th>
              <th className="num p-1.5 text-right font-medium text-muted-foreground">vs. base case</th>
              <th className="num p-1.5 text-right font-medium text-muted-foreground">vs. current price</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-accent/40">
              <td className="p-1.5 font-medium">Base case</td>
              <td className="p-1.5 text-muted-foreground">Your current assumptions</td>
              <td className="num p-1.5 text-right font-semibold">{formatCurrency(baseResult.impliedSharePrice)}</td>
              <td className="num p-1.5 text-right text-muted-foreground">—</td>
              <td className="num p-1.5 text-right">
                {formatPercent(((baseResult.impliedSharePrice - currentPrice) / currentPrice) * 100)}
              </td>
            </tr>
            {SCENARIOS.map((scenario) => {
              const shocked = scenario.apply(baseInputs);
              if (shocked.discountRate <= shocked.terminalGrowthRate) {
                return (
                  <tr key={scenario.name}>
                    <td className="p-1.5 font-medium">{scenario.name}</td>
                    <td className="p-1.5 text-muted-foreground">{scenario.description}</td>
                    <td colSpan={3} className="p-1.5 text-center text-muted-foreground/50">
                      Discount rate too close to terminal growth — model breaks down
                    </td>
                  </tr>
                );
              }
              const result = runDcf(shocked);
              const vsBase = ((result.impliedSharePrice - baseResult.impliedSharePrice) / baseResult.impliedSharePrice) * 100;
              const vsCurrent = ((result.impliedSharePrice - currentPrice) / currentPrice) * 100;
              return (
                <tr key={scenario.name}>
                  <td className="p-1.5 font-medium">{scenario.name}</td>
                  <td className="p-1.5 text-muted-foreground">{scenario.description}</td>
                  <td className="num p-1.5 text-right font-semibold">{formatCurrency(result.impliedSharePrice)}</td>
                  <td className={cn("num p-1.5 text-right", vsBase >= 0 ? "text-positive" : "text-negative")}>
                    {formatPercent(vsBase)}
                  </td>
                  <td className={cn("num p-1.5 text-right", vsCurrent >= 0 ? "text-positive" : "text-negative")}>
                    {formatPercent(vsCurrent)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

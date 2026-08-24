"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export interface WhatIfHolding {
  ticker: string;
  companyName: string;
  realShares: number;
  hypotheticalShares: number;
}

export function WhatIfPanel({
  holdings,
  onChange,
  onReset,
  isDirty,
}: {
  holdings: WhatIfHolding[];
  onChange: (ticker: string, shares: number) => void;
  onReset: () => void;
  isDirty: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Drag to simulate buying or selling — the stats and charts above update live. Your real
          positions aren&apos;t touched until you use the table below.
        </p>
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5" disabled={!isDirty} onClick={onReset}>
          <RotateCcw className="size-3.5" />
          Reset
        </Button>
      </div>
      <div className="mt-4 flex flex-col gap-4">
        {holdings.map((h) => {
          const max = Math.max(h.realShares * 3, 10);
          const changed = h.hypotheticalShares !== h.realShares;
          return (
            <div key={h.ticker}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">
                  {h.ticker} <span className="text-muted-foreground">{h.companyName}</span>
                </span>
                <span className={changed ? "num font-medium text-primary" : "num text-muted-foreground"}>
                  {h.hypotheticalShares} shares
                </span>
              </div>
              <Slider
                className="mt-2"
                value={[h.hypotheticalShares]}
                min={0}
                max={max}
                step={1}
                onValueChange={(v) => onChange(h.ticker, Array.isArray(v) ? v[0] : v)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

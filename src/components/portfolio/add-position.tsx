"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AddPosition({
  availableTickers,
  onAdd,
}: {
  availableTickers: string[];
  onAdd: (ticker: string, shares: number) => void;
}) {
  const [ticker, setTicker] = React.useState(availableTickers[0] ?? "");
  const [shares, setShares] = React.useState(10);

  React.useEffect(() => {
    if (!availableTickers.includes(ticker)) {
      setTicker(availableTickers[0] ?? "");
    }
  }, [availableTickers, ticker]);

  if (availableTickers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        All covered tickers are already in the portfolio.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="text-xs text-muted-foreground">Ticker</label>
        <Select value={ticker} onValueChange={(v) => v && setTicker(v)}>
          <SelectTrigger className="mt-1 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableTickers.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Shares</label>
        <Input
          type="number"
          min={1}
          value={shares}
          onChange={(e) => setShares(Number(e.target.value) || 0)}
          className="num mt-1 w-24"
        />
      </div>
      <Button
        className="gap-1.5"
        disabled={!ticker || shares <= 0}
        onClick={() => {
          if (ticker && shares > 0) onAdd(ticker, shares);
        }}
      >
        <Plus className="size-4" />
        Add
      </Button>
    </div>
  );
}

"use client";

import { ArrowDownRight, ArrowUpRight, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/format";

export interface HoldingRow {
  ticker: string;
  companyName: string;
  price: number;
  changePercent: number;
  shares: number;
  value: number;
  weight: number;
  beta: number;
}

export function HoldingsTable({
  rows,
  onSharesChange,
  onRemove,
}: {
  rows: HoldingRow[];
  onSharesChange: (ticker: string, shares: number) => void;
  onRemove: (ticker: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Holding</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Day change</TableHead>
            <TableHead className="text-right">Shares</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead className="text-right">Weight</TableHead>
            <TableHead className="text-right">Beta</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const isPositive = row.changePercent >= 0;
            return (
              <TableRow key={row.ticker}>
                <TableCell>
                  <span className="font-medium">{row.ticker}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{row.companyName}</span>
                </TableCell>
                <TableCell className="num text-right">{formatCurrency(row.price)}</TableCell>
                <TableCell
                  className={cn(
                    "num flex items-center justify-end gap-0.5 text-right",
                    isPositive ? "text-positive" : "text-negative"
                  )}
                >
                  {isPositive ? (
                    <ArrowUpRight className="size-3" />
                  ) : (
                    <ArrowDownRight className="size-3" />
                  )}
                  {formatPercent(row.changePercent)}
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    min={0}
                    value={row.shares}
                    onChange={(e) => onSharesChange(row.ticker, Number(e.target.value) || 0)}
                    className="num ml-auto h-7 w-20 text-right"
                  />
                </TableCell>
                <TableCell className="num text-right font-medium">
                  {formatCurrency(row.value, 0)}
                </TableCell>
                <TableCell className="num text-right">{(row.weight * 100).toFixed(1)}%</TableCell>
                <TableCell className="num text-right">{row.beta.toFixed(2)}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-negative"
                    onClick={() => onRemove(row.ticker)}
                    aria-label={`Remove ${row.ticker}`}
                  >
                    <X className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

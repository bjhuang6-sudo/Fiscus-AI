import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { QuoteSnapshot } from "@/lib/market-data";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export function MoversList({ title, quotes }: { title: string; quotes: QuoteSnapshot[] }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-2.5">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <ul className="divide-y divide-border">
        {quotes.map((q) => {
          const isPositive = q.changePercent >= 0;
          return (
            <li key={q.ticker}>
              <Link
                href={`/research/${q.ticker}`}
                className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-accent"
              >
                <div>
                  <span className="text-sm font-medium">{q.ticker}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{q.companyName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="num text-sm">${q.price.toFixed(2)}</span>
                  <span
                    className={cn(
                      "num flex w-16 items-center justify-end gap-0.5 text-xs font-medium",
                      isPositive ? "text-positive" : "text-negative"
                    )}
                  >
                    {isPositive ? (
                      <ArrowUpRight className="size-3" />
                    ) : (
                      <ArrowDownRight className="size-3" />
                    )}
                    {formatPercent(q.changePercent)}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

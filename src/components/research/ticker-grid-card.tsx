"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { QuoteSnapshot } from "@/lib/market-data";
import { cn } from "@/lib/utils";

export function TickerGridCard({ quote }: { quote: QuoteSnapshot }) {
  const isPositive = quote.changePercent >= 0;

  return (
    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
      <Link
        href={`/research/${quote.ticker}`}
        className="block rounded-lg border border-border bg-card p-3.5 transition-colors hover:border-primary/40 hover:bg-accent hover:shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{quote.ticker}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{quote.companyName}</p>
          </div>
          <div className="text-right">
            <p className="num text-sm font-semibold">${quote.price.toFixed(2)}</p>
            <div
              className={cn(
                "num mt-0.5 flex items-center justify-end gap-0.5 text-xs font-medium",
                isPositive ? "text-positive" : "text-negative"
              )}
            >
              {isPositive ? (
                <ArrowUpRight className="size-3" />
              ) : (
                <ArrowDownRight className="size-3" />
              )}
              {isPositive ? "+" : ""}
              {quote.changePercent.toFixed(2)}%
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

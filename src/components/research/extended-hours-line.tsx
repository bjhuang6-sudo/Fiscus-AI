import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { QuoteSnapshot } from "@/lib/market-data";
import { cn } from "@/lib/utils";

const TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
});

export function ExtendedHoursLine({ quote }: { quote: QuoteSnapshot }) {
  const isPre = quote.marketState === "PRE" && quote.preMarketPrice !== null;
  const isPost = (quote.marketState === "POST" || quote.marketState === "POSTPOST") && quote.postMarketPrice !== null;

  if (!isPre && !isPost) return null;

  const price = isPre ? quote.preMarketPrice! : quote.postMarketPrice!;
  const changePercent = isPre ? quote.preMarketChangePercent : quote.postMarketChangePercent;
  const time = isPre ? quote.preMarketTime : quote.postMarketTime;
  const label = isPre ? "Pre-market" : "After hours";
  const isPositive = (changePercent ?? 0) >= 0;

  return (
    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
      <span>{label}:</span>
      <span className="num font-medium text-foreground">${price.toFixed(2)}</span>
      {changePercent !== null && (
        <span className={cn("num flex items-center gap-0.5", isPositive ? "text-positive" : "text-negative")}>
          {isPositive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
          {isPositive ? "+" : ""}
          {changePercent.toFixed(2)}%
        </span>
      )}
      {time && <span>· {TIME_FORMAT.format(new Date(time))} ET</span>}
    </div>
  );
}

import { ArrowDownRight, ArrowUpRight, Minus, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NewsSource } from "@/lib/ai/news-score";

function scoreTone(score: number): "positive" | "neutral" | "negative" {
  if (score >= 65) return "positive";
  if (score >= 40) return "neutral";
  return "negative";
}

const CATEGORY_LABEL: Record<NewsSource["category"], string> = {
  company: "Company",
  sector: "Sector",
  market: "Market",
};

export function StockScoreCard({
  score,
  delta,
  summary,
  sources,
}: {
  score: number;
  delta: number;
  summary: string | null;
  sources: NewsSource[];
}) {
  const tone = scoreTone(score);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Confidence score</p>
        {delta !== 0 && (
          <span
            className={cn(
              "num flex items-center gap-0.5 text-xs font-medium",
              delta > 0 ? "text-positive" : "text-negative"
            )}
          >
            {delta > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {delta > 0 ? "+" : ""}
            {delta} today
          </span>
        )}
        {delta === 0 && (
          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
            <Minus className="size-3" />
            No change today
          </span>
        )}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span
          className={cn(
            "num text-3xl font-semibold leading-none",
            tone === "positive" && "text-positive",
            tone === "negative" && "text-negative"
          )}
        >
          {score}
        </span>
        <span className="text-sm text-muted-foreground">/ 100</span>
      </div>
      {summary && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{summary}</p>}
      {sources.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {sources.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="mt-0.5 size-3 shrink-0" />
                <span>
                  <span className="text-muted-foreground">[{CATEGORY_LABEL[s.category]}]</span> {s.headline}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[10px] text-muted-foreground/70">
        Composite of growth, profitability, balance-sheet health, and analyst sentiment — not financial advice.
      </p>
    </div>
  );
}

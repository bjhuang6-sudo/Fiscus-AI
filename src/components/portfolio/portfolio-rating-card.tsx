import { cn } from "@/lib/utils";

function scoreTone(score: number): "positive" | "neutral" | "negative" {
  if (score >= 65) return "positive";
  if (score >= 40) return "neutral";
  return "negative";
}

export interface PortfolioRating {
  portfolioScore: number;
  suggestions: string[];
}

export function PortfolioRatingCard({ rating }: { rating: PortfolioRating }) {
  const tone = scoreTone(rating.portfolioScore);

  return (
    <div>
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            "num text-3xl font-semibold leading-none",
            tone === "positive" && "text-positive",
            tone === "negative" && "text-negative"
          )}
        >
          {rating.portfolioScore}
        </span>
        <span className="text-sm text-muted-foreground">/ 100</span>
      </div>
      {rating.suggestions.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {rating.suggestions.map((s, i) => (
            <li key={i} className="flex gap-1.5 text-sm text-foreground">
              <span className="text-muted-foreground">·</span>
              {s}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          No specific improvements stand out — the book looks reasonably balanced.
        </p>
      )}
    </div>
  );
}

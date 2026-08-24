import { notFound } from "next/navigation";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PriceChart } from "@/components/finance/price-chart";
import { StatTile } from "@/components/finance/stat-tile";
import { AnalystView } from "@/components/research/analyst-view";
import { AskAboutButton } from "@/components/research/ask-about-button";
import { NewsList, FilingsList } from "@/components/research/news-filings";
import { ExtendedHoursLine } from "@/components/research/extended-hours-line";
import { StockScoreCard } from "@/components/research/stock-score-card";
import { AdviceDisclaimer } from "@/components/advice-disclaimer";
import { FadeIn } from "@/components/motion/fade-in";
import { ConfidenceBadge } from "@/components/ui/confidence-badge";
import { marketData } from "@/lib/market-data";
import { verifyQuote } from "@/lib/market-data/verify";
import { computeStockScore } from "@/lib/finance/score";
import { getNewsScoreDelta, type CategorizedNews } from "@/lib/ai/news-score";
import { formatCompactCurrency, formatCompactNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase();

  const [quote, fundamentals, profile, chartSeries, news, filings, verification, ratios] = await Promise.all([
    marketData.getQuote(ticker),
    marketData.getFundamentals(ticker),
    marketData.getCompanyProfile(ticker),
    marketData.getChartSeries(ticker, "1D"),
    marketData.getNews(ticker),
    marketData.getFilings(ticker),
    verifyQuote(ticker),
    marketData.getRatios(ticker),
  ]);

  if (!quote || !fundamentals || !profile) notFound();

  const isPositive = quote.changePercent >= 0;

  // The score can move on the stock's own news, its sector's news, or
  // broad-market news (rates, inflation, geopolitics) even with nothing
  // company-specific going on — so it's checked against all three levels,
  // not just the ticker's own headlines.
  const [sectorNews, marketNews] = await Promise.all([
    marketData.getSectorNews(profile.sector),
    marketData.getTopStories(),
  ]);
  const categorizedNews: CategorizedNews[] = [
    ...news.slice(0, 5).map((n) => ({ ...n, category: "company" as const })),
    ...sectorNews.slice(0, 3).map((n) => ({ ...n, category: "sector" as const })),
    ...marketNews.slice(0, 3).map((n) => ({ ...n, category: "market" as const })),
  ];

  const baseScore = computeStockScore({ fundamentals, ratios, currentPrice: quote.price });
  const newsDelta = await getNewsScoreDelta(ticker, categorizedNews);
  const finalScore = Math.min(Math.max(baseScore.score + newsDelta.delta, 0), 100);

  return (
    <>
      <PageHeader title={`${profile.companyName} (${ticker})`} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <FadeIn className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">
                {profile.sector} · {ticker}
              </p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
                {profile.companyName}
              </h1>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="num text-2xl font-semibold">${quote.price.toFixed(2)}</span>
                {verification && (
                  <ConfidenceBadge
                    confidence={verification.confidence}
                    sources={verification.sources}
                    note={verification.note}
                  />
                )}
                <span
                  className={cn(
                    "num flex items-center gap-0.5 text-sm font-medium",
                    isPositive ? "text-positive" : "text-negative"
                  )}
                >
                  {isPositive ? (
                    <ArrowUpRight className="size-4" />
                  ) : (
                    <ArrowDownRight className="size-4" />
                  )}
                  {isPositive ? "+" : ""}
                  {quote.change.toFixed(2)} ({isPositive ? "+" : ""}
                  {quote.changePercent.toFixed(2)}%)
                </span>
              </div>
              <ExtendedHoursLine quote={quote} />
            </div>
            <AskAboutButton ticker={ticker} companyName={profile.companyName} />
          </FadeIn>

          <FadeIn delay={0.03} className="mt-4 max-w-sm">
            <StockScoreCard score={finalScore} delta={newsDelta.delta} summary={newsDelta.summary} sources={newsDelta.sources} />
          </FadeIn>

          <FadeIn delay={0.05} className="mt-6 rounded-lg border border-border bg-card p-4">
            {chartSeries ? (
              <PriceChart ticker={ticker} initialSeries={chartSeries} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Chart data unavailable for this ticker.
              </p>
            )}
          </FadeIn>

          <FadeIn delay={0.1} className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Market cap" value={formatCompactCurrency(fundamentals.marketCap)} />
            <StatTile
              label="P/E ratio"
              value={fundamentals.peRatio ? fundamentals.peRatio.toFixed(1) : "—"}
            />
            <StatTile label="EPS" value={fundamentals.eps ? `$${fundamentals.eps.toFixed(2)}` : "—"} />
            <StatTile label="Beta" value={profile.beta !== null ? profile.beta.toFixed(2) : "—"} />
            <StatTile
              label="Gross margin"
              value={fundamentals.grossMargin ? `${(fundamentals.grossMargin * 100).toFixed(1)}%` : "—"}
            />
            <StatTile
              label="Net margin"
              value={fundamentals.netMargin ? `${(fundamentals.netMargin * 100).toFixed(1)}%` : "—"}
            />
            <StatTile
              label="Revenue growth (YoY)"
              value={fundamentals.revenueGrowth !== null ? `${(fundamentals.revenueGrowth * 100).toFixed(1)}%` : "—"}
              tone={fundamentals.revenueGrowth !== null ? (fundamentals.revenueGrowth >= 0 ? "positive" : "negative") : undefined}
            />
            <StatTile
              label="Free cash flow"
              value={fundamentals.freeCashflow !== null ? formatCompactCurrency(fundamentals.freeCashflow) : "—"}
            />
            <StatTile label="Employees" value={profile.employees ? formatCompactNumber(profile.employees) : "—"} />
            <StatTile label="Listed" value={profile.listedYear ? profile.listedYear.toString() : "—"} />
          </FadeIn>

          <FadeIn delay={0.15} className="mt-6">
            <AnalystView fundamentals={fundamentals} currentPrice={quote.price} />
          </FadeIn>

          <FadeIn delay={0.2} className="mt-6 rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">About</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {profile.description}
            </p>
            <AdviceDisclaimer className="mt-3" />
          </FadeIn>

          <FadeIn delay={0.25} className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <FilingsList items={filings} />
            <NewsList items={news} />
          </FadeIn>
        </div>
      </div>
    </>
  );
}

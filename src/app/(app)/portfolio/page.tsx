"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { Sparkles, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/finance/stat-tile";
import { HoldingsTable, type HoldingRow } from "@/components/portfolio/holdings-table";
import { AddPosition } from "@/components/portfolio/add-position";
import { PortfolioRatingCard, type PortfolioRating } from "@/components/portfolio/portfolio-rating-card";
import { SectorAllocationBar } from "@/components/portfolio/sector-allocation-bar";
import { ConcentrationBars } from "@/components/portfolio/concentration-bars";
import { WhatIfPanel } from "@/components/portfolio/what-if-panel";
import { AdviceDisclaimer } from "@/components/advice-disclaimer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/motion/fade-in";
import { usePortfolio } from "@/lib/portfolio/use-portfolio";
import { COVERED_TICKERS } from "@/lib/market-data";
import { formatCompactCurrency, formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PortfolioPositionData } from "@/app/api/market/portfolio/route";

interface EnrichedHolding extends HoldingRow {
  sector: string;
  volatility: number;
  maxDrawdown: number;
  changeDollar: number;
}

export default function PortfolioPage() {
  const { status } = useSession();
  const { holdings, loaded, addHolding, updateShares, removeHolding } = usePortfolio();
  const [enriched, setEnriched] = React.useState<EnrichedHolding[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [rating, setRating] = React.useState<PortfolioRating | null>(null);
  const [ratingPending, setRatingPending] = React.useState(false);
  const [ratingError, setRatingError] = React.useState<string | null>(null);
  const [whatIfActive, setWhatIfActive] = React.useState(false);
  const [whatIfShares, setWhatIfShares] = React.useState<Record<string, number>>({});

  // Real holdings changed (added/removed) — any hypothetical overrides could
  // now point at a ticker that no longer exists, so start the sandbox over.
  React.useEffect(() => {
    setWhatIfShares({});
    setWhatIfActive(false);
  }, [holdings]);

  React.useEffect(() => {
    if (!loaded) return;
    if (holdings.length === 0) {
      setEnriched([]);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const tickers = holdings.map((h) => h.ticker).join(",");
        const res = await fetch(`/api/market/portfolio?tickers=${encodeURIComponent(tickers)}`);
        if (!res.ok) {
          if (!cancelled) setError("Couldn't reach live market data — try again in a moment.");
          return;
        }
        const { positions }: { positions: PortfolioPositionData[] } = await res.json();
        const byTicker = new Map(positions.map((p) => [p.ticker, p]));

        const rows: EnrichedHolding[] = [];
        for (const h of holdings) {
          const p = byTicker.get(h.ticker);
          if (!p) continue;
          rows.push({
            ticker: p.ticker,
            companyName: p.companyName,
            price: p.price,
            changePercent: p.changePercent,
            changeDollar: p.changePerShare * h.shares,
            shares: h.shares,
            value: p.price * h.shares,
            weight: 0,
            beta: p.beta ?? 0,
            sector: p.sector,
            volatility: p.volatility,
            maxDrawdown: p.maxDrawdown,
          });
        }
        const totalValue = rows.reduce((sum, r) => sum + r.value, 0);
        const withWeights = rows.map((r) => ({
          ...r,
          weight: totalValue > 0 ? r.value / totalValue : 0,
        }));
        if (!cancelled) setEnriched(withWeights);
      } catch {
        if (!cancelled) setError("Couldn't reach live market data — try again in a moment.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [holdings, loaded]);

  // What-if mode re-derives shares/value/weight/changeDollar from the real,
  // already-fetched market data (price, sector, beta, …) — no new fetch
  // needed since only the share-count assumption changes.
  const displayHoldings: EnrichedHolding[] = React.useMemo(() => {
    if (!enriched) return [];
    if (!whatIfActive) return enriched;

    const withShares = enriched.map((r) => {
      const shares = whatIfShares[r.ticker] ?? r.shares;
      const changePerShare = r.shares > 0 ? r.changeDollar / r.shares : 0;
      return { ...r, shares, value: r.price * shares, changeDollar: changePerShare * shares };
    });
    const total = withShares.reduce((sum, r) => sum + r.value, 0);
    return withShares.map((r) => ({ ...r, weight: total > 0 ? r.value / total : 0 }));
  }, [enriched, whatIfActive, whatIfShares]);

  const totalValue = displayHoldings.reduce((sum, r) => sum + r.value, 0);
  const totalChangeDollar = displayHoldings.reduce((sum, r) => sum + r.changeDollar, 0);
  const previousValue = totalValue - totalChangeDollar;
  const dayChangePercent = previousValue > 0 ? (totalChangeDollar / previousValue) * 100 : 0;
  const weightedBeta = displayHoldings.reduce((sum, r) => sum + r.weight * r.beta, 0);
  const weightedVolatility = displayHoldings.reduce((sum, r) => sum + r.weight * r.volatility, 0);
  const weightedDrawdown = displayHoldings.reduce((sum, r) => sum + r.weight * r.maxDrawdown, 0);
  const isWhatIfDirty = Object.entries(whatIfShares).some(
    ([ticker, shares]) => enriched?.find((r) => r.ticker === ticker)?.shares !== shares
  );

  const availableTickers = COVERED_TICKERS.filter(
    (t) => !holdings.some((h) => h.ticker === t)
  );

  const handleRating = async () => {
    if (!enriched) return;
    setRatingPending(true);
    setRatingError(null);
    try {
      const res = await fetch("/api/portfolio/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdings: enriched.map((r) => ({ ticker: r.ticker, shares: r.shares })) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRatingError(data.error ?? "Couldn't rate the portfolio right now.");
        return;
      }
      setRating({ portfolioScore: data.portfolioScore, suggestions: data.suggestions ?? [] });
    } catch {
      setRatingError("Couldn't reach the rating service — try again.");
    } finally {
      setRatingPending(false);
    }
  };

  return (
    <>
      <PageHeader title="Portfolio & Watchlist" />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">Portfolio & Watchlist</h1>
                {whatIfActive && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                    Simulating
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Track positions, exposure, and risk — live data,{" "}
                {status === "authenticated" ? "saved to your account" : "stored locally in this browser"}.
              </p>
            </div>
            {enriched && enriched.length > 0 && (
              <Button
                variant={whatIfActive ? "default" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => setWhatIfActive((v) => !v)}
              >
                <SlidersHorizontal className="size-3.5" />
                What if?
              </Button>
            )}
          </div>

          {error ? (
            <p className="mt-6 rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              {error}
            </p>
          ) : !enriched ? (
            <div className="mt-6 space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <>
              <FadeIn className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <StatTile label="Total value" value={formatCompactCurrency(totalValue)} />
                <StatTile
                  label="Day change"
                  value={`${formatCurrency(totalChangeDollar, 0)} (${formatPercent(dayChangePercent)})`}
                  tone={totalChangeDollar >= 0 ? "positive" : "negative"}
                />
                <StatTile label="Weighted beta" value={weightedBeta.toFixed(2)} />
                <StatTile label="Ann. volatility" value={`${weightedVolatility.toFixed(1)}%`} />
                <StatTile
                  label="Max drawdown (90d)"
                  value={`${weightedDrawdown.toFixed(1)}%`}
                  tone="negative"
                />
                <StatTile label="Positions" value={String(enriched.length)} />
              </FadeIn>

              {whatIfActive && enriched.length > 0 && (
                <FadeIn className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <WhatIfPanel
                    holdings={enriched.map((r) => ({
                      ticker: r.ticker,
                      companyName: r.companyName,
                      realShares: r.shares,
                      hypotheticalShares: whatIfShares[r.ticker] ?? r.shares,
                    }))}
                    onChange={(ticker, shares) => setWhatIfShares((prev) => ({ ...prev, [ticker]: shares }))}
                    onReset={() => setWhatIfShares({})}
                    isDirty={isWhatIfDirty}
                  />
                </FadeIn>
              )}

              {displayHoldings.length > 0 && (
                <FadeIn delay={0.03} className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <h3 className="text-sm font-semibold">Sector allocation</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Part of the book in each sector.</p>
                    <div className="mt-4">
                      <SectorAllocationBar
                        sectors={Object.entries(
                          displayHoldings.reduce<Record<string, number>>((acc, r) => {
                            acc[r.sector] = (acc[r.sector] ?? 0) + r.weight;
                            return acc;
                          }, {})
                        ).map(([sector, weight]) => ({ sector, weight }))}
                      />
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <h3 className="text-sm font-semibold">Concentration</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Longer bar means more of the book riding on that name.</p>
                    <div className="mt-4">
                      <ConcentrationBars holdings={displayHoldings.map((r) => ({ ticker: r.ticker, weight: r.weight }))} />
                    </div>
                  </div>
                </FadeIn>
              )}

              <FadeIn delay={0.05} className="mt-6">
                {enriched.length > 0 ? (
                  <HoldingsTable
                    rows={enriched}
                    onSharesChange={updateShares}
                    onRemove={removeHolding}
                  />
                ) : (
                  <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                    No positions yet — add one below.
                  </p>
                )}
              </FadeIn>

              <FadeIn delay={0.1} className="mt-6 rounded-lg border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold">Add position</h3>
                <AddPosition availableTickers={availableTickers} onAdd={addHolding} />
              </FadeIn>

              <FadeIn delay={0.15} className="mt-6 rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">Portfolio rating</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={enriched.length === 0 || ratingPending}
                    onClick={handleRating}
                  >
                    <Sparkles className="size-3.5" />
                    {ratingPending ? "Rating…" : rating ? "Re-rate" : "Rate my portfolio"}
                  </Button>
                </div>
                {ratingError && <p className="mt-3 text-sm text-destructive">{ratingError}</p>}
                {rating && (
                  <div className="mt-3">
                    <PortfolioRatingCard rating={rating} />
                    <AdviceDisclaimer className="mt-3" />
                  </div>
                )}
              </FadeIn>
            </>
          )}
        </div>
      </div>
    </>
  );
}

"use client";

import * as React from "react";
import { PageHeader } from "@/components/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DcfCalculator } from "@/components/valuation/dcf-calculator";
import { LboCalculator } from "@/components/valuation/lbo-calculator";
import { CompsTable } from "@/components/valuation/comps-table";
import { StatementViewer } from "@/components/valuation/statement-viewer";
import { RatioDashboard } from "@/components/valuation/ratio-dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/motion/fade-in";
import { COVERED_TICKERS } from "@/lib/market-data";
import type {
  ComparableCompany,
  CompanyFundamentals,
  FinancialStatements,
  QuoteSnapshot,
  RatioSet,
} from "@/lib/market-data";

const EQUITY_TICKERS = COVERED_TICKERS.filter((t) => t !== "SPY");

interface ValuationData {
  quote: QuoteSnapshot;
  fundamentals: CompanyFundamentals;
  statements: FinancialStatements | null;
  ratios: RatioSet | null;
  comps: ComparableCompany[];
  peerAverage: RatioSet | null;
}

export default function ValuationPage() {
  const [ticker, setTicker] = React.useState(EQUITY_TICKERS[0]);
  const [data, setData] = React.useState<ValuationData | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);

    (async () => {
      try {
        const res = await fetch(`/api/market/valuation?ticker=${encodeURIComponent(ticker)}`);
        if (!res.ok) {
          if (!cancelled) setError("No live data available for this ticker right now.");
          return;
        }
        const json: ValuationData = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError("Couldn't reach live market data — try again in a moment.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ticker]);

  const subjectComp: ComparableCompany | null = data
    ? {
        ticker: data.quote.ticker,
        companyName: data.quote.companyName,
        marketCap: data.fundamentals.marketCap,
        peRatio: data.fundamentals.peRatio,
        evToRevenue: data.fundamentals.revenueTtm
          ? Number((data.fundamentals.marketCap / data.fundamentals.revenueTtm).toFixed(1))
          : null,
        evToEbitda:
          data.fundamentals.revenueTtm && data.fundamentals.netMargin
            ? Number(
                (
                  data.fundamentals.marketCap /
                  (data.fundamentals.revenueTtm * data.fundamentals.netMargin * 1.3)
                ).toFixed(1)
              )
            : null,
        grossMargin: data.fundamentals.grossMargin,
        netMargin: data.fundamentals.netMargin,
      }
    : null;

  return (
    <>
      <PageHeader title="Valuation & Modeling" />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Valuation & Modeling</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                DCF, comparable companies, statements, and ratio analysis — live data.
              </p>
            </div>
            <Select value={ticker} onValueChange={(v) => v && setTicker(v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EQUITY_TICKERS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-6">
            {error ? (
              <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                {error}
              </p>
            ) : !data ? (
              <div className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            ) : (
              <FadeIn key={ticker}>
                <Tabs defaultValue="dcf">
                  <TabsList>
                    <TabsTrigger value="dcf">DCF</TabsTrigger>
                    <TabsTrigger value="lbo">LBO</TabsTrigger>
                    <TabsTrigger value="comps">Comps</TabsTrigger>
                    <TabsTrigger value="financials">Financials</TabsTrigger>
                    <TabsTrigger value="ratios">Ratios</TabsTrigger>
                  </TabsList>

                  <TabsContent value="dcf" className="mt-4">
                    <DcfCalculator quote={data.quote} fundamentals={data.fundamentals} />
                  </TabsContent>

                  <TabsContent value="lbo" className="mt-4">
                    <LboCalculator quote={data.quote} fundamentals={data.fundamentals} />
                  </TabsContent>

                  <TabsContent value="comps" className="mt-4">
                    {subjectComp && <CompsTable subject={subjectComp} peers={data.comps} />}
                  </TabsContent>

                  <TabsContent value="financials" className="mt-4">
                    {data.statements ? (
                      <StatementViewer statements={data.statements} />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No statement data available for this ticker.
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="ratios" className="mt-4">
                    {data.ratios ? (
                      <RatioDashboard subject={data.ratios} peerAverage={data.peerAverage} />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No ratio data available for this ticker.
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </FadeIn>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

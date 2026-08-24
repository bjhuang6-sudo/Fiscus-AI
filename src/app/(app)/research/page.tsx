import { PageHeader } from "@/components/page-header";
import { TickerSearch } from "@/components/research/ticker-search";
import { TickerGridCard } from "@/components/research/ticker-grid-card";
import { marketData, COVERED_TICKERS } from "@/lib/market-data";

export default async function ResearchPage() {
  const quotes = await Promise.all(COVERED_TICKERS.map((t) => marketData.getQuote(t)));
  const validQuotes = quotes.filter((q): q is NonNullable<typeof q> => q !== null);

  return (
    <>
      <PageHeader title="Company Research" />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <h1 className="text-xl font-semibold tracking-tight">Company Research</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search any ticker for a full overview — price, fundamentals, filings, and news.
          </p>
          <div className="mt-5">
            <TickerSearch />
          </div>

          <p className="mt-8 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Covered tickers
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {validQuotes.map((q) => (
              <TickerGridCard key={q.ticker} quote={q} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

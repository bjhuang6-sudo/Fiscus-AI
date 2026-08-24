import type { MarketDataProvider } from "../provider";
import type {
  BalanceSheetYear,
  CashFlowYear,
  ChartRange,
  ChartSeries,
  ComparableCompany,
  CompanyFundamentals,
  CompanyProfile,
  Filing,
  FinancialStatements,
  IncomeStatementYear,
  MacroIndicator,
  MarketOverview,
  MarketState,
  NewsItem,
  PricePoint,
  QuoteSnapshot,
  RatioSet,
} from "../types";
import {
  fetchChart,
  fetchNewsForSymbol,
  fetchQuoteSummary,
  fetchRecommendedSymbols,
  fetchScreener,
  fetchSearchQuotes,
} from "./http";
import { extractAnnualSeries, fetchCompanyFacts, fetchRecentFilings, getCik } from "./sec";

const CHART_RANGE_CONFIG: Record<ChartRange, { range: string; interval: string }> = {
  "1D": { range: "1d", interval: "5m" },
  "5D": { range: "5d", interval: "15m" },
  "1M": { range: "1mo", interval: "1d" },
  "6M": { range: "6mo", interval: "1d" },
  "1Y": { range: "1y", interval: "1d" },
  "5Y": { range: "5y", interval: "1wk" },
  ALL: { range: "max", interval: "1mo" },
};

function rangeForDays(days: number): string {
  if (days <= 5) return "5d";
  if (days <= 30) return "1mo";
  if (days <= 90) return "3mo";
  if (days <= 180) return "6mo";
  if (days <= 365) return "1y";
  return "5y";
}

function raw(value: unknown): number | null {
  if (value && typeof value === "object" && "raw" in value) {
    const v = (value as { raw: unknown }).raw;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  }
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Yahoo sometimes reports debt/equity as a percentage (e.g. 154.5 meaning 1.545x). */
function normalizeDebtToEquity(value: number | null): number | null {
  if (value === null) return null;
  return value > 10 ? value / 100 : value;
}

const SECTOR_ETFS: { symbol: string; sector: string }[] = [
  { symbol: "XLK", sector: "Technology" },
  { symbol: "XLF", sector: "Financials" },
  { symbol: "XLE", sector: "Energy" },
  { symbol: "XLV", sector: "Healthcare" },
  { symbol: "XLY", sector: "Consumer Discretionary" },
  { symbol: "XLP", sector: "Consumer Staples" },
  { symbol: "XLI", sector: "Industrials" },
  { symbol: "XLB", sector: "Materials" },
  { symbol: "XLRE", sector: "Real Estate" },
  { symbol: "XLU", sector: "Utilities" },
  { symbol: "XLC", sector: "Communication Services" },
];

const INDICES: { symbol: string; name: string }[] = [
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^IXIC", name: "Nasdaq Composite" },
  { symbol: "^DJI", name: "Dow Jones Industrial" },
  { symbol: "^RUT", name: "Russell 2000" },
];

const CRYPTO: { symbol: string; name: string }[] = [
  { symbol: "BTC-USD", name: "Bitcoin" },
  { symbol: "ETH-USD", name: "Ethereum" },
  { symbol: "SOL-USD", name: "Solana" },
  { symbol: "XRP-USD", name: "XRP" },
];

function normalizeMarketState(value: unknown): MarketState | null {
  return value === "PRE" || value === "REGULAR" || value === "POST" || value === "POSTPOST" || value === "CLOSED"
    ? value
    : null;
}

function epochToIso(seconds: unknown): string | null {
  return typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toNewsItem(n: any): NewsItem {
  return {
    id: n.uuid,
    headline: n.title,
    source: n.publisher ?? "Unknown",
    publishedAt: new Date((n.providerPublishTime ?? 0) * 1000).toISOString(),
    url: n.link,
  };
}

/**
 * Yahoo's meta.chartPreviousClose is only reliable for short ranges — at
 * range=1mo (or longer) it silently returns the close from BEFORE the whole
 * window (e.g. ~a month ago) instead of yesterday's close, which was
 * corrupting every day-change % in the app. For daily-bar data, the actual
 * previous close is unambiguous: it's the second-to-last close in the
 * series (the last close is today's live/latest bar). Always prefer that
 * over the meta field when there's enough history to compute it.
 */
function previousCloseFromDailySeries(
  closes: (number | null)[],
  fallback: number | null
): number | null {
  const valid = closes.filter((c): c is number => typeof c === "number");
  if (valid.length >= 2) return valid[valid.length - 2];
  return fallback;
}

export class YahooMarketDataProvider implements MarketDataProvider {
  async getQuote(rawTicker: string): Promise<QuoteSnapshot | null> {
    const ticker = rawTicker.toUpperCase().trim();
    const result = await fetchChart(ticker, "1mo", "1d");
    const meta = result?.meta;
    if (!meta || typeof meta.regularMarketPrice !== "number") return null;

    const price = meta.regularMarketPrice;
    const rawCloses: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
    const previousClose =
      previousCloseFromDailySeries(rawCloses, meta.chartPreviousClose ?? meta.previousClose ?? null) ?? price;
    const change = price - previousClose;
    const changePercent = previousClose ? (change / previousClose) * 100 : 0;

    const closes: number[] = rawCloses.filter((c): c is number => typeof c === "number");

    return {
      ticker,
      companyName: meta.longName ?? meta.shortName ?? ticker,
      price,
      change,
      changePercent,
      currency: meta.currency ?? "USD",
      sparkline: closes.slice(-24),
      marketState: normalizeMarketState(meta.marketState),
      preMarketPrice: raw(meta.preMarketPrice),
      preMarketChangePercent: raw(meta.preMarketChangePercent),
      preMarketTime: epochToIso(meta.preMarketTime),
      postMarketPrice: raw(meta.postMarketPrice),
      postMarketChangePercent: raw(meta.postMarketChangePercent),
      postMarketTime: epochToIso(meta.postMarketTime),
    };
  }

  async getHistoricalPrices(rawTicker: string, days: number): Promise<PricePoint[]> {
    const ticker = rawTicker.toUpperCase().trim();
    const result = await fetchChart(ticker, rangeForDays(days), "1d");
    if (!result?.timestamp) return [];

    const timestamps: number[] = result.timestamp;
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];

    const points: PricePoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (typeof closes[i] !== "number") continue;
      points.push({
        date: new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
        close: closes[i] as number,
      });
    }
    return points.slice(-days);
  }

  async getChartSeries(rawTicker: string, chartRange: ChartRange): Promise<ChartSeries | null> {
    const ticker = rawTicker.toUpperCase().trim();
    const { range, interval } = CHART_RANGE_CONFIG[chartRange];
    const result = await fetchChart(ticker, range, interval, 15);
    if (!result?.timestamp) return null;

    const timestamps: number[] = result.timestamp;
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];

    const points: PricePoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (typeof closes[i] !== "number") continue;
      points.push({
        date: new Date(timestamps[i] * 1000).toISOString(),
        close: closes[i] as number,
      });
    }
    if (points.length === 0) return null;

    const lastClose = points[points.length - 1].close;
    let change: number;
    let changePercent: number;

    if (chartRange === "1D") {
      const prevClose = result.meta?.chartPreviousClose ?? points[0].close;
      change = lastClose - prevClose;
      changePercent = prevClose ? (change / prevClose) * 100 : 0;
    } else {
      const firstClose = points[0].close;
      change = lastClose - firstClose;
      changePercent = firstClose ? (change / firstClose) * 100 : 0;
    }

    return { points, change, changePercent };
  }

  async getFundamentals(rawTicker: string): Promise<CompanyFundamentals | null> {
    const ticker = rawTicker.toUpperCase().trim();
    const summary = await fetchQuoteSummary(ticker, [
      "price",
      "summaryDetail",
      "defaultKeyStatistics",
      "financialData",
      "assetProfile",
    ]);
    if (!summary) return null;

    const marketCap = raw(summary.price?.marketCap) ?? raw(summary.summaryDetail?.marketCap);
    if (marketCap === null) return null;

    return {
      ticker,
      companyName: summary.price?.longName ?? summary.price?.shortName ?? ticker,
      marketCap,
      peRatio: raw(summary.summaryDetail?.trailingPE),
      eps: raw(summary.defaultKeyStatistics?.trailingEps),
      grossMargin: raw(summary.financialData?.grossMargins),
      netMargin: raw(summary.financialData?.profitMargins),
      revenueTtm: raw(summary.financialData?.totalRevenue) ?? 0,
      sector: summary.assetProfile?.sector ?? "Diversified",
      freeCashflow: raw(summary.financialData?.freeCashflow),
      revenueGrowth: raw(summary.financialData?.revenueGrowth),
      totalCash: raw(summary.financialData?.totalCash),
      totalDebt: raw(summary.financialData?.totalDebt),
      sharesOutstanding: raw(summary.defaultKeyStatistics?.sharesOutstanding),
      analystTargetMean: raw(summary.financialData?.targetMeanPrice),
      analystTargetLow: raw(summary.financialData?.targetLowPrice),
      analystTargetHigh: raw(summary.financialData?.targetHighPrice),
      analystRecommendation: summary.financialData?.recommendationKey ?? null,
      analystCount: raw(summary.financialData?.numberOfAnalystOpinions),
    };
  }

  async searchTickers(query: string): Promise<{ ticker: string; companyName: string }[]> {
    if (!query.trim()) return [];
    const quotes = await fetchSearchQuotes(query, 8);
    return quotes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((q: any) => q.quoteType === "EQUITY" || q.quoteType === "ETF")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((q: any) => ({
        ticker: q.symbol,
        companyName: q.longname ?? q.shortname ?? q.symbol,
      }));
  }

  async getCompanyProfile(rawTicker: string): Promise<CompanyProfile | null> {
    const ticker = rawTicker.toUpperCase().trim();
    const [summary, chart] = await Promise.all([
      fetchQuoteSummary(ticker, ["assetProfile", "defaultKeyStatistics", "price"]),
      fetchChart(ticker, "5d", "1d"),
    ]);
    if (!summary?.assetProfile && !summary?.price) return null;

    const firstTradeDate: number | null = chart?.meta?.firstTradeDate ?? null;

    return {
      ticker,
      companyName: summary.price?.longName ?? summary.price?.shortName ?? ticker,
      sector: summary.assetProfile?.sector ?? "Diversified",
      description: summary.assetProfile?.longBusinessSummary ?? "No business summary available.",
      employees: summary.assetProfile?.fullTimeEmployees ?? null,
      listedYear: firstTradeDate ? new Date(firstTradeDate * 1000).getUTCFullYear() : null,
      beta: raw(summary.defaultKeyStatistics?.beta),
    };
  }

  async getNews(rawTicker: string): Promise<NewsItem[]> {
    const ticker = rawTicker.toUpperCase().trim();
    const news = await fetchNewsForSymbol(ticker, 6);
    return news.map(toNewsItem);
  }

  async getSectorNews(sector: string): Promise<NewsItem[]> {
    const etf = SECTOR_ETFS.find((s) => s.sector === sector)?.symbol;
    if (!etf) return [];
    const news = await fetchNewsForSymbol(etf, 5);
    return news.map(toNewsItem);
  }

  async getTopStories(): Promise<NewsItem[]> {
    // Pooling news for the three major indices surfaces the stories that
    // actually move the broad market, rather than one index's idiosyncratic
    // coverage — dedupe by uuid since the same story often shows up under
    // more than one of them.
    const results = await Promise.all(INDICES.slice(0, 3).map((idx) => fetchNewsForSymbol(idx.symbol, 10)));
    const seen = new Set<string>();
    const deduped = results.flat().filter((n) => {
      if (seen.has(n.uuid)) return false;
      seen.add(n.uuid);
      return true;
    });
    deduped.sort((a, b) => (b.providerPublishTime ?? 0) - (a.providerPublishTime ?? 0));
    return deduped.slice(0, 8).map(toNewsItem);
  }

  async getFilings(rawTicker: string): Promise<Filing[]> {
    const ticker = rawTicker.toUpperCase().trim();
    const cik = await getCik(ticker);
    if (!cik) return [];
    const entries = await fetchRecentFilings(cik);
    const cikNumeric = String(Number(cik));

    return entries
      .filter((e) => e.form === "10-K" || e.form === "10-Q" || e.form === "8-K")
      .slice(0, 6)
      .map((e) => ({
        id: e.accessionNumber,
        type: e.form,
        filedAt: e.filingDate,
        description: e.primaryDocDescription || `${e.form} filing`,
        url: `https://www.sec.gov/Archives/edgar/data/${cikNumeric}/${e.accessionNumber.replace(/-/g, "")}/${e.primaryDocument}`,
      }));
  }

  async getFinancialStatements(rawTicker: string): Promise<FinancialStatements | null> {
    const ticker = rawTicker.toUpperCase().trim();
    const cik = await getCik(ticker);
    if (!cik) return null;
    const facts = await fetchCompanyFacts(cik);
    if (!facts) return null;

    const revenue = extractAnnualSeries(facts, [
      "RevenueFromContractWithCustomerExcludingAssessedTax",
      "Revenues",
      "SalesRevenueNet",
    ]);
    if (revenue.length === 0) return null;

    const costOfRevenue = extractAnnualSeries(facts, ["CostOfGoodsAndServicesSold", "CostOfRevenue", "CostOfGoodsSold"]);
    const grossProfit = extractAnnualSeries(facts, ["GrossProfit"]);
    const operatingIncome = extractAnnualSeries(facts, ["OperatingIncomeLoss"]);
    const netIncome = extractAnnualSeries(facts, ["NetIncomeLoss", "ProfitLoss"]);
    const totalAssets = extractAnnualSeries(facts, ["Assets"]);
    const totalLiabilities = extractAnnualSeries(facts, ["Liabilities"]);
    const totalEquity = extractAnnualSeries(facts, [
      "StockholdersEquity",
      "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
    ]);
    const cash = extractAnnualSeries(facts, [
      "CashAndCashEquivalentsAtCarryingValue",
      "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
    ]);
    const currentAssets = extractAnnualSeries(facts, ["AssetsCurrent"]);
    const currentLiabilities = extractAnnualSeries(facts, ["LiabilitiesCurrent"]);
    const longTermDebt = extractAnnualSeries(facts, ["LongTermDebtNoncurrent", "LongTermDebt"]);
    const operatingCashFlow = extractAnnualSeries(facts, ["NetCashProvidedByUsedInOperatingActivities"]);
    const capex = extractAnnualSeries(facts, ["PaymentsToAcquirePropertyPlantAndEquipment"]);
    const financingCashFlow = extractAnnualSeries(facts, ["NetCashProvidedByUsedInFinancingActivities"]);

    const lookup = (series: { end: string; val: number }[]) => new Map(series.map((f) => [f.end, f.val]));
    const cor = lookup(costOfRevenue);
    const gp = lookup(grossProfit);
    const oi = lookup(operatingIncome);
    const ni = lookup(netIncome);
    const ta = lookup(totalAssets);
    const tl = lookup(totalLiabilities);
    const te = lookup(totalEquity);
    const ce = lookup(cash);
    const ca = lookup(currentAssets);
    const cl = lookup(currentLiabilities);
    const ltd = lookup(longTermDebt);
    const ocf = lookup(operatingCashFlow);
    const cpx = lookup(capex);
    const fcf = lookup(financingCashFlow);

    const incomeStatement: IncomeStatementYear[] = revenue.map((r) => ({
      fiscalYear: Number(r.end.slice(0, 4)),
      revenue: r.val,
      costOfRevenue: cor.get(r.end) ?? null,
      grossProfit: gp.get(r.end) ?? null,
      operatingExpenses:
        gp.has(r.end) && oi.has(r.end) ? (gp.get(r.end) as number) - (oi.get(r.end) as number) : null,
      operatingIncome: oi.get(r.end) ?? null,
      netIncome: ni.get(r.end) ?? null,
    }));

    const balanceSheet: BalanceSheetYear[] = revenue.map((r) => ({
      fiscalYear: Number(r.end.slice(0, 4)),
      totalAssets: ta.get(r.end) ?? null,
      totalLiabilities: tl.get(r.end) ?? null,
      totalEquity: te.get(r.end) ?? null,
      cashAndEquivalents: ce.get(r.end) ?? null,
      totalDebt: ltd.get(r.end) ?? null,
      currentAssets: ca.get(r.end) ?? null,
      currentLiabilities: cl.get(r.end) ?? null,
    }));

    const cashFlow: CashFlowYear[] = revenue.map((r) => ({
      fiscalYear: Number(r.end.slice(0, 4)),
      operatingCashFlow: ocf.get(r.end) ?? null,
      capitalExpenditures: cpx.has(r.end) ? -(cpx.get(r.end) as number) : null,
      freeCashFlow:
        ocf.has(r.end) && cpx.has(r.end) ? (ocf.get(r.end) as number) - (cpx.get(r.end) as number) : null,
      financingCashFlow: fcf.get(r.end) ?? null,
    }));

    return { ticker, incomeStatement, balanceSheet, cashFlow };
  }

  async getRatios(rawTicker: string): Promise<RatioSet | null> {
    const ticker = rawTicker.toUpperCase().trim();
    const summary = await fetchQuoteSummary(ticker, ["financialData"]);
    const fd = summary?.financialData;
    if (!fd) return null;

    return {
      ticker,
      currentRatio: raw(fd.currentRatio),
      quickRatio: raw(fd.quickRatio),
      debtToEquity: normalizeDebtToEquity(raw(fd.debtToEquity)),
      returnOnEquity: raw(fd.returnOnEquity),
      returnOnAssets: raw(fd.returnOnAssets),
      grossMargin: raw(fd.grossMargins),
      netMargin: raw(fd.profitMargins),
    };
  }

  async getComparables(rawTicker: string): Promise<ComparableCompany[]> {
    const ticker = rawTicker.toUpperCase().trim();
    const peers = (await fetchRecommendedSymbols(ticker)).slice(0, 5);

    const results = await Promise.all(
      peers.map(async (peer) => {
        const summary = await fetchQuoteSummary(peer, [
          "price",
          "summaryDetail",
          "defaultKeyStatistics",
          "financialData",
        ]);
        if (!summary) return null;
        const marketCap = raw(summary.price?.marketCap);
        if (marketCap === null) return null;
        return {
          ticker: peer,
          companyName: summary.price?.longName ?? summary.price?.shortName ?? peer,
          marketCap,
          peRatio: raw(summary.summaryDetail?.trailingPE),
          evToRevenue: raw(summary.defaultKeyStatistics?.enterpriseToRevenue),
          evToEbitda: raw(summary.defaultKeyStatistics?.enterpriseToEbitda),
          grossMargin: raw(summary.financialData?.grossMargins),
          netMargin: raw(summary.financialData?.profitMargins),
        } satisfies ComparableCompany;
      })
    );

    return results.filter((r): r is ComparableCompany => r !== null);
  }

  async getMarketOverview(): Promise<MarketOverview> {
    const [indexResults, sectorResults, cryptoResults, gainers, losers, tnx, vix, dxy, wti] = await Promise.all([
      // 1d/5m intraday bars — the exact same range+interval as the "1D" chart
      // on a ticker's own Research page, so the sparkline here isn't a
      // different (monthly) shape than what "today's chart" actually shows.
      Promise.all(INDICES.map((idx) => fetchChart(idx.symbol, "1d", "5m"))),
      Promise.all(SECTOR_ETFS.map((s) => fetchChart(s.symbol, "5d", "1d"))),
      Promise.all(CRYPTO.map((c) => fetchChart(c.symbol, "1d", "5m"))),
      fetchScreener("day_gainers", 6),
      fetchScreener("day_losers", 6),
      fetchChart("^TNX", "5d", "1d"),
      fetchChart("^VIX", "5d", "1d"),
      fetchChart("DX-Y.NYB", "5d", "1d"),
      fetchChart("CL=F", "5d", "1d"),
    ]);

    const indices = INDICES.map((idx, i) => {
      const meta = indexResults[i]?.meta;
      const rawCloses: (number | null)[] = indexResults[i]?.indicators?.quote?.[0]?.close ?? [];
      const closes = rawCloses.filter((c): c is number => typeof c === "number");
      const price = meta?.regularMarketPrice ?? 0;
      // chartPreviousClose is reliable at 1d range (see fetchChart's own
      // caveat about longer ranges) — no need for the daily-bar fallback.
      const prevClose = meta?.chartPreviousClose ?? price;
      return {
        symbol: idx.symbol,
        name: idx.name,
        value: price,
        changePercent: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
        sparkline: closes.slice(-150),
      };
    }).filter((idx) => idx.value > 0);

    const sectors = SECTOR_ETFS.map((s, i) => {
      const meta = sectorResults[i]?.meta;
      const rawCloses: (number | null)[] = sectorResults[i]?.indicators?.quote?.[0]?.close ?? [];
      const price = meta?.regularMarketPrice;
      const prevClose = previousCloseFromDailySeries(rawCloses, meta?.chartPreviousClose ?? null);
      if (typeof price !== "number" || typeof prevClose !== "number" || !prevClose) return null;
      return { sector: s.sector, changePercent: ((price - prevClose) / prevClose) * 100 };
    })
      .filter((s): s is { sector: string; changePercent: number } => s !== null)
      .sort((a, b) => b.changePercent - a.changePercent);

    const macro: MacroIndicator[] = [];
    const macroPoint = (
      result: Awaited<ReturnType<typeof fetchChart>>,
      label: string,
      formatValue: (price: number) => string
    ) => {
      const meta = result?.meta;
      const rawCloses: (number | null)[] = result?.indicators?.quote?.[0]?.close ?? [];
      const price = meta?.regularMarketPrice;
      const prevClose = previousCloseFromDailySeries(rawCloses, meta?.chartPreviousClose ?? null);
      if (typeof price !== "number") return;
      const changePercent = typeof prevClose === "number" && prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
      macro.push({ label, value: formatValue(price), changePercent });
    };
    macroPoint(tnx, "10-Year Treasury Yield", (p) => `${p.toFixed(2)}%`);
    macroPoint(vix, "VIX (Volatility Index)", (p) => p.toFixed(2));
    macroPoint(dxy, "US Dollar Index (DXY)", (p) => p.toFixed(2));
    macroPoint(wti, "WTI Crude Oil", (p) => `$${p.toFixed(2)}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toQuote = (q: any): QuoteSnapshot => ({
      ticker: q.symbol,
      companyName: q.shortName ?? q.symbol,
      price: q.regularMarketPrice ?? 0,
      change: q.regularMarketChange ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
      currency: q.currency ?? "USD",
      sparkline: [],
      marketState: normalizeMarketState(q.marketState),
      preMarketPrice: raw(q.preMarketPrice),
      preMarketChangePercent: raw(q.preMarketChangePercent),
      preMarketTime: epochToIso(q.preMarketTime),
      postMarketPrice: raw(q.postMarketPrice),
      postMarketChangePercent: raw(q.postMarketChangePercent),
      postMarketTime: epochToIso(q.postMarketTime),
    });

    const crypto = CRYPTO.map((c, i) => {
      const meta = cryptoResults[i]?.meta;
      const rawCloses: (number | null)[] = cryptoResults[i]?.indicators?.quote?.[0]?.close ?? [];
      const closes = rawCloses.filter((v): v is number => typeof v === "number");
      const price = meta?.regularMarketPrice ?? 0;
      const prevClose = meta?.chartPreviousClose ?? price;
      return {
        symbol: c.symbol,
        name: c.name,
        value: price,
        changePercent: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
        sparkline: closes.slice(-150),
      };
    }).filter((c) => c.value > 0);

    return {
      indices,
      sectors,
      macro,
      gainers: gainers.map(toQuote),
      losers: losers.map(toQuote),
      crypto,
    };
  }
}

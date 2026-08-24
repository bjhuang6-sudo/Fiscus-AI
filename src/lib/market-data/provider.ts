import type {
  ChartRange,
  ChartSeries,
  ComparableCompany,
  CompanyFundamentals,
  CompanyProfile,
  Filing,
  FinancialStatements,
  MarketOverview,
  NewsItem,
  PricePoint,
  QuoteSnapshot,
  RatioSet,
} from "./types";

/**
 * Swap the concrete implementation (see `index.ts`) to point the app at a
 * real market data API without touching any caller.
 */
export interface MarketDataProvider {
  getQuote(ticker: string): Promise<QuoteSnapshot | null>;
  getHistoricalPrices(ticker: string, days: number): Promise<PricePoint[]>;
  getChartSeries(ticker: string, range: ChartRange): Promise<ChartSeries | null>;
  getFundamentals(ticker: string): Promise<CompanyFundamentals | null>;
  searchTickers(query: string): Promise<{ ticker: string; companyName: string }[]>;
  getCompanyProfile(ticker: string): Promise<CompanyProfile | null>;
  getNews(ticker: string): Promise<NewsItem[]>;
  getSectorNews(sector: string): Promise<NewsItem[]>;
  getTopStories(): Promise<NewsItem[]>;
  getFilings(ticker: string): Promise<Filing[]>;
  getFinancialStatements(ticker: string): Promise<FinancialStatements | null>;
  getRatios(ticker: string): Promise<RatioSet | null>;
  getComparables(ticker: string): Promise<ComparableCompany[]>;
  getMarketOverview(): Promise<MarketOverview>;
}

import { YahooMarketDataProvider } from "./yahoo/provider";
import type { MarketDataProvider } from "./provider";

// Live data from Yahoo Finance (unofficial endpoints) + SEC EDGAR for filings and
// financial statement facts. Every caller depends only on the MarketDataProvider
// interface, so a different implementation can be swapped in without touching callers.
export const marketData: MarketDataProvider = new YahooMarketDataProvider();

// A curated set of well-known tickers used to seed grid views and pickers
// (Research, Portfolio "add position", Markets). Any other real ticker can
// still be looked up directly via search or its /research/[ticker] URL.
export const COVERED_TICKERS = [
  "AAPL",
  "MSFT",
  "NVDA",
  "TSLA",
  "GOOGL",
  "AMZN",
  "META",
  "JPM",
  "XOM",
  "JNJ",
  "WMT",
  "SPY",
];

export type { MarketDataProvider } from "./provider";
export type {
  CashFlowYear,
  ChartRange,
  ChartSeries,
  ComparableCompany,
  CompanyFundamentals,
  CompanyProfile,
  Filing,
  FinancialStatements,
  IncomeStatementYear,
  BalanceSheetYear,
  IndexQuote,
  MacroIndicator,
  MarketOverview,
  NewsItem,
  PricePoint,
  QuoteSnapshot,
  RatioSet,
  SectorPerformance,
} from "./types";

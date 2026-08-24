export interface PricePoint {
  date: string;
  close: number;
}

export type ChartRange = "1D" | "5D" | "1M" | "6M" | "1Y" | "5Y" | "ALL";

export interface ChartSeries {
  points: PricePoint[];
  change: number;
  changePercent: number;
}

export interface CompanyFundamentals {
  ticker: string;
  companyName: string;
  marketCap: number;
  peRatio: number | null;
  eps: number | null;
  grossMargin: number | null;
  netMargin: number | null;
  revenueTtm: number;
  sector: string;
  /** Trailing twelve-month free cash flow, as reported by the data provider — not derived. */
  freeCashflow: number | null;
  /** Most recent reported YoY revenue growth rate (fraction, e.g. 0.12 = 12%). */
  revenueGrowth: number | null;
  totalCash: number | null;
  totalDebt: number | null;
  sharesOutstanding: number | null;
  analystTargetMean: number | null;
  analystTargetLow: number | null;
  analystTargetHigh: number | null;
  analystRecommendation: string | null;
  analystCount: number | null;
}

/** Yahoo's own session-state enum: pre-market, regular hours, after-hours, or closed. */
export type MarketState = "PRE" | "REGULAR" | "POST" | "POSTPOST" | "CLOSED";

export interface QuoteSnapshot {
  ticker: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  sparkline: number[];
  marketState: MarketState | null;
  /** Populated only while marketState is "PRE" — the live pre-market trade. */
  preMarketPrice: number | null;
  preMarketChangePercent: number | null;
  preMarketTime: string | null;
  /** Populated once regular hours end (marketState "POST"/"POSTPOST") — the live after-hours trade. */
  postMarketPrice: number | null;
  postMarketChangePercent: number | null;
  postMarketTime: string | null;
}

export interface CompanyProfile {
  ticker: string;
  companyName: string;
  sector: string;
  description: string;
  employees: number | null;
  listedYear: number | null;
  beta: number | null;
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  publishedAt: string;
  url: string;
}

export interface Filing {
  id: string;
  type: "10-K" | "10-Q" | "8-K" | string;
  filedAt: string;
  description: string;
  url: string;
}

export interface IncomeStatementYear {
  fiscalYear: number;
  revenue: number | null;
  costOfRevenue: number | null;
  grossProfit: number | null;
  operatingExpenses: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
}

export interface BalanceSheetYear {
  fiscalYear: number;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  cashAndEquivalents: number | null;
  totalDebt: number | null;
  currentAssets: number | null;
  currentLiabilities: number | null;
}

export interface CashFlowYear {
  fiscalYear: number;
  operatingCashFlow: number | null;
  capitalExpenditures: number | null;
  freeCashFlow: number | null;
  financingCashFlow: number | null;
}

export interface FinancialStatements {
  ticker: string;
  incomeStatement: IncomeStatementYear[];
  balanceSheet: BalanceSheetYear[];
  cashFlow: CashFlowYear[];
}

export interface RatioSet {
  ticker: string;
  currentRatio: number | null;
  quickRatio: number | null;
  debtToEquity: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  grossMargin: number | null;
  netMargin: number | null;
}

export interface ComparableCompany {
  ticker: string;
  companyName: string;
  marketCap: number;
  peRatio: number | null;
  evToRevenue: number | null;
  evToEbitda: number | null;
  grossMargin: number | null;
  netMargin: number | null;
}

export interface IndexQuote {
  symbol: string;
  name: string;
  value: number;
  changePercent: number;
  sparkline: number[];
}

export interface SectorPerformance {
  sector: string;
  changePercent: number;
}

export interface MacroIndicator {
  label: string;
  value: string;
  changePercent: number;
}

export interface MarketOverview {
  indices: IndexQuote[];
  sectors: SectorPerformance[];
  macro: MacroIndicator[];
  gainers: QuoteSnapshot[];
  losers: QuoteSnapshot[];
  /** Crypto trades 24/7 — no market-hours gating, unlike indices/sectors above. */
  crypto: IndexQuote[];
}

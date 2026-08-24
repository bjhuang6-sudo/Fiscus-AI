import type { ConfidenceLevel, SourceReading } from "./market-data/verify";
import type { ChartRange, ChartSeries } from "./market-data";

export type Role = "user" | "assistant";

export interface QuoteData {
  ticker: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  sparkline: number[];
  confidence?: ConfidenceLevel;
  sources?: SourceReading[];
  confidenceNote?: string;
}

export interface ValuationAssumption {
  label: string;
  value: string;
}

export interface ValuationResult {
  ticker: string;
  companyName: string;
  method: string;
  assumptions: ValuationAssumption[];
  impliedValue: number;
  currentPrice: number;
  upside: number;
}

export interface ChartCardData {
  ticker: string;
  companyName: string;
  range: ChartRange;
  series: ChartSeries;
}

export type ToolCard =
  | { type: "quote"; data: QuoteData }
  | { type: "valuation"; data: ValuationResult }
  | { type: "chart"; data: ChartCardData };

export interface ResearchTrailEntry {
  tool: string;
  args: Record<string, unknown>;
  summary: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  toolCards?: ToolCard[];
  isAdvice?: boolean;
  createdAt: number;
  trail?: ResearchTrailEntry[];
}

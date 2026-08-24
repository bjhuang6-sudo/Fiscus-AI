import type { CompanyFundamentals, RatioSet } from "@/lib/market-data";

export interface StockScoreInputs {
  fundamentals: CompanyFundamentals;
  ratios: RatioSet | null;
  currentPrice: number;
}

export interface StockScoreBreakdown {
  growth: number;
  profitability: number;
  financialHealth: number;
  analystUpside: number;
  analystSentiment: number;
}

export interface StockScore {
  score: number; // 0-100
  breakdown: StockScoreBreakdown;
}

function scaleLinear(value: number, min: number, max: number, points: number): number {
  if (value <= min) return 0;
  if (value >= max) return points;
  return ((value - min) / (max - min)) * points;
}

const RECOMMENDATION_POINTS: Record<string, number> = {
  strong_buy: 15,
  strongbuy: 15,
  buy: 12,
  outperform: 12,
  hold: 7,
  underperform: 3,
  sell: 1,
  strong_sell: 0,
  strongsell: 0,
};

/**
 * A composite 0-100 quality/attractiveness score from growth, profitability,
 * balance-sheet health, and Wall St. sentiment — deterministic and cheap so
 * it can be recomputed on every page load without an AI call. The AI-driven
 * daily delta (see news-score.ts) layers on top of this base.
 */
export function computeStockScore({ fundamentals, ratios, currentPrice }: StockScoreInputs): StockScore {
  const growth =
    fundamentals.revenueGrowth !== null ? scaleLinear(fundamentals.revenueGrowth, -0.1, 0.25, 25) : 12.5;

  const profitability = fundamentals.netMargin !== null ? scaleLinear(fundamentals.netMargin, -0.05, 0.25, 25) : 12.5;

  let financialHealth = 10; // neutral default when data's missing
  if (ratios?.debtToEquity !== null && ratios?.debtToEquity !== undefined) {
    financialHealth = ratios.debtToEquity <= 0.5 ? 10 : ratios.debtToEquity <= 1.5 ? 6 : 2;
  }
  if (ratios?.currentRatio !== null && ratios?.currentRatio !== undefined) {
    financialHealth += ratios.currentRatio >= 1.5 ? 10 : ratios.currentRatio >= 1 ? 6 : 2;
  } else {
    financialHealth += 5;
  }

  const analystUpside =
    fundamentals.analystTargetMean !== null && currentPrice > 0
      ? scaleLinear((fundamentals.analystTargetMean - currentPrice) / currentPrice, -0.1, 0.25, 15)
      : 7.5;

  const recommendationKey = fundamentals.analystRecommendation?.toLowerCase().replace(/\s+/g, "_") ?? "";
  const analystSentiment = RECOMMENDATION_POINTS[recommendationKey] ?? 7.5;

  const total = growth + profitability + financialHealth + analystUpside + analystSentiment;

  return {
    score: Math.round(Math.min(Math.max(total, 0), 100)),
    breakdown: {
      growth: Math.round(growth),
      profitability: Math.round(profitability),
      financialHealth: Math.round(financialHealth),
      analystUpside: Math.round(analystUpside),
      analystSentiment: Math.round(analystSentiment),
    },
  };
}

export interface PortfolioHoldingScore {
  ticker: string;
  weight: number; // 0-1
  score: number; // each holding's own 0-100 stock score
  sector: string;
}

/**
 * Weighted average of each holding's own score, penalized for concentration
 * (one name dominating the book) and lack of sector diversification — the
 * same two risk factors the deterministic portfolio commentary already
 * calls out, just folded into a single number.
 */
export function computePortfolioScore(holdings: PortfolioHoldingScore[]): number {
  if (holdings.length === 0) return 0;

  const weightedScore = holdings.reduce((sum, h) => sum + h.weight * h.score, 0);

  const topWeight = Math.max(...holdings.map((h) => h.weight));
  const concentrationPenalty = topWeight > 0.4 ? (topWeight - 0.4) * 50 : 0;

  const uniqueSectors = new Set(holdings.map((h) => h.sector)).size;
  const diversificationPenalty = uniqueSectors === 1 && holdings.length > 1 ? 10 : 0;

  return Math.round(Math.min(Math.max(weightedScore - concentrationPenalty - diversificationPenalty, 0), 100));
}

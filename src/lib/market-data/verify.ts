import { marketData } from "./index";
import { fetchStooqQuote } from "./stooq";
import { fetchFmpQuote } from "./fmp";

export type ConfidenceLevel = "verified" | "conflicting" | "unverified";

export interface SourceReading {
  name: string;
  value: number;
  timestamp: string;
  url?: string;
}

export interface VerifiedValue {
  value: number;
  confidence: ConfidenceLevel;
  sources: SourceReading[];
  note?: string;
}

const AGREEMENT_THRESHOLD = 0.003; // 0.3%

/**
 * Cross-checks a ticker's price against a secondary free source (Stooq, then
 * FMP as fallback) before the app presents it with a confidence badge.
 * Never fabricates agreement: if no secondary source responds, the result is
 * "unverified" rather than silently presented as confirmed.
 */
export async function verifyQuote(ticker: string): Promise<VerifiedValue | null> {
  const primary = await marketData.getQuote(ticker);
  if (!primary) return null;

  const sources: SourceReading[] = [
    { name: "Yahoo Finance", value: primary.price, timestamp: new Date().toISOString() },
  ];

  const secondary =
    (await fetchStooqQuote(ticker).then((q) => (q ? { name: "Stooq", ...q } : null))) ??
    (await fetchFmpQuote(ticker).then((q) =>
      q ? { name: "Financial Modeling Prep", ...q } : null
    ));

  if (!secondary) {
    return {
      value: primary.price,
      confidence: "unverified",
      sources,
      note: "No independent secondary source responded — showing single-source data.",
    };
  }

  sources.push({ name: secondary.name, value: secondary.price, timestamp: secondary.timestamp });

  const diff = Math.abs(primary.price - secondary.price) / primary.price;
  if (diff <= AGREEMENT_THRESHOLD) {
    return { value: primary.price, confidence: "verified", sources };
  }

  return {
    value: primary.price,
    confidence: "conflicting",
    sources,
    note: `${sources[0].name} and ${secondary.name} differ by ${(diff * 100).toFixed(1)}%.`,
  };
}

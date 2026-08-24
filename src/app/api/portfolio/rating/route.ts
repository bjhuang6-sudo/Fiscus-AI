import { NextRequest, NextResponse } from "next/server";
import { marketData } from "@/lib/market-data";
import { computeStockScore, computePortfolioScore } from "@/lib/finance/score";
import { getAiProvider } from "@/lib/ai";

const SUGGESTIONS_SYSTEM_PROMPT = `You review a person's stock portfolio and give concrete, specific suggestions for improving it.

Given each holding's ticker, weight, sector, and quality score (0-100), output 2-4 short suggestions, one per line, each starting with "-". Be specific — name tickers and sectors, reference the actual numbers you were given. Cover concentration risk, sector diversification, and any notably low-scoring holdings, in whichever of those actually apply. Skip ones that don't apply. No preamble, no header, just the bullet lines.`;

interface RatingHolding {
  ticker: string;
  shares: number;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const holdings: RatingHolding[] = Array.isArray(body?.holdings) ? body.holdings : [];
  if (holdings.length === 0) {
    return NextResponse.json({ error: "No holdings provided." }, { status: 400 });
  }

  const enriched = await Promise.all(
    holdings.map(async ({ ticker, shares }) => {
      const [quote, fundamentals, ratios, profile] = await Promise.all([
        marketData.getQuote(ticker),
        marketData.getFundamentals(ticker),
        marketData.getRatios(ticker),
        marketData.getCompanyProfile(ticker),
      ]);
      if (!quote || !fundamentals) return null;
      const score = computeStockScore({ fundamentals, ratios, currentPrice: quote.price });
      return { ticker, shares, value: quote.price * shares, sector: profile?.sector ?? "Diversified", score: score.score };
    })
  );

  const valid = enriched.filter((h): h is NonNullable<typeof h> => h !== null);
  if (valid.length === 0) {
    return NextResponse.json({ error: "No live data available for these holdings." }, { status: 502 });
  }

  const totalValue = valid.reduce((sum, h) => sum + h.value, 0);
  const weighted = valid.map((h) => ({
    ticker: h.ticker,
    weight: totalValue ? h.value / totalValue : 0,
    score: h.score,
    sector: h.sector,
  }));

  const portfolioScore = computePortfolioScore(weighted);

  let suggestions: string[] = [];
  const provider = getAiProvider();
  if (provider) {
    try {
      const summary = weighted
        .map((h) => `${h.ticker}: ${(h.weight * 100).toFixed(0)}% weight, ${h.sector}, score ${h.score}/100`)
        .join("\n");
      const response = await provider.generateResponse(
        [{ role: "user", content: `Portfolio score: ${portfolioScore}/100\n\nHoldings:\n${summary}` }],
        [],
        SUGGESTIONS_SYSTEM_PROMPT
      );
      suggestions =
        response.content
          ?.split("\n")
          .map((line) => line.trim())
          .filter((line) => line.startsWith("-"))
          .map((line) => line.slice(1).trim()) ?? [];
    } catch (err) {
      console.error("[portfolio-rating] AI suggestions failed:", err);
    }
  }

  return NextResponse.json({ portfolioScore, holdings: weighted, suggestions });
}

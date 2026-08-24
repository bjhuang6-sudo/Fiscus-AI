import { NextRequest, NextResponse } from "next/server";
import { marketData } from "@/lib/market-data";
import { calcMaxDrawdown, calcVolatility } from "@/lib/finance/risk";

export interface PortfolioPositionData {
  ticker: string;
  companyName: string;
  price: number;
  changePercent: number;
  changePerShare: number;
  sector: string;
  beta: number | null;
  volatility: number;
  maxDrawdown: number;
}

export async function GET(req: NextRequest) {
  const tickersParam = req.nextUrl.searchParams.get("tickers") ?? "";
  const tickers = [...new Set(tickersParam.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean))];

  const results = await Promise.all(
    tickers.map(async (ticker): Promise<PortfolioPositionData | null> => {
      const [quote, profile, history] = await Promise.all([
        marketData.getQuote(ticker),
        marketData.getCompanyProfile(ticker),
        marketData.getHistoricalPrices(ticker, 90),
      ]);
      if (!quote || !profile) return null;
      const closes = history.map((p) => p.close);
      return {
        ticker,
        companyName: quote.companyName,
        price: quote.price,
        changePercent: quote.changePercent,
        changePerShare: quote.change,
        sector: profile.sector,
        beta: profile.beta,
        volatility: calcVolatility(closes),
        maxDrawdown: calcMaxDrawdown(closes),
      };
    })
  );

  return NextResponse.json({ positions: results.filter((r): r is PortfolioPositionData => r !== null) });
}

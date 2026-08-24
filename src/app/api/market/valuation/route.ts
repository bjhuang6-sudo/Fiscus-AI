import { NextRequest, NextResponse } from "next/server";
import { marketData } from "@/lib/market-data";
import type { RatioSet } from "@/lib/market-data";

function averageRatios(peers: RatioSet[]): RatioSet | null {
  if (peers.length === 0) return null;
  const avg = (values: (number | null)[]) => {
    const nums = values.filter((v): v is number => v !== null);
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  };
  return {
    ticker: "PEER_AVG",
    currentRatio: avg(peers.map((p) => p.currentRatio)),
    quickRatio: avg(peers.map((p) => p.quickRatio)),
    debtToEquity: avg(peers.map((p) => p.debtToEquity)),
    returnOnEquity: avg(peers.map((p) => p.returnOnEquity)),
    returnOnAssets: avg(peers.map((p) => p.returnOnAssets)),
    grossMargin: avg(peers.map((p) => p.grossMargin)),
    netMargin: avg(peers.map((p) => p.netMargin)),
  };
}

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker) {
    return NextResponse.json({ error: "ticker query param required" }, { status: 400 });
  }

  const [quote, fundamentals, statements, ratios, comps] = await Promise.all([
    marketData.getQuote(ticker),
    marketData.getFundamentals(ticker),
    marketData.getFinancialStatements(ticker),
    marketData.getRatios(ticker),
    marketData.getComparables(ticker),
  ]);

  if (!quote || !fundamentals) {
    return NextResponse.json({ error: "No data available for this ticker" }, { status: 404 });
  }

  const peerRatios = (await Promise.all(comps.map((c) => marketData.getRatios(c.ticker)))).filter(
    (r): r is RatioSet => r !== null
  );
  const peerAverage = ratios ? averageRatios(peerRatios) : null;

  return NextResponse.json({ quote, fundamentals, statements, ratios, comps, peerAverage });
}

import { NextRequest, NextResponse } from "next/server";
import { marketData } from "@/lib/market-data";
import type { ChartRange } from "@/lib/market-data";

const VALID_RANGES: ChartRange[] = ["1D", "5D", "1M", "6M", "1Y", "5Y", "ALL"];

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  const range = req.nextUrl.searchParams.get("range") as ChartRange | null;

  if (!ticker || !range || !VALID_RANGES.includes(range)) {
    return NextResponse.json({ error: "ticker and a valid range are required" }, { status: 400 });
  }

  const series = await marketData.getChartSeries(ticker, range);
  if (!series) {
    return NextResponse.json({ error: "No chart data available for this ticker/range" }, { status: 404 });
  }

  return NextResponse.json(series);
}

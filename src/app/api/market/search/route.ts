import { NextRequest, NextResponse } from "next/server";
import { marketData } from "@/lib/market-data";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") ?? "";
  if (!query.trim()) {
    return NextResponse.json({ results: [] });
  }
  const results = await marketData.searchTickers(query);
  return NextResponse.json({ results });
}

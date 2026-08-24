export interface FmpQuote {
  price: number;
  timestamp: string;
}

/**
 * Financial Modeling Prep — used only as a secondary cross-check for verify.ts.
 * Requires FMP_API_KEY. Returns null (never throws) if the key is missing,
 * invalid, or the request fails, so a bad/absent key degrades to
 * "unverified" rather than breaking the app.
 */
export async function fetchFmpQuote(ticker: string): Promise<FmpQuote | null> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://financialmodelingprep.com/stable/quote?symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) return null;

    const data = await res.json();
    const entry = Array.isArray(data) ? data[0] : null;
    if (!entry || typeof entry.price !== "number") return null;

    return { price: entry.price, timestamp: new Date().toISOString() };
  } catch {
    return null;
  }
}

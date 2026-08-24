const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface StooqQuote {
  price: number;
  timestamp: string;
}

/**
 * Free, keyless quote source used only as a secondary cross-check for verify.ts.
 * Stooq occasionally serves a JS bot-check page instead of CSV — detected and
 * treated as "source unavailable" rather than a crash, since this is a
 * best-effort secondary signal, not the app's primary data path.
 */
export async function fetchStooqQuote(ticker: string): Promise<StooqQuote | null> {
  try {
    const symbol = `${ticker.toLowerCase()}.us`;
    const url = `https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv&e=csv`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;

    const text = await res.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2) return null;

    const [header, row] = lines;
    const cols = header.split(",");
    const values = row.split(",");
    const closeIdx = cols.indexOf("Close");
    const dateIdx = cols.indexOf("Date");
    const timeIdx = cols.indexOf("Time");
    if (closeIdx === -1) return null;

    const price = Number(values[closeIdx]);
    if (!Number.isFinite(price) || price <= 0) return null;

    const date = dateIdx !== -1 ? values[dateIdx] : new Date().toISOString().slice(0, 10);
    const time = timeIdx !== -1 ? values[timeIdx] : "00:00:00";
    return { price, timestamp: `${date}T${time}` };
  } catch {
    return null;
  }
}

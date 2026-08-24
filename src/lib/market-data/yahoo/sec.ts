const SEC_USER_AGENT = "Fiscus AI research@fiscus.ai";

let tickerCikCache: Map<string, string> | null = null;
let tickerCikPromise: Promise<Map<string, string>> | null = null;

async function loadTickerCikMap(): Promise<Map<string, string>> {
  const res = await fetch("https://www.sec.gov/files/company_tickers.json", {
    headers: { "User-Agent": SEC_USER_AGENT },
    next: { revalidate: 86400 },
  });
  const data: Record<string, { cik_str: number; ticker: string }> = await res.json();
  const map = new Map<string, string>();
  for (const entry of Object.values(data)) {
    map.set(entry.ticker.toUpperCase(), String(entry.cik_str).padStart(10, "0"));
  }
  return map;
}

async function getTickerCikMap(): Promise<Map<string, string>> {
  if (tickerCikCache) return tickerCikCache;
  if (!tickerCikPromise) {
    tickerCikPromise = loadTickerCikMap()
      .then((map) => {
        tickerCikCache = map;
        return map;
      })
      .finally(() => {
        tickerCikPromise = null;
      });
  }
  return tickerCikPromise;
}

export async function getCik(ticker: string): Promise<string | null> {
  try {
    const map = await getTickerCikMap();
    return map.get(ticker.toUpperCase()) ?? null;
  } catch {
    return null;
  }
}

export interface SecFilingEntry {
  form: string;
  filingDate: string;
  accessionNumber: string;
  primaryDocument: string;
  primaryDocDescription: string;
}

export async function fetchRecentFilings(cik: string): Promise<SecFilingEntry[]> {
  try {
    const res = await fetch(`https://data.sec.gov/submissions/CIK${cik}.json`, {
      headers: { "User-Agent": SEC_USER_AGENT },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const recent = data?.filings?.recent;
    if (!recent) return [];
    const count = recent.form.length;
    const entries: SecFilingEntry[] = [];
    for (let i = 0; i < count; i++) {
      entries.push({
        form: recent.form[i],
        filingDate: recent.filingDate[i],
        accessionNumber: recent.accessionNumber[i],
        primaryDocument: recent.primaryDocument[i],
        primaryDocDescription: recent.primaryDocDescription[i] ?? "",
      });
    }
    return entries;
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchCompanyFacts(cik: string): Promise<any | null> {
  try {
    // Company facts payloads can exceed Next.js's 2MB fetch-cache limit, so opt out of caching.
    const res = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, {
      headers: { "User-Agent": SEC_USER_AGENT },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export interface AnnualFact {
  end: string;
  val: number;
}

/** Tries each XBRL tag in order and returns the first with usable annual (10-K) data. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractAnnualSeries(facts: any, tags: string[], count = 3): AnnualFact[] {
  for (const tag of tags) {
    const entries = facts?.facts?.["us-gaap"]?.[tag]?.units?.USD;
    if (!Array.isArray(entries)) continue;

    const annual = entries.filter((e) => {
      if (e.form !== "10-K" || !e.start || !e.end) return false;
      const spanDays = (new Date(e.end).getTime() - new Date(e.start).getTime()) / 86_400_000;
      return spanDays > 300 && spanDays < 380;
    });
    if (annual.length === 0) continue;

    const byEnd = new Map<string, AnnualFact>();
    for (const e of annual) byEnd.set(e.end, { end: e.end, val: e.val });
    const series = [...byEnd.values()].sort((a, b) => a.end.localeCompare(b.end));
    if (series.length > 0) return series.slice(-count);
  }
  return [];
}

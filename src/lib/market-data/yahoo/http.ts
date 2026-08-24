const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface YahooSession {
  cookie: string;
  crumb: string;
}

let cachedSession: YahooSession | null = null;
let sessionPromise: Promise<YahooSession> | null = null;

async function fetchSession(): Promise<YahooSession> {
  const primeRes = await fetch("https://fc.yahoo.com", {
    headers: { "User-Agent": USER_AGENT },
    redirect: "manual",
  });
  const setCookies = primeRes.headers.getSetCookie?.() ?? [];
  const cookie = setCookies.map((c) => c.split(";")[0]).join("; ");

  const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
    headers: { "User-Agent": USER_AGENT, Cookie: cookie },
  });
  const crumb = (await crumbRes.text()).trim();
  return { cookie, crumb };
}

async function getSession(): Promise<YahooSession> {
  if (cachedSession) return cachedSession;
  if (!sessionPromise) {
    sessionPromise = fetchSession()
      .then((s) => {
        cachedSession = s;
        return s;
      })
      .finally(() => {
        sessionPromise = null;
      });
  }
  return sessionPromise;
}

function invalidateSession() {
  cachedSession = null;
}

/**
 * Retries once on a transient failure (429/5xx or a network error) before
 * giving up, so a single Yahoo hiccup doesn't make a valid ticker look like
 * it has no data. A genuine 4xx other than 429 (e.g. 404 for an invalid
 * ticker) is not retried — that's a real "not found," not instability.
 */
export async function fetchChart(
  symbol: string,
  range: string,
  interval: string,
  revalidate = 30
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        next: { revalidate },
      });
      if (res.ok) {
        const data = await res.json();
        return data?.chart?.result?.[0] ?? null;
      }
      const isRetryable = res.status === 429 || res.status >= 500;
      if (!isRetryable || attempt === 2) return null;
    } catch {
      if (attempt === 2) return null;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
}

export async function fetchQuoteSummary(
  symbol: string,
  modules: string[],
  revalidate = 300
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | null> {
  try {
    const session = await getSession();
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules.join(",")}&crumb=${encodeURIComponent(session.crumb)}`;
    let res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Cookie: session.cookie },
      next: { revalidate },
    });
    let data = await res.json();

    if (!res.ok || data?.quoteSummary?.error) {
      invalidateSession();
      const fresh = await getSession();
      const retryUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules.join(",")}&crumb=${encodeURIComponent(fresh.crumb)}`;
      res = await fetch(retryUrl, {
        headers: { "User-Agent": USER_AGENT, Cookie: fresh.cookie },
        next: { revalidate },
      });
      data = await res.json();
    }

    return data?.quoteSummary?.result?.[0] ?? null;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchSearchQuotes(query: string, count = 8): Promise<any[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=${count}&newsCount=0`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.quotes ?? [];
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchNewsForSymbol(symbol: string, count = 6): Promise<any[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=0&newsCount=${count}`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.news ?? [];
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchScreener(scrId: "day_gainers" | "day_losers", count = 8): Promise<any[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&scrIds=${scrId}&count=${count}`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, next: { revalidate: 30 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.finance?.result?.[0]?.quotes ?? [];
  } catch {
    return [];
  }
}

export async function fetchRecommendedSymbols(symbol: string): Promise<string[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v6/finance/recommendationsbysymbol/${encodeURIComponent(symbol)}`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (
      data?.finance?.result?.[0]?.recommendedSymbols
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ?.map((r: any) => r.symbol as string) ?? []
    );
  } catch {
    return [];
  }
}

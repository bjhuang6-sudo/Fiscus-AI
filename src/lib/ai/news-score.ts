import { getAiProvider } from "@/lib/ai";
import type { NewsItem } from "@/lib/market-data";

export type NewsCategory = "company" | "sector" | "market";

export interface CategorizedNews extends NewsItem {
  category: NewsCategory;
}

export interface NewsSource {
  url: string;
  headline: string;
  category: NewsCategory;
}

export interface NewsScoreDelta {
  delta: number; // -10..+10, added on top of the deterministic base score
  summary: string | null;
  sources: NewsSource[];
}

const MAX_SOURCES = 3;

const NEWS_SCORE_SYSTEM_PROMPT = `You adjust a stock's existing quality score based on today's news. You're given numbered headlines from three levels: company-specific, sector-wide, and broad-market — a stock's score can move because of its own news, its sector's news, or macro news (rates, inflation, geopolitics) even when nothing company-specific happened.

Output EXACTLY three lines, nothing else:
DELTA: <integer from -10 to 10>
HEADLINES: <comma-separated numbers of every headline that actually explains the move, or 0 if none — cite more than one when both company and macro/sector news contributed>
SUMMARY: <one or two plain-language sentences explaining why the score moved, naming what actually happened at whichever level(s) drove it>

Weigh genuine business and macro news (earnings, guidance, deals, lawsuits, rate decisions, inflation prints, sector-wide regulatory action) heavily. Weigh routine market commentary or price-target reiterations lightly. If nothing across all three levels says anything new, output DELTA: 0, HEADLINES: 0, and SUMMARY: No notable news today.`;

const ZERO_DELTA: NewsScoreDelta = { delta: 0, summary: null, sources: [] };

// In-memory, per-server-process cache — good enough for a "once a day" signal
// without needing a DB table or hammering the AI provider's tight token budget
// on every page load.
const cache = new Map<string, { date: string; result: NewsScoreDelta }>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseDelta(content: string | null, news: CategorizedNews[]): NewsScoreDelta {
  if (!content) return ZERO_DELTA;
  const deltaMatch = content.match(/DELTA:\s*([+-]?\d+)/i);
  const headlinesMatch = content.match(/HEADLINES:\s*([\d,\s]+)/i);
  const summaryMatch = content.match(/SUMMARY:\s*(.+)/i);
  if (!deltaMatch) return ZERO_DELTA;

  const delta = Math.min(Math.max(parseInt(deltaMatch[1], 10), -10), 10);
  if (delta === 0) return ZERO_DELTA;

  const summary = summaryMatch?.[1]?.trim() || null;
  const indices = (headlinesMatch?.[1] ?? "")
    .split(",")
    .map((n) => parseInt(n.trim(), 10) - 1)
    .filter((i) => Number.isInteger(i) && i >= 0 && i < news.length);

  const sources: NewsSource[] = indices.slice(0, MAX_SOURCES).map((i) => ({
    url: news[i].url,
    headline: news[i].headline,
    category: news[i].category,
  }));

  return { delta, summary, sources };
}

export async function getNewsScoreDelta(ticker: string, news: CategorizedNews[]): Promise<NewsScoreDelta> {
  const today = todayKey();
  const cached = cache.get(ticker);
  if (cached?.date === today) return cached.result;

  const provider = getAiProvider();
  if (!provider || news.length === 0) {
    cache.set(ticker, { date: today, result: ZERO_DELTA });
    return ZERO_DELTA;
  }

  try {
    const grouped = (["company", "sector", "market"] as const)
      .map((cat) => {
        const items = news.filter((n) => n.category === cat);
        if (items.length === 0) return null;
        const start = news.indexOf(items[0]);
        return `${cat} news:\n${items.map((n, i) => `${start + i + 1}. ${n.headline}`).join("\n")}`;
      })
      .filter(Boolean)
      .join("\n\n");

    const response = await provider.generateResponse(
      [{ role: "user", content: `Ticker: ${ticker}\n\n${grouped}` }],
      [],
      NEWS_SCORE_SYSTEM_PROMPT
    );
    const result = parseDelta(response.content, news);
    cache.set(ticker, { date: today, result });
    return result;
  } catch (err) {
    console.error(`[news-score] failed for ${ticker}:`, err);
    cache.set(ticker, { date: today, result: ZERO_DELTA });
    return ZERO_DELTA;
  }
}

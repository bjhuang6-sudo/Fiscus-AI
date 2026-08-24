import { getAiProvider } from "@/lib/ai";
import type { NewsItem } from "@/lib/market-data";

export interface TopStory extends NewsItem {
  overview: string | null;
}

const OVERVIEW_SYSTEM_PROMPT = `You write one-sentence overviews of market news headlines — what each one actually means for investors, in plain language, based on the headline alone.

You'll get a numbered list of headlines. Output exactly that many lines, one per headline, in the same order, each formatted as:
<number>: <one plain-language sentence>

No preamble, no blank lines, nothing else.`;

// One shared cache entry for the whole day — this is a market-wide feed, not
// per-user or per-ticker, so there's exactly one thing to cache.
let cached: { date: string; result: TopStory[] } | null = null;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseOverviews(content: string | null, count: number): (string | null)[] {
  const overviews: (string | null)[] = new Array(count).fill(null);
  if (!content) return overviews;

  for (const line of content.split("\n")) {
    const match = line.match(/^\s*(\d+)[:.)]\s*(.+)/);
    if (!match) continue;
    const index = parseInt(match[1], 10) - 1;
    if (index >= 0 && index < count) overviews[index] = match[2].trim();
  }
  return overviews;
}

export async function getTopStoriesWithOverviews(news: NewsItem[]): Promise<TopStory[]> {
  const today = todayKey();
  if (cached?.date === today) return cached.result;

  if (news.length === 0) {
    const result: TopStory[] = [];
    cached = { date: today, result };
    return result;
  }

  const provider = getAiProvider();
  if (!provider) {
    const result: TopStory[] = news.map((n) => ({ ...n, overview: null }));
    cached = { date: today, result };
    return result;
  }

  try {
    const response = await provider.generateResponse(
      [{ role: "user", content: news.map((n, i) => `${i + 1}. ${n.headline}`).join("\n") }],
      [],
      OVERVIEW_SYSTEM_PROMPT
    );
    const overviews = parseOverviews(response.content, news.length);
    const result: TopStory[] = news.map((n, i) => ({ ...n, overview: overviews[i] }));
    cached = { date: today, result };
    return result;
  } catch (err) {
    console.error("[top-stories] overview generation failed:", err);
    const result: TopStory[] = news.map((n) => ({ ...n, overview: null }));
    cached = { date: today, result };
    return result;
  }
}

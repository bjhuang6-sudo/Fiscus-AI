import { NextRequest, NextResponse } from "next/server";
import { marketData } from "@/lib/market-data";
import type { ChartRange } from "@/lib/market-data";
import { verifyQuote } from "@/lib/market-data/verify";
import { runDcf } from "@/lib/finance/dcf";
import { getAiProviders, SYSTEM_PROMPT } from "@/lib/ai";
import { TOOL_DEFINITIONS, executeTool } from "@/lib/ai/tools";
import type { ToolExecutionResult } from "@/lib/ai/tools";
import type { AiMessage, AiProvider } from "@/lib/ai/types";
import type { ResearchTrailEntry, ToolCard } from "@/lib/types";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/** Signed-in users get their compiled cross-session memory folded into the system prompt. */
async function buildSystemPrompt(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) return SYSTEM_PROMPT;

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { memory: true } });
  if (!user?.memory) return SYSTEM_PROMPT;

  return `${SYSTEM_PROMPT}\n\n## What you know about this returning user\nThis is compiled from their past conversations — use it to personalize your answer, but don't recite it back verbatim or mention that you "have a memory" of them unless it's naturally relevant.\n${user.memory}`;
}

const VALUATION_KEYWORDS = ["dcf", "valuation", "valuate", "intrinsic value", "fair value", "worth"];
const GENERIC_KEYWORDS = ["hello", "hi", "hey", "help", "what can you do"];
const MAX_TOOL_ITERATIONS = 5;

function extractTickerCandidates(text: string): string[] {
  const matches = text.match(/\b[A-Z]{1,5}\b/g) ?? [];
  return [...new Set(matches)].slice(0, 5);
}

// Small recursive-descent evaluator for +,-,*,/,() — avoids eval/Function on user input.
function evaluateArithmetic(expr: string): number | null {
  let pos = 0;
  const peek = () => expr[pos];
  const skipSpace = () => {
    while (peek() === " ") pos++;
  };

  function parseExpression(): number {
    let value = parseTerm();
    skipSpace();
    while (peek() === "+" || peek() === "-") {
      const op = expr[pos++];
      const rhs = parseTerm();
      value = op === "+" ? value + rhs : value - rhs;
      skipSpace();
    }
    return value;
  }
  function parseTerm(): number {
    let value = parseFactor();
    skipSpace();
    while (peek() === "*" || peek() === "/") {
      const op = expr[pos++];
      const rhs = parseFactor();
      value = op === "*" ? value * rhs : value / rhs;
      skipSpace();
    }
    return value;
  }
  function parseFactor(): number {
    skipSpace();
    if (peek() === "-") {
      pos++;
      return -parseFactor();
    }
    if (peek() === "(") {
      pos++;
      const value = parseExpression();
      skipSpace();
      if (peek() !== ")") throw new Error("Expected )");
      pos++;
      return value;
    }
    const start = pos;
    while (/[\d.]/.test(peek())) pos++;
    if (pos === start) throw new Error("Expected number");
    return Number(expr.slice(start, pos));
  }

  try {
    const value = parseExpression();
    skipSpace();
    if (pos !== expr.length) return null;
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

async function handleDeterministic(message: string) {
  const lower = message.toLowerCase();
  const wantsValuation = VALUATION_KEYWORDS.some((k) => lower.includes(k));

  const candidates = extractTickerCandidates(message);
  const checks = await Promise.all(
    candidates.map(async (c) => ({ ticker: c, quote: await marketData.getQuote(c) }))
  );
  const validated = checks.filter((c) => c.quote !== null);

  if (validated.length > 0 && wantsValuation) {
    const { ticker, quote } = validated[0];
    const fundamentals = await marketData.getFundamentals(ticker);
    if (!fundamentals || !quote) {
      return NextResponse.json({
        content: `I found a live price for ${ticker} but couldn't pull enough fundamentals to build a DCF right now — Yahoo's data can be spotty for some tickers.`,
      });
    }

    const hasRealFcf = fundamentals.freeCashflow !== null && fundamentals.freeCashflow > 0;
    const baseFcf = hasRealFcf
      ? (fundamentals.freeCashflow as number)
      : fundamentals.revenueTtm * (fundamentals.netMargin ?? 0.15) * 0.85 || fundamentals.marketCap * 0.04;
    const growthRate =
      fundamentals.revenueGrowth !== null
        ? Math.min(Math.max(fundamentals.revenueGrowth, -0.1), 0.35)
        : 0.08;
    const sharesOutstanding = fundamentals.sharesOutstanding ?? fundamentals.marketCap / quote.price;
    const netDebt =
      fundamentals.totalDebt !== null && fundamentals.totalCash !== null
        ? fundamentals.totalDebt - fundamentals.totalCash
        : 0;
    const dcf = runDcf({
      baseFcf,
      growthRate,
      discountRate: 0.09,
      terminalGrowthRate: 0.025,
      years: 5,
      sharesOutstanding,
      netDebt,
    });
    const upside = ((dcf.impliedSharePrice - quote.price) / quote.price) * 100;

    const toolCards: ToolCard[] = [
      {
        type: "valuation",
        data: {
          ticker,
          companyName: quote.companyName,
          method: hasRealFcf ? "Discounted Cash Flow (5-yr, reported FCF)" : "Discounted Cash Flow (5-yr, estimated FCF)",
          assumptions: [
            { label: "FCF growth rate", value: `${(growthRate * 100).toFixed(1)}%` },
            { label: "Terminal growth rate", value: "2.5%" },
            { label: "Discount rate (WACC)", value: "9.0%" },
            { label: "Projection window", value: "5 years" },
          ],
          impliedValue: dcf.impliedSharePrice,
          currentPrice: quote.price,
          upside,
        },
      },
    ];

    const fcfNote = hasRealFcf
      ? "using the company's actual trailing free cash flow"
      : "using an estimated free cash flow (reported FCF wasn't available for this ticker)";

    return NextResponse.json({
      content: `Here's a base-case 5-year DCF for ${quote.companyName} (${ticker}), ${fcfNote} and its own recent revenue growth (${(growthRate * 100).toFixed(1)}%) tapering to a 2.5% terminal rate, discounted at a 9% WACC. This is a starting point, not a call: the model is highly sensitive to the growth and discount rate assumptions, both of which you can adjust in the Valuation workspace.`,
      toolCards,
      isAdvice: true,
    });
  }

  if (validated.length > 0) {
    const picks = validated.slice(0, 3);
    const lines = picks.map(({ ticker, quote }) => {
      const direction = quote!.changePercent >= 0 ? "up" : "down";
      return `${ticker} is trading at $${quote!.price.toFixed(2)}, ${direction} ${Math.abs(quote!.changePercent).toFixed(2)}% on the session.`;
    });

    const verifications = await Promise.all(picks.map(({ ticker }) => verifyQuote(ticker)));
    const toolCards: ToolCard[] = picks.map(({ quote }, i) => {
      const v = verifications[i];
      return {
        type: "quote",
        data: {
          ...quote!,
          confidence: v?.confidence,
          sources: v?.sources,
          confidenceNote: v?.note,
        },
      };
    });

    return NextResponse.json({
      content: `${lines.join(" ")} Ask me to run a DCF, pull up comps, or break down the filings if you want to go deeper.`,
      toolCards,
      isAdvice: true,
    });
  }

  if (GENERIC_KEYWORDS.some((k) => lower.includes(k))) {
    return NextResponse.json({
      content:
        "I'm Fiscus AI — ask me about a ticker, request a DCF or comps, dig into filings, or check portfolio risk. I can also help with quick calculations or writing if you need it, though markets are where I'm sharpest.",
    });
  }

  if (/^[\d\s+\-*/().]+$/.test(message) && /\d/.test(message)) {
    const result = evaluateArithmetic(message);
    if (result !== null) {
      return NextResponse.json({ content: `${message} = ${result}` });
    }
  }

  return NextResponse.json({
    content:
      "I couldn't find a ticker in that — try a symbol like AAPL, MSFT, or NVDA, or ask for a DCF on one.",
  });
}

/**
 * Best-effort mapping of the tool trail into the existing quote/valuation card UI.
 * The model often calls verify_quote (which the system prompt encourages) instead of
 * get_quote directly — verify_quote's result lacks companyName/sparkline, so we
 * backfill a full quote for any ticker the model looked at price-wise but didn't
 * fetch via get_quote, merging in whatever confidence data is available.
 */
async function buildToolCardsFromTrail(trail: ToolExecutionResult[]): Promise<ToolCard[]> {
  const cards: ToolCard[] = [];
  const seenTickers = new Set<string>();

  const verificationFor = (ticker: unknown) =>
    trail.find((t) => t.tool === "verify_quote" && t.args.ticker === ticker)?.result as
      | { confidence?: string; sources?: unknown; note?: string }
      | undefined;

  for (const entry of trail) {
    if (entry.tool === "get_quote" && entry.result && typeof entry.result === "object") {
      const quote = entry.result as Record<string, unknown>;
      if (typeof quote.price === "number" && typeof entry.args.ticker === "string") {
        seenTickers.add(entry.args.ticker);
        const verification = verificationFor(entry.args.ticker);
        cards.push({
          type: "quote",
          data: {
            ...(quote as { ticker: string; companyName: string; price: number; change: number; changePercent: number; currency: string; sparkline: number[] }),
            confidence: verification?.confidence as never,
            sources: verification?.sources as never,
            confidenceNote: verification?.note,
          },
        });
      }
    }
  }

  // Chart calls get a real interactive chart card instead of a plain quote card —
  // strictly more informative, and it's real data the user can already see.
  const chartCalls = trail.filter(
    (t) => t.tool === "get_chart_series" && typeof t.args.ticker === "string" && typeof t.args.range === "string"
  );
  for (const call of chartCalls) {
    const ticker = call.args.ticker as string;
    if (seenTickers.has(ticker)) continue;
    const range = (call.args.range as string).toUpperCase() as ChartRange;
    const [series, quote] = await Promise.all([
      marketData.getChartSeries(ticker, range),
      marketData.getQuote(ticker),
    ]);
    if (!series || !quote) continue;
    seenTickers.add(ticker);
    cards.push({
      type: "chart",
      data: { ticker, companyName: quote.companyName, range, series },
    });
  }

  const priceTickers = trail
    .filter(
      (t) => (t.tool === "verify_quote" || t.tool === "get_fundamentals") && typeof t.args.ticker === "string"
    )
    .map((t) => t.args.ticker as string);

  for (const ticker of new Set(priceTickers)) {
    if (seenTickers.has(ticker)) continue;
    const quote = await marketData.getQuote(ticker);
    if (!quote) continue;
    seenTickers.add(ticker);
    const verification = verificationFor(ticker);
    cards.push({
      type: "quote",
      data: {
        ...quote,
        confidence: verification?.confidence as never,
        sources: verification?.sources as never,
        confidenceNote: verification?.note,
      },
    });
  }

  return cards;
}

const MAX_HISTORY_MESSAGES = 20;

/** Runs one provider's full tool-calling loop against a fresh copy of the
 * conversation. Throws on failure so the caller can try the next provider. */
async function runProviderLoop(
  provider: { name: string; provider: AiProvider },
  history: { role: "user" | "assistant"; content: string }[],
  systemPrompt: string
) {
  const messages: AiMessage[] = history
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content }));
  const rawTrail: ToolExecutionResult[] = [];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await provider.provider.generateResponse(messages, TOOL_DEFINITIONS, systemPrompt);

    if (response.toolCalls.length === 0) {
      const trail: ResearchTrailEntry[] = rawTrail.map(({ tool, args, summary }) => ({ tool, args, summary }));
      return NextResponse.json({
        content: response.content ?? "I wasn't able to put together an answer — try rephrasing.",
        toolCards: await buildToolCardsFromTrail(rawTrail),
        trail,
        isAdvice: true,
      });
    }

    messages.push({ role: "assistant", content: response.content ?? "", toolCalls: response.toolCalls });

    for (const call of response.toolCalls) {
      const execResult = await executeTool(call.name, call.arguments, rawTrail);
      rawTrail.push(execResult);
      messages.push({
        role: "tool",
        content: JSON.stringify(execResult.result),
        toolCallId: call.id,
        toolName: call.name,
      });
    }
  }

  const trail: ResearchTrailEntry[] = rawTrail.map(({ tool, args, summary }) => ({ tool, args, summary }));
  return NextResponse.json({
    content: "I gathered a lot of data on this but couldn't wrap up cleanly — try narrowing the question.",
    toolCards: await buildToolCardsFromTrail(rawTrail),
    trail,
  });
}

/** Returns null (never throws) so the caller can fall back to deterministic logic
 * if no provider is configured, or every configured provider fails. Tries each
 * configured AI provider in order (e.g. Groq then Gemini) before giving up —
 * a rate limit or outage on one no longer takes the whole AI path down. */
async function handleWithAi(history: { role: "user" | "assistant"; content: string }[]) {
  const providers = getAiProviders();
  if (providers.length === 0) return null;

  const systemPrompt = await buildSystemPrompt();

  for (const candidate of providers) {
    try {
      return await runProviderLoop(candidate, history, systemPrompt);
    } catch (err) {
      console.error(`[chat] ${candidate.name} provider failed:`, err);
    }
  }

  console.error("[chat] all AI providers failed, falling back to deterministic logic");
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const rawHistory = Array.isArray(body?.messages) ? body.messages : null;
  const history: { role: "user" | "assistant"; content: string }[] = rawHistory
    ? rawHistory.filter(
        (m: unknown): m is { role: "user" | "assistant"; content: string } =>
          !!m &&
          typeof m === "object" &&
          ((m as { role?: unknown }).role === "user" || (m as { role?: unknown }).role === "assistant") &&
          typeof (m as { content?: unknown }).content === "string"
      )
    : typeof body?.message === "string"
      ? [{ role: "user" as const, content: body.message }]
      : [];

  const latestMessage = history.length > 0 ? history[history.length - 1].content.trim() : "";
  if (!latestMessage) {
    return NextResponse.json({ content: "Say something and I'll take a look." });
  }

  const aiResult = await handleWithAi(history);
  if (aiResult) return aiResult;

  return handleDeterministic(latestMessage);
}

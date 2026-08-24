import { marketData } from "@/lib/market-data";
import { verifyQuote } from "@/lib/market-data/verify";
import { runDcf } from "@/lib/finance/dcf";
import { runLbo } from "@/lib/finance/lbo";
import type { AiTool } from "./types";
import type { ChartRange, CompanyFundamentals } from "@/lib/market-data";

/** How far a model-supplied base_fcf can diverge from the real reported FCF
 * before it's treated as unreliable rather than a reasonable analytical
 * adjustment (e.g. smoothing out a one-off item). */
const FCF_DIVERGENCE_TOLERANCE = 0.25;

const VALID_CHART_RANGES: ChartRange[] = ["1D", "5D", "1M", "6M", "1Y", "5Y", "ALL"];

export const TOOL_DEFINITIONS: AiTool[] = [
  {
    name: "get_quote",
    description: "Get the current live price and day change for a stock ticker.",
    parameters: {
      type: "object",
      properties: { ticker: { type: "string", description: "Stock ticker symbol, e.g. AAPL" } },
      required: ["ticker"],
    },
  },
  {
    name: "verify_quote",
    description:
      "Cross-check a ticker's price against a second independent data source and return a confidence level (verified/conflicting/unverified). Use this before stating a price as fact.",
    parameters: {
      type: "object",
      properties: { ticker: { type: "string", description: "Stock ticker symbol" } },
      required: ["ticker"],
    },
  },
  {
    name: "get_fundamentals",
    description:
      "Get fundamentals for a ticker: market cap, P/E, EPS, margins, revenue, free cash flow, analyst price targets.",
    parameters: {
      type: "object",
      properties: { ticker: { type: "string", description: "Stock ticker symbol" } },
      required: ["ticker"],
    },
  },
  {
    name: "get_ratios",
    description: "Get liquidity, profitability, and leverage ratios for a ticker.",
    parameters: {
      type: "object",
      properties: { ticker: { type: "string", description: "Stock ticker symbol" } },
      required: ["ticker"],
    },
  },
  {
    name: "get_filings",
    description: "Get recent SEC filings (10-K, 10-Q, 8-K) for a ticker, with links to the actual filing on SEC EDGAR.",
    parameters: {
      type: "object",
      properties: { ticker: { type: "string", description: "Stock ticker symbol" } },
      required: ["ticker"],
    },
  },
  {
    name: "get_financial_statements",
    description: "Get up to 3 years of annual income statement, balance sheet, and cash flow data from SEC XBRL filings.",
    parameters: {
      type: "object",
      properties: { ticker: { type: "string", description: "Stock ticker symbol" } },
      required: ["ticker"],
    },
  },
  {
    name: "get_comparables",
    description: "Get peer companies for a ticker with market cap, P/E, EV/Revenue, EV/EBITDA, and margins.",
    parameters: {
      type: "object",
      properties: { ticker: { type: "string", description: "Stock ticker symbol" } },
      required: ["ticker"],
    },
  },
  {
    name: "get_news",
    description: "Get recent news headlines for a ticker with source outlet, link, and publish date.",
    parameters: {
      type: "object",
      properties: { ticker: { type: "string", description: "Stock ticker symbol" } },
      required: ["ticker"],
    },
  },
  {
    name: "get_chart_series",
    description:
      "Get real historical price data for a ticker over a specific window, with the actual change and % change over that exact window — pulled live from Yahoo Finance, not approximated. Use this whenever the user asks about a chart, price history, or performance over a specific period (today, 1 week, 1 month, 6 months, 1 year, 5 years, or all-time). Always use this instead of guessing from a small sparkline you may have seen in a previous quote.",
    parameters: {
      type: "object",
      properties: {
        ticker: { type: "string", description: "Stock ticker symbol" },
        range: {
          type: "string",
          description: "One of: 1D (today/intraday), 5D (1 week), 1M (1 month), 6M (6 months), 1Y (1 year), 5Y (5 years), ALL (full history)",
        },
      },
      required: ["ticker", "range"],
    },
  },
  {
    name: "run_dcf",
    description:
      "Run a discounted cash flow valuation for a ticker. You MUST call get_fundamentals for this ticker first — this tool will reject the call otherwise. base_fcf and shares_outstanding are checked against the real fetched fundamentals and will be silently corrected to the real figures if they diverge significantly, so don't guess them.",
    parameters: {
      type: "object",
      properties: {
        ticker: { type: "string", description: "Stock ticker symbol this DCF is for — must match a prior get_fundamentals call" },
        base_fcf: { type: "number", description: "Starting free cash flow" },
        growth_rate: { type: "number", description: "Annual FCF growth rate as a fraction, e.g. 0.1 for 10%" },
        discount_rate: { type: "number", description: "WACC as a fraction, e.g. 0.09 for 9%" },
        terminal_growth_rate: { type: "number", description: "Terminal growth rate as a fraction" },
        years: { type: "number", description: "Projection window in years, typically 5" },
        shares_outstanding: { type: "number", description: "Diluted shares outstanding" },
        net_debt: { type: "number", description: "Total debt minus cash; 0 if unknown" },
      },
      required: ["ticker", "base_fcf", "growth_rate", "discount_rate", "terminal_growth_rate", "years", "shares_outstanding", "net_debt"],
    },
  },
  {
    name: "run_lbo",
    description:
      "Run a leveraged buyout analysis for a ticker: entry price, debt/equity split, a 5-year debt paydown schedule, and exit MOIC/IRR. You MUST call get_fundamentals for this ticker first — this tool will reject the call otherwise, and will derive entry EV/EBITDA from the real fetched fundamentals rather than the model's guess.",
    parameters: {
      type: "object",
      properties: {
        ticker: { type: "string", description: "Stock ticker symbol this LBO is for — must match a prior get_fundamentals call" },
        takeover_premium: { type: "number", description: "Premium over current enterprise value as a fraction, e.g. 0.2 for 20%" },
        leverage_ratio: { type: "number", description: "Debt as a fraction of entry enterprise value, e.g. 0.6 for 60%" },
        ebitda_growth_rate: { type: "number", description: "Annual EBITDA growth rate as a fraction" },
        interest_rate: { type: "number", description: "Interest rate on the debt as a fraction, e.g. 0.08 for 8%" },
        exit_multiple: { type: "number", description: "EV/EBITDA multiple at exit" },
        years: { type: "number", description: "Holding period in years, typically 5" },
      },
      required: ["ticker", "takeover_premium", "leverage_ratio", "ebitda_growth_rate", "interest_rate", "exit_multiple", "years"],
    },
  },
];

export interface ToolExecutionResult {
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
  summary: string;
}

function summarize(tool: string, result: unknown): string {
  if (result === null || result === undefined) return "No data returned.";
  try {
    const s = JSON.stringify(result);
    return s.length > 200 ? `${s.slice(0, 200)}…` : s;
  } catch {
    return String(result);
  }
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  priorTrail: ToolExecutionResult[] = []
): Promise<ToolExecutionResult> {
  const ticker = typeof args.ticker === "string" ? args.ticker : "";
  let result: unknown = null;

  switch (name) {
    case "get_quote":
      result = await marketData.getQuote(ticker);
      break;
    case "verify_quote":
      result = await verifyQuote(ticker);
      break;
    case "get_fundamentals":
      result = await marketData.getFundamentals(ticker);
      break;
    case "get_ratios":
      result = await marketData.getRatios(ticker);
      break;
    case "get_filings":
      result = await marketData.getFilings(ticker);
      break;
    case "get_financial_statements":
      result = await marketData.getFinancialStatements(ticker);
      break;
    case "get_comparables":
      result = await marketData.getComparables(ticker);
      break;
    case "get_news":
      result = await marketData.getNews(ticker);
      break;
    case "get_chart_series": {
      const rangeArg = typeof args.range === "string" ? args.range.toUpperCase() : "";
      const range = VALID_CHART_RANGES.includes(rangeArg as ChartRange) ? (rangeArg as ChartRange) : "1M";
      const series = await marketData.getChartSeries(ticker, range);
      result = series
        ? {
            ticker,
            range,
            dataPoints: series.points.length,
            startDate: series.points[0]?.date ?? null,
            endDate: series.points[series.points.length - 1]?.date ?? null,
            startPrice: series.points[0]?.close ?? null,
            endPrice: series.points[series.points.length - 1]?.close ?? null,
            high: Math.max(...series.points.map((p) => p.close)),
            low: Math.min(...series.points.map((p) => p.close)),
            change: series.change,
            changePercent: series.changePercent,
          }
        : null;
      break;
    }
    case "run_dcf": {
      if (!ticker) {
        result = { error: "run_dcf requires a ticker so it can be checked against real fundamentals." };
        break;
      }

      const groundingEntry = priorTrail.find(
        (t) => t.tool === "get_fundamentals" && t.args.ticker === ticker && t.result !== null
      );

      if (!groundingEntry) {
        result = {
          error: `No get_fundamentals call found for ${ticker} yet. Call get_fundamentals for ${ticker} first, then run_dcf again with its real freeCashflow/sharesOutstanding/totalDebt/totalCash — do not guess these figures.`,
        };
        break;
      }

      const fundamentals = groundingEntry.result as CompanyFundamentals;
      const corrections: string[] = [];

      let baseFcf = Number(args.base_fcf);
      if (fundamentals.freeCashflow !== null && fundamentals.freeCashflow > 0) {
        const divergence = Math.abs(baseFcf - fundamentals.freeCashflow) / fundamentals.freeCashflow;
        if (divergence > FCF_DIVERGENCE_TOLERANCE) {
          corrections.push(
            `base_fcf corrected from ${baseFcf} to the real reported free cash flow ${fundamentals.freeCashflow} (model figure diverged ${(divergence * 100).toFixed(0)}%)`
          );
          baseFcf = fundamentals.freeCashflow;
        }
      }

      // Shares outstanding and net debt are facts, not assumptions — always
      // use the real fetched values when available rather than trusting the
      // model to have carried them over correctly.
      let sharesOutstanding = Number(args.shares_outstanding);
      if (fundamentals.sharesOutstanding !== null && fundamentals.sharesOutstanding > 0) {
        if (sharesOutstanding !== fundamentals.sharesOutstanding) {
          corrections.push(`shares_outstanding corrected to the real fetched figure ${fundamentals.sharesOutstanding}`);
        }
        sharesOutstanding = fundamentals.sharesOutstanding;
      }

      let netDebt = Number(args.net_debt);
      if (fundamentals.totalDebt !== null && fundamentals.totalCash !== null) {
        const realNetDebt = fundamentals.totalDebt - fundamentals.totalCash;
        if (netDebt !== realNetDebt) {
          corrections.push(`net_debt corrected to the real fetched figure ${realNetDebt}`);
        }
        netDebt = realNetDebt;
      }

      const dcf = runDcf({
        baseFcf,
        growthRate: Number(args.growth_rate),
        discountRate: Number(args.discount_rate),
        terminalGrowthRate: Number(args.terminal_growth_rate),
        years: Number(args.years),
        sharesOutstanding,
        netDebt,
      });

      result = { ...dcf, groundedAgainst: ticker, corrections };
      break;
    }
    case "run_lbo": {
      if (!ticker) {
        result = { error: "run_lbo requires a ticker so it can be checked against real fundamentals." };
        break;
      }

      const groundingEntry = priorTrail.find(
        (t) => t.tool === "get_fundamentals" && t.args.ticker === ticker && t.result !== null
      );

      if (!groundingEntry) {
        result = {
          error: `No get_fundamentals call found for ${ticker} yet. Call get_fundamentals for ${ticker} first — entry EV and EBITDA are derived from that, not guessed.`,
        };
        break;
      }

      const fundamentals = groundingEntry.result as CompanyFundamentals;
      // Same revenue x net margin x 1.3 add-back approximation used
      // elsewhere in the app (comps EV/EBITDA, the Valuation page LBO tab) —
      // there's no direct EBITDA field from the provider.
      const estimatedEbitda = fundamentals.revenueTtm * (fundamentals.netMargin ?? 0.15) * 1.3;
      const netDebt =
        fundamentals.totalDebt !== null && fundamentals.totalCash !== null
          ? fundamentals.totalDebt - fundamentals.totalCash
          : 0;
      const currentEV = fundamentals.marketCap + netDebt;

      if (estimatedEbitda <= 0) {
        result = { error: `Not enough data to estimate EBITDA for ${ticker}.` };
        break;
      }

      const entryEV = currentEV * (1 + Number(args.takeover_premium));

      const lbo = runLbo({
        entryEV,
        entryEbitda: estimatedEbitda,
        ebitdaGrowthRate: Number(args.ebitda_growth_rate),
        leverageRatio: Number(args.leverage_ratio),
        interestRate: Number(args.interest_rate),
        fcfConversion: 0.5,
        exitMultiple: Number(args.exit_multiple),
        years: Number(args.years),
      });

      result = { ...lbo, groundedAgainst: ticker, entryEV, estimatedEbitda, currentEV };
      break;
    }
    default:
      result = { error: `Unknown tool: ${name}` };
  }

  return { tool: name, args, result, summary: summarize(name, result) };
}

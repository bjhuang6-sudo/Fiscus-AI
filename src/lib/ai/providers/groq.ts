import type { AiMessage, AiProvider, AiResponse, AiTool, AiToolCall } from "../types";

const MODEL = "openai/gpt-oss-120b";
const MAX_ATTEMPTS = 3;

// Llama 3.3 sometimes writes its tool-call intent out as literal text
// (e.g. `<function=get_quote{"ticker": "NVDA"}</function>` or
// `<function/get_quote{...}</function>` — both separators show up) instead
// of using the structured tool_calls field — this is its OTHER native
// tool-call syntax (the one Meta's own "ipython" tool format uses), not a
// formatting mistake, so it shows up reliably on some prompts no matter how
// the system prompt is worded. Groq either rejects it outright (400
// tool_use_failed, with the text in `failed_generation`) or occasionally
// passes it through as a normal 200 with empty tool_calls and the text
// sitting in `content`. Since the format is fully deterministic, we parse it
// into a real tool call instead of just detecting-and-retrying — that fixes
// the response instead of hoping a retry makes the model choose the other
// syntax.
const MALFORMED_TOOL_CALL_PATTERN = /<function\s*[=/]|<\|python_tag\|>/i;

/**
 * Extracts {name, arguments} from Llama's literal `<function=name{...}</function>`
 * (or `<function/name{...}`) text form. Braces are matched by hand (not a
 * lazy regex) so a truncated or missing closing `</function>` tag doesn't
 * cause the JSON to be cut short.
 */
function parseMalformedFunctionCall(text: string): AiToolCall | null {
  const match = text.match(/<function\s*[=/]\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(\{[\s\S]*)/i);
  if (!match) return null;

  const [, name, rest] = match;
  let depth = 0;
  let end = -1;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "{") depth++;
    else if (rest[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return null;

  try {
    const args = JSON.parse(rest.slice(0, end + 1));
    return { id: `recovered-${Date.now()}`, name, arguments: args };
  } catch {
    return null;
  }
}

/** Groq's 400 error body has the malformed text in error.failed_generation. */
function tryRecoverFromErrorBody(errText: string): AiToolCall | null {
  try {
    const parsed = JSON.parse(errText);
    const failedGeneration = parsed?.error?.failed_generation;
    if (typeof failedGeneration !== "string") return null;
    return parseMalformedFunctionCall(failedGeneration);
  } catch {
    return null;
  }
}

/** Thrown on 429s so generateResponse can wait the reported duration instead of retrying blindly. */
class RateLimitError extends Error {
  retryAfterMs: number;

  constructor(errText: string) {
    super(`rate_limit_exceeded: ${errText.slice(0, 500)}`);
    // Groq reports the wait as either "5.56s" or "659.999999ms" — match the
    // unit explicitly so the ms case doesn't silently miss (it still ends in
    // "s", just not right after the digits) and fall through to the default.
    const match = errText.match(/try again in ([\d.]+)(ms|s)\b/i);
    const seconds = match ? parseFloat(match[1]) / (match[2].toLowerCase() === "ms" ? 1000 : 1) : 2;
    this.retryAfterMs = Math.min(Math.max(seconds, 0.5), 10) * 1000;
  }
}

interface OpenAiToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface OpenAiMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OpenAiToolCall[];
  tool_call_id?: string;
}

function toOpenAiMessages(messages: AiMessage[], systemPrompt: string): OpenAiMessage[] {
  const out: OpenAiMessage[] = [{ role: "system", content: systemPrompt }];

  for (const m of messages) {
    if (m.role === "user") {
      out.push({ role: "user", content: m.content });
    } else if (m.role === "assistant") {
      const toolCalls: OpenAiToolCall[] | undefined = m.toolCalls?.map((c) => ({
        id: c.id,
        type: "function",
        function: { name: c.name, arguments: JSON.stringify(c.arguments) },
      }));
      out.push({ role: "assistant", content: m.content || null, tool_calls: toolCalls });
    } else if (m.role === "tool") {
      out.push({ role: "tool", content: m.content, tool_call_id: m.toolCallId ?? "" });
    }
  }

  return out;
}

function toOpenAiTools(tools: AiTool[]) {
  if (tools.length === 0) return undefined;
  return tools.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

function safeParseJson(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

export class GroqProvider implements AiProvider {
  constructor(private apiKey: string) {}

  async generateResponse(
    messages: AiMessage[],
    tools: AiTool[],
    systemPrompt: string
  ): Promise<AiResponse> {
    let lastError: unknown;

    // Most malformed-tool-call cases are now recovered directly in attempt()
    // (see parseMalformedFunctionCall) — this throw/retry path is only hit
    // when that recovery itself fails to parse, which is rare. On that
    // retry, append a blunt corrective message rather than resending the
    // exact same input.
    //
    // Rate limits (429, Groq's free-tier TPM cap) are unrelated to the
    // model's output and shouldn't be treated the same way — retrying with a
    // nagging message wouldn't help, but waiting the duration Groq reports
    // and resending the same messages as-is will.
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const attemptMessages =
          attempt === 1 || lastError instanceof RateLimitError
            ? messages
            : [
                ...messages,
                {
                  role: "user" as const,
                  content:
                    "Reminder: use the actual tool-calling mechanism right now. Do not write the call out as text, and do not explain a multi-step plan first — just make the call.",
                },
              ];
        return await this.attempt(attemptMessages, tools, systemPrompt);
      } catch (err) {
        lastError = err;
        if (attempt === MAX_ATTEMPTS) throw err;

        if (err instanceof RateLimitError) {
          await new Promise((resolve) => setTimeout(resolve, err.retryAfterMs));
          continue;
        }

        const isToolUseFailure = err instanceof Error && err.message.includes("tool_use_failed");
        if (!isToolUseFailure) throw err;
      }
    }

    throw lastError;
  }

  private async attempt(
    messages: AiMessage[],
    tools: AiTool[],
    systemPrompt: string
  ): Promise<AiResponse> {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: toOpenAiMessages(messages, systemPrompt),
        tools: toOpenAiTools(tools),
        tool_choice: "auto",
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      if (res.status === 429) throw new RateLimitError(errText);
      const recovered = tryRecoverFromErrorBody(errText);
      if (recovered) return { content: null, toolCalls: [recovered] };
      throw new Error(`Groq API error ${res.status}: ${errText.slice(0, 500)}`);
    }

    const data = await res.json();
    const message = data?.choices?.[0]?.message;

    const toolCalls: AiToolCall[] = (message?.tool_calls ?? []).map((c: OpenAiToolCall) => ({
      id: c.id,
      name: c.function.name,
      arguments: safeParseJson(c.function.arguments),
    }));

    if (toolCalls.length === 0 && typeof message?.content === "string" && MALFORMED_TOOL_CALL_PATTERN.test(message.content)) {
      const recovered = parseMalformedFunctionCall(message.content);
      if (recovered) return { content: null, toolCalls: [recovered] };
      throw new Error(
        "tool_use_failed: model emitted a tool call as literal text instead of a structured call"
      );
    }

    return {
      content: message?.content ?? null,
      toolCalls,
    };
  }
}

import type { AiMessage, AiProvider, AiResponse, AiTool, AiToolCall } from "../types";

const MODEL = "gemini-2.0-flash";

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

function toGeminiContents(messages: AiMessage[]): GeminiContent[] {
  const contents: GeminiContent[] = [];

  for (const m of messages) {
    if (m.role === "user") {
      contents.push({ role: "user", parts: [{ text: m.content }] });
    } else if (m.role === "assistant") {
      const parts: GeminiPart[] = [];
      if (m.content) parts.push({ text: m.content });
      for (const call of m.toolCalls ?? []) {
        parts.push({ functionCall: { name: call.name, args: call.arguments } });
      }
      contents.push({ role: "model", parts });
    } else if (m.role === "tool") {
      // Gemini expects tool results back as a "user" turn containing functionResponse parts,
      // keyed by function NAME (not a call id). This provider is currently inactive
      // (see src/lib/ai/index.ts) — the chat route now passes the real tool-call id in
      // toolCallId (needed for Groq/OpenAI-style protocols), so this mapping needs to be
      // revisited (track name alongside id) before Gemini is made active again.
      contents.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              name: m.toolCallId ?? "unknown_tool",
              response: { result: m.content },
            },
          },
        ],
      });
    }
  }

  return contents;
}

function toGeminiTools(tools: AiTool[]) {
  if (tools.length === 0) return undefined;
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })),
    },
  ];
}

export class GeminiProvider implements AiProvider {
  constructor(private apiKey: string) {}

  async generateResponse(
    messages: AiMessage[],
    tools: AiTool[],
    systemPrompt: string
  ): Promise<AiResponse> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${this.apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: toGeminiContents(messages),
        systemInstruction: { parts: [{ text: systemPrompt }] },
        tools: toGeminiTools(tools),
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data = await res.json();
    const parts: GeminiPart[] = data?.candidates?.[0]?.content?.parts ?? [];

    const textParts = parts.filter((p) => typeof p.text === "string").map((p) => p.text as string);
    const toolCalls: AiToolCall[] = parts
      .filter((p) => p.functionCall)
      .map((p, i) => ({
        id: `${p.functionCall!.name}-${i}`,
        name: p.functionCall!.name,
        arguments: p.functionCall!.args ?? {},
      }));

    return {
      content: textParts.length > 0 ? textParts.join("\n") : null,
      toolCalls,
    };
  }
}

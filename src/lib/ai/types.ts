export type AiRole = "user" | "assistant" | "tool";

export interface AiMessage {
  role: AiRole;
  content: string;
  /** Set on role:"tool" messages — which tool call this result answers. */
  toolCallId?: string;
  /** Set on role:"assistant" messages that requested tool calls. */
  toolCalls?: AiToolCall[];
}

export interface AiTool {
  name: string;
  description: string;
  /** JSON Schema for the tool's arguments object. */
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
}

export interface AiToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AiResponse {
  content: string | null;
  toolCalls: AiToolCall[];
}

/** Provider-agnostic contract — swap Gemini for Claude/OpenAI without touching callers. */
export interface AiProvider {
  generateResponse(messages: AiMessage[], tools: AiTool[], systemPrompt: string): Promise<AiResponse>;
}

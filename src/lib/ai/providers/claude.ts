import type { AiMessage, AiProvider, AiResponse, AiTool } from "../types";

/**
 * Stub — implement when an Anthropic key is available. The Messages API
 * tool-use shape is very close to AiTool/AiToolCall already, so this should
 * be a small adapter, not a rewrite of anything that calls AiProvider.
 */
export class ClaudeProvider implements AiProvider {
  constructor(private apiKey: string) {}

  async generateResponse(
    _messages: AiMessage[],
    _tools: AiTool[],
    _systemPrompt: string
  ): Promise<AiResponse> {
    throw new Error("ClaudeProvider is not implemented yet — add ANTHROPIC_API_KEY support here.");
  }
}

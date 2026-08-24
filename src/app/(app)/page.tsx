"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { WelcomeScreen } from "@/components/chat/welcome-screen";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ThinkingIndicator } from "@/components/chat/thinking-indicator";
import { PageHeader } from "@/components/page-header";
import { useChatSessions } from "@/lib/chat/session-context";
import type { ChatMessage, ResearchTrailEntry, ToolCard } from "@/lib/types";

interface ChatApiReply {
  content: string;
  toolCards?: ToolCard[];
  isAdvice?: boolean;
  trail?: ResearchTrailEntry[];
}

async function fetchChatReply(history: { role: "user" | "assistant"; content: string }[]): Promise<ChatApiReply> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });
    if (!res.ok) {
      return { content: "Something went wrong reaching live market data — try again in a moment." };
    }
    return await res.json();
  } catch {
    return { content: "Couldn't reach the server — check your connection and try again." };
  }
}

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `msg-${idCounter}`;
}

export default function Home() {
  const router = useRouter();
  const { activeMessages: messages, setActiveMessages: setMessages, startNewChat } = useChatSessions();
  const [isThinking, setIsThinking] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const handledPromptRef = React.useRef(false);

  const handleSend = React.useCallback(
    async (text: string, baseMessages: ChatMessage[] = messages) => {
      const userMessage: ChatMessage = {
        id: nextId(),
        role: "user",
        content: text,
        createdAt: Date.now(),
      };
      // Full conversation history (including the new message) so the model
      // can resolve follow-ups like "give me the 1 year chart" against the
      // ticker/topic that was actually just being discussed. baseMessages is
      // an explicit override (used right after startNewChat()) rather than
      // relying on `messages`, which may still be stale from the closure at
      // that exact moment.
      const history = [...baseMessages, userMessage].map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [...prev, userMessage]);
      setIsThinking(true);

      const reply = await fetchChatReply(history);

      setIsThinking(false);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          content: reply.content,
          toolCards: reply.toolCards,
          isAdvice: reply.isAdvice,
          trail: reply.trail,
          createdAt: Date.now(),
        },
      ]);
    },
    [messages, setMessages]
  );

  React.useEffect(() => {
    if (handledPromptRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const prompt = params.get("prompt");
    if (prompt) {
      handledPromptRef.current = true;
      startNewChat();
      handleSend(prompt, []);
      router.replace("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isThinking]);

  return (
    <>
      <PageHeader title={messages.length > 0 ? "New conversation" : "Fiscus AI"} />
      <div className="flex min-h-0 flex-1 flex-col">
        {messages.length === 0 ? (
          <WelcomeScreen onPrompt={handleSend} />
        ) : (
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isThinking && <ThinkingIndicator />}
            </div>
          </div>
        )}

        <div className="mx-auto w-full max-w-3xl px-4 pb-4">
          <ChatComposer onSend={handleSend} disabled={isThinking} />
        </div>
      </div>
    </>
  );
}

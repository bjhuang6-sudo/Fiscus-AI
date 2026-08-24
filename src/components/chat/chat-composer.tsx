"use client";

import * as React from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatComposer({ onSend, disabled }: ChatComposerProps) {
  const [value, setValue] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  return (
    <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder="Ask about a ticker, request a DCF, or check portfolio risk…"
        rows={1}
        className="max-h-[200px] min-h-[24px] resize-none border-0 bg-transparent p-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      <Button
        size="icon"
        className="size-8 shrink-0 rounded-full"
        disabled={!value.trim() || disabled}
        onClick={handleSend}
        aria-label="Send message"
      >
        <ArrowUp className="size-4" />
      </Button>
    </div>
  );
}

"use client";

import * as React from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PrivacyTab() {
  const [confirmText, setConfirmText] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleDelete() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: confirmText }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
      setPending(false);
      return;
    }
    signOut({ redirectTo: "/" });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-medium">What we store</h3>
        <p className="mt-1 max-w-lg text-xs text-muted-foreground">
          Your account, chat history, portfolio holdings, and compiled memory are stored so you can pick up
          where you left off. Nothing is shared with third parties beyond the AI provider and market-data
          sources needed to answer your questions.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-destructive">Delete account</h3>
        <p className="mt-1 max-w-lg text-xs text-muted-foreground">
          Permanently deletes your account, chats, portfolio, and memory. This can&apos;t be undone.
        </p>
        <div className="mt-3 flex max-w-sm flex-col gap-2">
          <Input
            placeholder='Type "DELETE" to confirm'
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button
            variant="destructive"
            size="sm"
            className="self-start"
            disabled={confirmText !== "DELETE" || pending}
            onClick={handleDelete}
          >
            {pending ? "Deleting…" : "Delete my account"}
          </Button>
        </div>
      </div>
    </div>
  );
}

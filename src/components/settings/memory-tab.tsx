"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function MemoryTab() {
  const [memory, setMemory] = React.useState("");
  const [loaded, setLoaded] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/memory")
      .then((r) => r.json())
      .then((data) => {
        setMemory(data.memory ?? "");
        setLoaded(true);
      });
  }, []);

  async function handleSave() {
    setPending(true);
    setStatus(null);
    await fetch("/api/memory", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memory }),
    });
    setPending(false);
    setStatus("Saved.");
  }

  async function handleClear() {
    setPending(true);
    setStatus(null);
    await fetch("/api/memory", { method: "DELETE" });
    setMemory("");
    setPending(false);
    setStatus("Memory cleared.");
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-medium">What Fiscus AI remembers about you</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Compiled automatically from your past conversations to personalize future answers. Edit or clear
          it any time.
        </p>
      </div>
      {!loaded ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (
        <>
          <Textarea
            rows={8}
            value={memory}
            onChange={(e) => setMemory(e.target.value)}
            placeholder="Nothing compiled yet — it builds up as you chat."
            className="max-w-lg"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={pending}>
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleClear} disabled={pending}>
              Clear memory
            </Button>
            {status && <span className="text-xs text-muted-foreground">{status}</span>}
          </div>
        </>
      )}
    </div>
  );
}

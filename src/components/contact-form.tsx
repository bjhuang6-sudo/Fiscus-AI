"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/auth/form-field";

export function ContactForm() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong — try again.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return <p className="text-sm text-muted-foreground">Thanks — we&apos;ll get back to you soon.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <FormField label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
      <FormField
        label="Email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Message</label>
        <Textarea
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help?"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" disabled={pending} className="mt-1">
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}

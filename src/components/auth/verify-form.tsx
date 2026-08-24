"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/auth/form-field";

export function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const warning = searchParams.get("warning");

  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [resent, setResent] = React.useState(false);
  const [resendPending, setResendPending] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setPending(false);
        return;
      }

      router.push("/login?verified=1");
    } catch {
      setError("Something went wrong — try again.");
      setPending(false);
    }
  }

  async function handleResend() {
    setResendPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't resend the code.");
      } else {
        setResent(true);
      }
    } catch {
      setError("Couldn't resend the code — try again.");
    } finally {
      setResendPending(false);
    }
  }

  if (!email) {
    return <p className="text-sm text-muted-foreground">Missing email — start over from the sign-up page.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Code sent to <span className="text-foreground">{email}</span>
      </p>
      {warning && <p className="text-xs text-destructive">{warning}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <FormField
          label="5-digit code"
          inputMode="numeric"
          maxLength={5}
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
          className="text-center text-lg tracking-[0.5em]"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" disabled={pending || code.length !== 5}>
          {pending ? "Verifying…" : "Verify"}
        </Button>
      </form>
      <Button variant="ghost" size="sm" onClick={handleResend} disabled={resendPending || resent}>
        {resent ? "Code resent" : resendPending ? "Sending…" : "Resend code"}
      </Button>
    </div>
  );
}

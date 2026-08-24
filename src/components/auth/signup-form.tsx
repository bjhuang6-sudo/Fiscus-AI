"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/auth/form-field";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setPending(false);
        return;
      }

      const query = new URLSearchParams({ email });
      if (data.warning) query.set("warning", data.warning);
      router.push(`/verify?${query.toString()}`);
    } catch {
      setError("Something went wrong — try again.");
      setPending(false);
    }
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
      <FormField
        label="Password"
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" disabled={pending} className="mt-1">
        {pending ? "Creating account…" : "Sign up"}
      </Button>
    </form>
  );
}

"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FormField } from "@/components/auth/form-field";

export function LoginForm({ oauthProviders }: { oauthProviders: { google: boolean; github: boolean } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const justVerified = searchParams.get("verified") === "1";
  const hasOAuth = oauthProviders.google || oauthProviders.github;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const result = await signIn("credentials", { email, password, redirect: false });

    setPending(false);
    if (result?.error) {
      if (result.code === "email_not_verified") {
        router.push(`/verify?email=${encodeURIComponent(email)}`);
        return;
      }
      setError("Incorrect email or password.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {justVerified && (
        <p className="rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
          Email verified — log in to continue.
        </p>
      )}

      {hasOAuth && (
        <>
          <div className="flex flex-col gap-2">
            {oauthProviders.google && (
              <Button variant="outline" type="button" onClick={() => signIn("google", { redirectTo: "/" })}>
                Continue with Google
              </Button>
            )}
            {oauthProviders.github && (
              <Button variant="outline" type="button" onClick={() => signIn("github", { redirectTo: "/" })}>
                Continue with GitHub
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
          {pending ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </div>
  );
}

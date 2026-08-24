import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  const oauthProviders = {
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    github: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
  };

  return (
    <AuthShell
      title="Log in"
      description="Sign in to Fiscus AI"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <Suspense>
        <LoginForm oauthProviders={oauthProviders} />
      </Suspense>
    </AuthShell>
  );
}

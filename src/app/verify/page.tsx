import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyForm } from "@/components/auth/verify-form";

export default function VerifyPage() {
  return (
    <AuthShell title="Check your email" description="Enter the 5-digit code we sent you.">
      <Suspense>
        <VerifyForm />
      </Suspense>
    </AuthShell>
  );
}

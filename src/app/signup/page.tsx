import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      description="We'll send a 5-digit code to verify your email."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}

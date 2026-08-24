import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { SignupSchema } from "@/lib/auth/validation";

const CODE_TTL_MS = 10 * 60 * 1000;

function generateCode(): string {
  return String(crypto.randomInt(10000, 100000));
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

async function issueVerificationCode(userId: string, name: string, email: string) {
  const code = generateCode();
  await prisma.emailVerificationCode.deleteMany({ where: { userId } });
  await prisma.emailVerificationCode.create({
    data: { userId, codeHash: hashCode(code), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  });

  const { error } = await sendEmail({
    to: email,
    subject: "Your Fiscus AI verification code",
    html: `<p>Hi ${name || "there"},</p><p>Your Fiscus AI verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p><p>This code expires in 10 minutes.</p>`,
  });
  // Without RESEND_API_KEY there's no other way to see the code — surface it
  // in the server log so local development isn't fully blocked on email setup.
  if (error) console.warn(`[auth] verification email failed (${error}) — code for ${email} is ${code}`);
  return error;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.emailVerified) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // An unverified signup can be retried with a fresh code instead of getting stuck.
  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: { name, passwordHash } })
    : await prisma.user.create({ data: { name, email, passwordHash } });

  const emailError = await issueVerificationCode(user.id, name, email);

  return NextResponse.json({
    ok: true,
    email,
    warning: emailError ? `Could not send the verification email (${emailError}).` : null,
  });
}

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import * as z from "zod";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

const Schema = z.object({ email: z.string().trim().toLowerCase().email() });

function generateCode(): string {
  return String(crypto.randomInt(10000, 100000));
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }
  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "No pending signup found for that email." }, { status: 404 });
  }
  if (user.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const latest = await prisma.emailVerificationCode.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  if (latest && Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - latest.createdAt.getTime())) / 1000);
    return NextResponse.json({ error: `Wait ${waitSeconds}s before requesting another code.` }, { status: 429 });
  }

  const code = generateCode();
  await prisma.emailVerificationCode.deleteMany({ where: { userId: user.id } });
  await prisma.emailVerificationCode.create({
    data: { userId: user.id, codeHash: hashCode(code), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  });

  const { error } = await sendEmail({
    to: email,
    subject: "Your new Fiscus AI verification code",
    html: `<p>Your new Fiscus AI verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p><p>This code expires in 10 minutes.</p>`,
  });
  if (error) console.warn(`[auth] verification email failed (${error}) — code for ${email} is ${code}`);

  return NextResponse.json({ ok: true, warning: error ? `Could not send the verification email (${error}).` : null });
}

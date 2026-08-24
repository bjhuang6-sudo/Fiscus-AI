import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { VerifyCodeSchema } from "@/lib/auth/validation";

const MAX_ATTEMPTS = 5;

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = VerifyCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { email, code } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "No pending signup found for that email." }, { status: 404 });
  }
  if (user.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const entry = await prisma.emailVerificationCode.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  if (!entry) {
    return NextResponse.json({ error: "No active code — request a new one." }, { status: 400 });
  }
  if (entry.expiresAt < new Date()) {
    return NextResponse.json({ error: "That code expired — request a new one." }, { status: 400 });
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Too many attempts — request a new code." }, { status: 429 });
  }

  if (hashCode(code) !== entry.codeHash) {
    await prisma.emailVerificationCode.update({ where: { id: entry.id }, data: { attempts: entry.attempts + 1 } });
    const remaining = MAX_ATTEMPTS - entry.attempts - 1;
    return NextResponse.json({ error: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} left.` }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } }),
    prisma.emailVerificationCode.deleteMany({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({ ok: true });
}

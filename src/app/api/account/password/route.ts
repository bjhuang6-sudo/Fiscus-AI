import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters with a letter and a number." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "This account signs in via OAuth — no password to change." }, { status: 400 });
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  return NextResponse.json({ ok: true });
}

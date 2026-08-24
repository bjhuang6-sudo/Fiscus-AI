import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { memory: true } });
  return NextResponse.json({ memory: user?.memory ?? null });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const memory = typeof body?.memory === "string" ? body.memory.slice(0, 2000) : "";

  await prisma.user.update({ where: { id: session.user.id }, data: { memory: memory || null } });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  await prisma.user.update({ where: { id: session.user.id }, data: { memory: null } });
  return NextResponse.json({ ok: true });
}

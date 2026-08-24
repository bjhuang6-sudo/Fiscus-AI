import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Name must be at least 2 characters." }, { status: 400 });
  }

  await prisma.user.update({ where: { id: session.user.id }, data: { name } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (body?.confirm !== "DELETE") {
    return NextResponse.json({ error: 'Type "DELETE" to confirm.' }, { status: 400 });
  }

  // Chat sessions, holdings, accounts, and verification codes cascade-delete
  // via the User relation's onDelete: Cascade — no manual cleanup needed.
  await prisma.user.delete({ where: { id: session.user.id } });
  return NextResponse.json({ ok: true });
}

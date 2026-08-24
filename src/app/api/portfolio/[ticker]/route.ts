import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ ticker: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { ticker } = await params;
  const body = await req.json().catch(() => null);
  const shares = Number(body?.shares);
  if (!Number.isFinite(shares) || shares <= 0) {
    return NextResponse.json({ error: "Invalid shares." }, { status: 400 });
  }

  await prisma.holding.updateMany({
    where: { userId: session.user.id, ticker: ticker.toUpperCase() },
    data: { shares },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ ticker: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { ticker } = await params;
  await prisma.holding.deleteMany({
    where: { userId: session.user.id, ticker: ticker.toUpperCase() },
  });
  return NextResponse.json({ ok: true });
}

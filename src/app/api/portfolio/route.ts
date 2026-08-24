import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const holdings = await prisma.holding.findMany({
    where: { userId: session.user.id },
    select: { ticker: true, shares: true },
  });
  return NextResponse.json({ holdings });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const ticker = typeof body?.ticker === "string" ? body.ticker.toUpperCase() : "";
  const shares = Number(body?.shares);
  if (!ticker || !Number.isFinite(shares) || shares <= 0) {
    return NextResponse.json({ error: "Invalid ticker or shares." }, { status: 400 });
  }

  await prisma.holding.upsert({
    where: { userId_ticker: { userId: session.user.id, ticker } },
    create: { userId: session.user.id, ticker, shares },
    update: { shares },
  });

  return NextResponse.json({ ok: true });
}

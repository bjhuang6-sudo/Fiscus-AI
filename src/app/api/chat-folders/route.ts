import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const folders = await prisma.chatFolder.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  return NextResponse.json({ folders });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
  if (!name) return NextResponse.json({ error: "Folder name is required." }, { status: 400 });

  const folder = await prisma.chatFolder.create({ data: { userId: session.user.id, name } });
  return NextResponse.json({ id: folder.id, name: folder.name });
}

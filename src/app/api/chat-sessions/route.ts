import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { ChatMessage, ToolCard, ResearchTrailEntry } from "@/lib/types";

const MAX_SESSIONS = 30;

function toChatMessage(row: {
  id: string;
  role: string;
  content: string;
  toolCardsJson: string | null;
  trailJson: string | null;
  isAdvice: boolean;
  createdAt: Date;
}): ChatMessage {
  return {
    id: row.id,
    role: row.role as ChatMessage["role"],
    content: row.content,
    toolCards: row.toolCardsJson ? (JSON.parse(row.toolCardsJson) as ToolCard[]) : undefined,
    trail: row.trailJson ? (JSON.parse(row.trailJson) as ResearchTrailEntry[]) : undefined,
    isAdvice: row.isAdvice || undefined,
    createdAt: row.createdAt.getTime(),
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const rows = await prisma.chatSession.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: MAX_SESSIONS,
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  const sessions = rows.map((row) => ({
    id: row.id,
    title: row.title,
    folderId: row.folderId,
    updatedAt: row.updatedAt.getTime(),
    messages: row.messages.map(toChatMessage),
  }));

  return NextResponse.json({ sessions });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title : "New chat";
  const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];

  let folderId: string | null = typeof body?.folderId === "string" ? body.folderId : null;
  if (folderId) {
    const owned = await prisma.chatFolder.findFirst({ where: { id: folderId, userId: session.user.id } });
    if (!owned) folderId = null;
  }

  const created = await prisma.chatSession.create({
    data: {
      userId: session.user.id,
      title,
      folderId,
      messages: {
        create: messages.map((m) => ({
          role: m.role,
          content: m.content,
          toolCardsJson: m.toolCards ? JSON.stringify(m.toolCards) : null,
          trailJson: m.trail ? JSON.stringify(m.trail) : null,
          isAdvice: Boolean(m.isAdvice),
          createdAt: new Date(m.createdAt),
        })),
      },
    },
  });

  return NextResponse.json({ id: created.id });
}

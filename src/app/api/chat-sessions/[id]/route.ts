import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { ChatMessage } from "@/lib/types";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const owned = await prisma.chatSession.findFirst({ where: { id, userId: session.user.id } });
  if (!owned) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title : undefined;
  const messages: ChatMessage[] | undefined = Array.isArray(body?.messages) ? body.messages : undefined;
  // folderId can be an explicit null (un-file the chat) — distinguish that
  // from "not provided" by checking key presence, not truthiness.
  const folderId: string | null | undefined =
    body && "folderId" in body ? (typeof body.folderId === "string" ? body.folderId : null) : undefined;

  await prisma.$transaction(async (tx) => {
    if (messages) {
      await tx.chatMessageRecord.deleteMany({ where: { chatSessionId: id } });
      await tx.chatSession.update({
        where: { id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(folderId !== undefined ? { folderId } : {}),
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
    } else if (title !== undefined || folderId !== undefined) {
      await tx.chatSession.update({
        where: { id },
        data: { ...(title !== undefined ? { title } : {}), ...(folderId !== undefined ? { folderId } : {}) },
      });
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  await prisma.chatSession.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}

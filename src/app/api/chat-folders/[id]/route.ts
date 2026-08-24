import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  // Chats inside cascade to folderId: null (see schema's onDelete: SetNull) —
  // deleting a folder un-groups its chats rather than deleting them.
  await prisma.chatFolder.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}

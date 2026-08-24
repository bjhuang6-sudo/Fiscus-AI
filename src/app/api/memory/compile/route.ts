import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getAiProvider } from "@/lib/ai";

const MEMORY_SYSTEM_PROMPT = `You maintain a short rolling memory of a user's interests and context across sessions with a finance AI assistant, so future chats can personalize responses without the user repeating themselves.

Given the user's existing memory (if any) and excerpts from their recent conversations, produce an UPDATED memory: a concise bulleted list (max 6 bullets, each under 15 words) covering things like tickers/sectors they follow, investing style or risk tolerance if stated, recurring topics, and explicit preferences they've mentioned.

Merge with the existing memory — keep what's still relevant, drop stale or one-off details, add new signal. Output ONLY the bullet list (one bullet per line, starting with "-"), nothing else. If there is genuinely nothing memory-worthy across everything you were given, output exactly: NONE`;

const MAX_TRANSCRIPT_CHARS = 4000;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const provider = getAiProvider();
  if (!provider) return NextResponse.json({ ok: false, reason: "No AI provider configured." });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const recentSessions = await prisma.chatSession.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 3,
    include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
  });

  const transcriptLines = recentSessions.flatMap((s) => s.messages.map((m) => `${m.role}: ${m.content}`));
  let transcript = transcriptLines.join("\n");
  if (transcript.length > MAX_TRANSCRIPT_CHARS) transcript = transcript.slice(-MAX_TRANSCRIPT_CHARS);

  if (!transcript.trim()) return NextResponse.json({ ok: false, reason: "Nothing to compile yet." });

  try {
    const response = await provider.generateResponse(
      [
        {
          role: "user",
          content: `Existing memory:\n${user.memory ?? "(none yet)"}\n\nRecent conversation excerpts:\n${transcript}`,
        },
      ],
      [],
      MEMORY_SYSTEM_PROMPT
    );

    const compiled = response.content?.trim();
    if (!compiled || compiled === "NONE") {
      return NextResponse.json({ ok: true, updated: false });
    }

    await prisma.user.update({ where: { id: user.id }, data: { memory: compiled } });
    return NextResponse.json({ ok: true, updated: true, memory: compiled });
  } catch (err) {
    console.error("[memory] compile failed:", err);
    return NextResponse.json({ ok: false, reason: "Compile failed." });
  }
}

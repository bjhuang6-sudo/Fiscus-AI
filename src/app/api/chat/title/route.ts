import { NextRequest, NextResponse } from "next/server";
import { getAiProvider } from "@/lib/ai";

function fallbackTitle(message: string): string {
  const trimmed = message.trim().replace(/\s+/g, " ");
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ title: "New chat" });
  }

  const provider = getAiProvider();
  if (!provider) {
    return NextResponse.json({ title: fallbackTitle(message) });
  }

  try {
    const response = await provider.generateResponse(
      [
        {
          role: "user",
          content: `Generate a very short title (max 6 words, no quotes, no trailing punctuation) summarizing this chat opener:\n\n"${message}"`,
        },
      ],
      [],
      "You generate concise chat titles. Reply with ONLY the title text — nothing else, no preamble."
    );
    const title = (response.content ?? "").replace(/["\n]/g, "").trim().slice(0, 60);
    return NextResponse.json({ title: title || fallbackTitle(message) });
  } catch {
    return NextResponse.json({ title: fallbackTitle(message) });
  }
}

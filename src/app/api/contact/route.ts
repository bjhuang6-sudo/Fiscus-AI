import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { ContactSchema } from "@/lib/auth/validation";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { name, email, message } = parsed.data;

  const to = process.env.CONTACT_EMAIL;
  if (!to) {
    return NextResponse.json({ error: "Contact form isn't configured yet." }, { status: 503 });
  }

  const { error } = await sendEmail({
    to,
    subject: `Fiscus AI contact form: ${name}`,
    replyTo: email,
    html: `<p><strong>From:</strong> ${name} (${email})</p><p>${message.replace(/\n/g, "<br/>")}</p>`,
  });

  if (error) {
    return NextResponse.json({ error: `Could not send your message (${error}).` }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

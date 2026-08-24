import { Resend } from "resend";

let client: Resend | null = null;

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

/** Returns an error string on failure instead of throwing — callers decide how loud to be about it. */
export async function sendEmail({ to, subject, html, replyTo }: SendEmailInput): Promise<{ error: string | null }> {
  const resend = getClient();
  if (!resend) {
    return { error: "Email sending isn't configured — RESEND_API_KEY is missing." };
  }

  const from = process.env.EMAIL_FROM ?? "Fiscus AI <onboarding@resend.dev>";

  const { error } = await resend.emails.send({ from, to, subject, html, replyTo });
  if (error) return { error: error.message };
  return { error: null };
}

import NextAuth from "next-auth";
import { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}

/** OAuth buttons only render for providers that actually have credentials configured. */
const oauthProviders = [
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })
    : null,
  process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ? GitHub({ clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET })
    : null,
].filter((p): p is NonNullable<typeof p> => p !== null);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Credentials requires JWT sessions — there's no "account" for the adapter
  // to link a database session to on a plain email/password sign-in.
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const email = typeof raw?.email === "string" ? raw.email.toLowerCase().trim() : "";
        const password = typeof raw?.password === "string" ? raw.password : "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        if (!user.emailVerified) throw new EmailNotVerifiedError();

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
    ...oauthProviders,
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
        token.hasPassword = Boolean(dbUser?.passwordHash);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.hasPassword = Boolean(token.hasPassword);
      }
      return session;
    },
  },
});

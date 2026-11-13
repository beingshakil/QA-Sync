import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { upsertUser } from "@/server/repo";

/**
 * Sign-in is Google only. Sessions are signed JWT cookies (AUTH_SECRET), so no session table.
 * On every sign-in the user is created or updated, joins workspaces they were invited to, and
 * gets their own workspace if they have none (see upsertUser).
 *
 * QASYNC_DEV_LOGIN=1 adds an email-only test login for automated local testing. It is never
 * available on Vercel, whatever the environment says.
 */
export const DEV_LOGIN = process.env.QASYNC_DEV_LOGIN === "1" && !process.env.VERCEL;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Google,
    ...(DEV_LOGIN
      ? [
          Credentials({
            id: "dev",
            name: "Dev login",
            credentials: { email: {}, name: {} },
            authorize: async (c) => {
              const email = String(c?.email ?? "").trim().toLowerCase();
              if (!/^[^@\s]+@[^@\s]+$/.test(email)) return null;
              return { id: email, email, name: String(c?.name ?? "").trim() || email.split("@")[0] };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    signIn({ account, profile }) {
      // Only verified Google addresses: invites are matched by email.
      if (account?.provider === "google") return !!(profile?.email && profile.email_verified);
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const u = await upsertUser({ email: user.email, name: user.name, image: user.image });
        token.uid = u.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.uid && session.user) (session.user as { id?: string }).id = token.uid as string;
      return session;
    },
  },
});

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { upsertUser } from "@/server/repo";
import { after } from "next/server";
import { DRIVE_SCOPE, qasyncFolder, saveGoogleGrant } from "@/server/google";

/**
 * Sign-in is Google only. Sessions are signed JWT cookies (AUTH_SECRET), so no session table.
 * On every sign-in the user is created or updated, joins workspaces they were invited to, and
 * gets their own workspace if they have none (see upsertUser).
 *
 * Google sign-in also asks for Drive (drive.file: only files QASync creates or the person picks),
 * with offline access, so Drive works straight after signing in (see server/google.ts).
 *
 * QASYNC_DEV_LOGIN=1 adds an email-only test login for automated local testing. It is never
 * available on Vercel, whatever the environment says. With QASYNC_DEV_GOOGLE=1 as well, that test
 * login also gets a stand-in Drive grant, for tests against a Google stand-in.
 */
export const DEV_LOGIN = process.env.QASYNC_DEV_LOGIN === "1" && !process.env.VERCEL;

/** The QASync folder appears in Drive right after signing in, without slowing the sign-in down. */
function makeFolderSoon(userId: string) {
  const make = () => qasyncFolder(userId).then(() => undefined, () => undefined); // no Drive permission, or an API is off: made on first use
  try {
    after(make);
  } catch {
    void make();
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Google({
      authorization: { params: { scope: `openid email profile ${DRIVE_SCOPE}`, access_type: "offline", include_granted_scopes: "true" } },
    }),
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
    async jwt({ token, user, account }) {
      if (user?.email) {
        const u = await upsertUser({ email: user.email, name: user.name, image: user.image });
        token.uid = u.id;
        if (account?.provider === "google") {
          // Keep Drive access server-side (encrypted), never in the session cookie.
          await saveGoogleGrant(u.id, {
            email: user.email,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            expiresAt: account.expires_at ? account.expires_at * 1000 : 0,
            scope: account.scope ?? "",
          })
            .then(() => makeFolderSoon(u.id))
            .catch((e) => console.error("Couldn't save the Google Drive grant:", e));
        } else if (account?.provider === "dev" && DEV_LOGIN && process.env.QASYNC_DEV_GOOGLE === "1") {
          await saveGoogleGrant(u.id, { email: user.email, refreshToken: "dev-refresh-token", scope: DRIVE_SCOPE });
          makeFolderSoon(u.id);
        }
      }
      return token;
    },
    session({ session, token }) {
      if (token.uid && session.user) (session.user as { id?: string }).id = token.uid as string;
      return session;
    },
  },
});

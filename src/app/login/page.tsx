import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DEV_LOGIN } from "@/auth";
import { signInDev, signInWithGoogle } from "@/app/actions";
import { getCtx } from "@/server/session";
import { LogoMark, Wordmark } from "@/components/ui";
import { SpiderWeb } from "@/components/marketing/sections";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  AccessDenied: "That Google account couldn't be used. Use an account with a verified email address.",
  Configuration: "Sign-in isn't set up correctly on this server yet.",
  OAuthCallbackError: "Google sign-in was cancelled or failed. Try again.",
};

type Props = { searchParams: Promise<{ next?: string; callbackUrl?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const raw = sp.next ?? sp.callbackUrl ?? "/app/projects";
  // Only same-site paths (Auth.js may pass a full URL of this site).
  let next = "/app/projects";
  try {
    const u = new URL(raw, "http://x");
    if (u.origin === "http://x" || raw.startsWith("http")) next = `${u.pathname}${u.search}`;
  } catch {
    /* keep the default */
  }
  if (!next.startsWith("/") || next.startsWith("//")) next = "/app/projects";
  if (await getCtx()) redirect(next);
  const error = sp.error ? (ERRORS[sp.error] ?? "Sign-in failed. Try again.") : null;

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-paper px-4 py-16">
      <div className="site-glow" aria-hidden />
      <SpiderWeb />
      <div className="relative w-full max-w-sm">
        <Link href="/" className="mx-auto flex w-fit items-center gap-2" aria-label="QASync home">
          <LogoMark className="h-9 w-9" />
          <Wordmark className="text-[22px]" />
        </Link>

        <div className="mt-8 rounded-2xl border border-line bg-surface/90 p-7 shadow-2 backdrop-blur">
          <h1 className="text-center text-[22px] font-semibold tracking-[-0.02em] text-ink">Sign in to QASync</h1>
          <p className="mt-2 text-center text-[14px] leading-relaxed text-ink-3">Use your Google account. New here? Signing in creates your workspace.</p>

          {error && <p className="mt-5 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-[13px] text-danger">{error}</p>}

          <form action={signInWithGoogle} className="mt-6">
            <input type="hidden" name="next" value={next} />
            <button
              type="submit"
              className="flex h-11 w-full items-center justify-center gap-3 rounded-xl bg-white text-[15px] font-medium text-[#1f1f1f] shadow-1 transition hover:bg-[#f2f2f2]"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </form>

          {DEV_LOGIN && (
            <form action={signInDev} className="mt-6 space-y-2 border-t border-dashed border-line pt-5">
              <input type="hidden" name="next" value={next} />
              <div className="text-[12px] font-medium text-ink-3">Local test login (not available when deployed)</div>
              <input name="email" type="email" required placeholder="email@example.com" className="input" aria-label="Test email" />
              <input name="name" placeholder="Name" className="input" aria-label="Test name" />
              <button type="submit" className="h-9 w-full rounded-lg border border-line-strong text-[13px] font-medium text-ink hover:bg-surface-2">
                Sign in for testing
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-[12.5px] leading-relaxed text-ink-3">
          Clients reviewing through a share link don&apos;t need to sign in.
          <br />
          By continuing you agree to the{" "}
          <Link href="/terms" className="underline decoration-line-strong underline-offset-2 hover:text-ink">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline decoration-line-strong underline-offset-2 hover:text-ink">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

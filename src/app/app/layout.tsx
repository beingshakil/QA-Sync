import type { Metadata } from "next";
import { requireCtx } from "@/server/session";
import { AppThemeSync } from "@/components/app/app-theme";
import { ErrorReporter } from "@/components/app/error-reporter";
import { GoogleAccountHint } from "@/components/app/google-drive-card";

/** The app is private to each workspace: keep it out of search results. */
export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCtx(); // signed out → /login
  return (
    <>
      <AppThemeSync />
      <ErrorReporter />
      <GoogleAccountHint email={ctx.email} />
      {children}
    </>
  );
}

import type { Metadata } from "next";
import { requireCtx } from "@/server/session";

/** The app is private to each workspace: keep it out of search results. */
export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireCtx(); // signed out → /login
  return children;
}

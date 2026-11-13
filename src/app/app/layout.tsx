import type { Metadata } from "next";

/** The app is private to each workspace: keep it out of search results. */
export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}

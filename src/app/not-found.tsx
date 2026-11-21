import type { Metadata } from "next";
import { ArrowLeft, FolderKanban } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { SpiderWeb } from "@/components/marketing/sections";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

/** Branded 404 for every unknown URL (site and app): same look as the site, with ways back. */
export default function NotFound() {
  return (
    <div className="site-dark flex min-h-dvh flex-col">
      <Header />
      <main className="relative flex flex-1 items-center overflow-hidden">
        <div className="site-glow site-glow-soft" aria-hidden />
        <SpiderWeb />
        <div className="relative mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 md:py-32">
          <h1 className="mx-auto max-w-3xl text-balance text-[40px] font-semibold leading-[1.04] tracking-[-0.035em] text-ink sm:text-[56px]">
            This page <span className="text-gradient-scroll inline-block">didn&apos;t pass QA.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[34rem] text-pretty text-[17px] leading-relaxed text-ink-2">
            Error 404: the address may be mistyped, or the page has moved. Head back home, or open your projects if you were in the app.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/" size="lg">
              <ArrowLeft size={16} /> Back to home
            </ButtonLink>
            <ButtonLink href="/app/projects" size="lg" variant="secondary">
              <FolderKanban size={16} /> Your projects
            </ButtonLink>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

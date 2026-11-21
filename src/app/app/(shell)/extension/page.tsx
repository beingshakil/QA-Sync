import type { Metadata } from "next";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { ExtensionConnect, ExtensionConnections } from "@/components/app/extension-connect";
import { requireCtx } from "@/server/session";
import { listApiTokens } from "@/server/tokens";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Browser extension" };

const STEPS = [
  "Download the extension and unzip it.",
  "Open chrome://extensions (or edge://extensions) and switch on Developer mode.",
  "Click “Load unpacked” and choose the unzipped folder.",
  "Pin QASync to the toolbar, click it on any page, then connect this browser.",
];

/** Install, connect and manage the QASync browser extension (source: /extension in the repo). */
export default async function ExtensionPage({ searchParams }: { searchParams: Promise<{ connect?: string }> }) {
  const ctx = await requireCtx();
  const { connect } = await searchParams;
  const tokens = await listApiTokens(ctx.workspaceId, "extension");
  return (
    <>
      <PageHeader title="Browser extension" sub="Review pages the canvas can't open: staging behind a login, local builds and sites that refuse to be framed." />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        {connect === "1" && <ExtensionConnect highlight />}

        <section className="rounded-2xl border border-line bg-surface p-6 shadow-1">
          <h2 className="font-semibold">Install</h2>
          <p className="mt-1 text-[13.5px] text-ink-2">Works in Chrome, Edge, Brave and other Chromium browsers. A store listing comes later.</p>
          <ol className="mt-4 space-y-2 text-[14px] text-ink-2">
            {STEPS.map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 font-mono text-[12px] text-ink">{i + 1}</span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
          <a
            href="/downloads/qasync-extension.zip"
            download
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-grad-brand px-4 text-sm font-medium text-white shadow-1 hover:brightness-105"
          >
            <Download size={15} /> Download extension (.zip)
          </a>
        </section>

        {connect !== "1" && <ExtensionConnect highlight={false} />}
        <ExtensionConnections tokens={tokens} />
      </div>
    </>
  );
}

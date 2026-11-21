"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui";
import { cn, timeAgo } from "@/lib/utils";
import type { ErrorEvent, ErrorKind } from "@/server/monitor";

const KIND: Record<ErrorKind, { label: string; hint: string; tone: string }> = {
  preview: { label: "Preview", hint: "A canvas frame never loaded (often the site refuses to be framed)", tone: "bg-danger-soft text-danger" },
  proxy: { label: "Proxy", hint: "The review proxy couldn't fetch a page, or the site answered with an error", tone: "bg-[color-mix(in_srgb,var(--st-progress)_14%,transparent)] text-[var(--st-progress)]" },
  asset: { label: "Asset", hint: "A script, stylesheet or font couldn't be loaded through the proxy", tone: "bg-surface-2 text-ink-2" },
  shot: { label: "Screenshot", hint: "A screenshot capture failed", tone: "bg-[color-mix(in_srgb,var(--st-progress)_14%,transparent)] text-[var(--st-progress)]" },
  audit: { label: "Audit", hint: "An SEO audit failed", tone: "bg-blue-soft text-blue" },
  integration: { label: "Integration", hint: "Sending to or syncing with Notion failed", tone: "bg-[color-mix(in_srgb,var(--st-progress)_14%,transparent)] text-[var(--st-progress)]" },
  client: { label: "App", hint: "A JavaScript error in the app", tone: "bg-danger-soft text-danger" },
};

/** Grouped problems recorded by src/server/monitor.ts, newest first. Site admins only. */
export function AdminErrors({ initial }: { initial: ErrorEvent[] }) {
  const router = useRouter();
  const [events, setEvents] = useState(initial);
  const [kind, setKind] = useState<ErrorKind | "all">("all");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Partial<Record<ErrorKind, number>> = {};
    for (const e of events) c[e.kind] = (c[e.kind] ?? 0) + 1;
    return c;
  }, [events]);
  const shown = kind === "all" ? events : events.filter((e) => e.kind === kind);

  async function clear(key?: string) {
    setBusy(key ?? "all");
    try {
      await fetch(`/api/errors${key ? `?key=${encodeURIComponent(key)}` : ""}`, { method: "DELETE" });
      setEvents((ev) => (key ? ev.filter((e) => e.key !== key) : []));
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface shadow-1">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={16} className="text-[var(--st-progress)]" /> Errors
          </h2>
          <p className="text-[12.5px] text-ink-3">Problems across the site and app, grouped and counted. Sites the preview can&apos;t load show up as Preview and Proxy.</p>
        </div>
        {events.length > 0 && (
          <Button variant="secondary" size="sm" loading={busy === "all"} onClick={() => clear()}>
            Clear all
          </Button>
        )}
      </header>

      {events.length === 0 ? (
        <div className="flex items-center gap-3 px-5 py-8 text-[13.5px] text-ink-2">
          <CheckCircle2 size={18} className="text-pass" /> Nothing recorded. New problems appear here as they happen.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5 border-b border-line px-5 py-3">
            {(["all", ...Object.keys(KIND)] as (ErrorKind | "all")[])
              .filter((k) => k === "all" || counts[k as ErrorKind])
              .map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={cn("rounded-full border px-3 py-1 text-[12.5px] transition", kind === k ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-ink-2 hover:border-line-strong hover:text-ink")}
                >
                  {k === "all" ? `All · ${events.length}` : `${KIND[k as ErrorKind].label} · ${counts[k as ErrorKind]}`}
                </button>
              ))}
          </div>
          <ul className="divide-y divide-line">
            {shown.map((e) => (
              <li key={e.key} className="px-5 py-3.5">
                <div className="flex items-start gap-3">
                  <span title={KIND[e.kind]?.hint} className={cn("mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[11.5px] font-medium", KIND[e.kind]?.tone)}>
                    {KIND[e.kind]?.label ?? e.kind}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] text-ink">
                      {e.host && <span className="mr-1.5 font-mono text-[12.5px] text-ink-2">{e.host}</span>}
                      {e.message}
                    </div>
                    <div className="mt-0.5 text-[12px] text-ink-3">
                      {e.count}× · last {timeAgo(e.lastAt)} · first {timeAgo(e.firstAt)}
                    </div>
                    {open === e.key && (e.url || e.detail) && (
                      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-surface-2 p-3 font-mono text-[11.5px] text-ink-2">
                        {[e.url, e.detail].filter(Boolean).join("\n\n")}
                      </pre>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {(e.url || e.detail) && (
                      <button
                        onClick={() => setOpen(open === e.key ? null : e.key)}
                        aria-label={open === e.key ? "Hide details" : "Show details"}
                        aria-expanded={open === e.key}
                        className="rounded-md p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink"
                      >
                        <ChevronDown size={15} className={cn("transition", open === e.key && "rotate-180")} />
                      </button>
                    )}
                    <button onClick={() => clear(e.key)} disabled={busy === e.key} aria-label="Dismiss" title="Dismiss" className="rounded-md p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink disabled:opacity-50">
                      <X size={15} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

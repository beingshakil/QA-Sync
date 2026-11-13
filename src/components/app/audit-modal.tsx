"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Gauge, Loader2, X } from "lucide-react";
import { api } from "@/lib/api";
import type { Audit, Project } from "@/lib/types";
import { Button } from "@/components/ui";
import { AuditReport } from "./audit-report";

type State = { kind: "loading" } | { kind: "empty" } | { kind: "running" } | { kind: "ready"; audit: Audit } | { kind: "error"; message: string };

/** SEO audit report for the page open in the review canvas, as a popup. */
export function AuditModal({ project, pageUrl, onClose }: { project: Project; pageUrl: string; onClose: () => void }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    api
      .latestAudit(project.id, pageUrl)
      .then((a) => alive && setState(a ? { kind: "ready", audit: a } : { kind: "empty" }))
      .catch((e: Error) => alive && setState({ kind: "error", message: e.message }));
    return () => {
      alive = false;
    };
  }, [project.id, pageUrl]);

  // Esc closes; keys typed in the popup must not reach the canvas shortcuts (C, I, B, F…).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    panelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  async function run() {
    setState({ kind: "running" });
    try {
      setState({ kind: "ready", audit: await api.runAudit(project.id, pageUrl) });
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    }
  }

  return (
    <div className="animate-fade fixed inset-0 z-[90] flex items-stretch justify-center bg-ink/45 p-2 backdrop-blur-sm sm:p-6" onMouseDown={onClose} role="presentation">
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="SEO audit report"
        onMouseDown={(e) => e.stopPropagation()}
        // Focus lands on the panel so Esc works at once; it's not an interactive control, so no ring.
        style={{ outline: "none" }}
        className="animate-pop relative flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-2"
      >
        {state.kind === "ready" ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <AuditReport audit={state.audit} project={project} embedded={{ onRerun: (a) => setState({ kind: "ready", audit: a }), onClose }} />
          </div>
        ) : (
          <>
            <button
              onClick={onClose}
              aria-label="Close"
              title="Close (Esc)"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 hover:text-ink"
            >
              <X size={16} />
            </button>
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="w-full max-w-md text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-grad-soft text-brand-ink">
                  {state.kind === "loading" || state.kind === "running" ? <Loader2 size={22} className="animate-spin" /> : state.kind === "error" ? <AlertTriangle size={22} className="text-danger" /> : <Gauge size={22} />}
                </div>
                <h2 className="mt-4 text-lg font-semibold">
                  {state.kind === "loading" ? "Loading the report…" : state.kind === "running" ? "Auditing this page…" : state.kind === "error" ? "The audit didn't finish" : "No audit for this page yet"}
                </h2>
                <p className="mx-auto mt-2 break-all font-mono text-[12px] text-ink-3">{pageUrl}</p>
                <p className="mt-3 text-[14px] text-ink-2">
                  {state.kind === "running"
                    ? "Reading titles, headings, images, schema and Open Graph, and checking up to 60 links. Usually 5–20 seconds."
                    : state.kind === "error"
                      ? state.message
                      : state.kind === "empty"
                        ? "Run one to see on-page and technical SEO for this page, with a fix for every red item."
                        : ""}
                </p>
                {(state.kind === "empty" || state.kind === "error") && (
                  <Button className="mt-5" onClick={run}>
                    <Gauge size={15} /> {state.kind === "error" ? "Try again" : "Run SEO audit"}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

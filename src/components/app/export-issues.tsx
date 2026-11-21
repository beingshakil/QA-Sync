"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, FileSpreadsheet, Loader2 } from "lucide-react";
import { STATUS_LABEL, PRIORITY_LABEL, type Issue } from "@/lib/types";
import { downloadCsv, exportToSheets, googleExportReady, preloadGoogle } from "@/lib/google-drive";
import { cn } from "@/lib/utils";

const HEADER = ["#", "Title", "Status", "Priority", "Assignee", "Reporter", "Page", "Device", "Created", "Comment", "Link"];

function rows(issues: Issue[]) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return issues.map((i) => [
    i.number,
    i.title,
    STATUS_LABEL[i.status],
    PRIORITY_LABEL[i.priority],
    i.assignee ?? "",
    i.reporterName,
    i.pageUrl,
    i.device,
    i.createdAt.slice(0, 16).replace("T", " "),
    i.body,
    `${origin}/app/projects/${i.projectId}/review?issue=${i.id}`,
  ]);
}

/** Issue lists: Export → CSV (always) or a new Google Sheet (when Google Drive is set up). */
export function ExportIssues({ issues, name }: { issues: Issue[]; name: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const google = googleExportReady();

  useEffect(() => {
    if (!open) return;
    preloadGoogle();
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const day = new Date().toISOString().slice(0, 10);
  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13.5px] text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-50";

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm text-ink-2 hover:border-line-strong hover:text-ink"
      >
        <Download size={14} /> Export
      </button>
      {open && (
        <div role="menu" className="animate-pop absolute right-0 top-11 z-30 w-72 rounded-xl border border-line bg-surface p-1.5 shadow-2">
          <button role="menuitem" className={item} onClick={() => (downloadCsv(`qasync-issues-${day}.csv`, HEADER, rows(issues)), setOpen(false))}>
            <Download size={15} className="shrink-0" /> Download CSV <span className="ml-auto text-[12px] text-ink-3">{issues.length}</span>
          </button>
          <button
            role="menuitem"
            className={item}
            disabled={!google || busy}
            title={google ? undefined : "Google Drive isn't set up on this server yet"}
            onClick={async () => {
              setBusy(true);
              setErr(null);
              setSheet(null);
              try {
                setSheet(await exportToSheets(`QASync issues · ${name} · ${day}`, HEADER, rows(issues)));
              } catch (e) {
                setErr((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Loader2 size={15} className="shrink-0 animate-spin" /> : <FileSpreadsheet size={15} className="shrink-0" />}
            {busy ? "Creating the sheet…" : "Export to Google Sheets"}
          </button>
          {sheet && (
            <a href={sheet} target="_blank" rel="noreferrer" className={cn(item, "font-medium text-brand-ink")}>
              <ExternalLink size={15} className="shrink-0" /> Open the sheet
            </a>
          )}
          {err && (
            <p role="alert" className="px-3 py-2 text-[12.5px] text-danger">
              {err}
            </p>
          )}
          <p className="px-3 pb-1.5 pt-1 text-[11.5px] leading-snug text-ink-3">Exports the issues shown with the current filters. Sheets are saved to the QASync folder in your Google Drive.</p>
        </div>
      )}
    </div>
  );
}

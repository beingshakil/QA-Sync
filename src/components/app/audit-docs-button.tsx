"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FileText } from "lucide-react";
import { Button, buttonClass } from "@/components/ui";
import { googleExportReady, preloadGoogle, saveAsGoogleDoc } from "@/lib/google-drive";
import { seoChecks } from "@/lib/seo-checks";
import type { Audit } from "@/lib/types";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** The report as simple HTML, which Drive converts into a native Google Doc. */
function reportHtml(audit: Audit) {
  const checks = audit.seo ? seoChecks(audit.seo) : [];
  const passed = checks.filter((c) => c.pass).length;
  const score = checks.length ? Math.round((passed / checks.length) * 100) : audit.score;
  const verdict = score >= 85 ? "Strong SEO foundation" : score >= 60 ? "Needs a few fixes" : "Needs work";
  const when = new Date(audit.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  const url = audit.seo?.finalUrl ?? audit.url;
  const td = 'style="border:1px solid #d5dae5;padding:6px 8px;vertical-align:top"';
  const rows = checks
    .map(
      (c) =>
        `<tr><td ${td}><b>${esc(c.label)}</b></td><td style="border:1px solid #d5dae5;padding:6px 8px;vertical-align:top;color:${c.pass ? "#12804f" : "#c8364a"}"><b>${c.pass ? "Pass" : "Fix"}</b> · ${esc(c.badge)}</td><td ${td}>${esc(c.value ?? "Not found")}${c.meta ? `<br><small>${esc(c.meta)}</small>` : ""}</td><td ${td}>${esc(c.fix ?? "")}</td></tr>`,
    )
    .join("");
  const findings = audit.findings
    .map((f) => `<li><b>${esc(f.severity)}</b>: ${esc(f.message)}${f.detail ? ` (${esc(f.detail)})` : ""}</li>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(audit.seo?.title || url)}</title></head><body>
<h1>SEO audit: ${esc(audit.seo?.title || url)}</h1>
<p><a href="${esc(url)}">${esc(url)}</a> · audited ${esc(when)} with QASync</p>
<h2>${score}/100 · ${esc(verdict)}</h2>
<p>${passed} of ${checks.length} checks passed.</p>
${checks.length ? `<table style="border-collapse:collapse;width:100%"><tr><th ${td}>Check</th><th ${td}>Result</th><th ${td}>What the page has</th><th ${td}>Fix</th></tr>${rows}</table>` : ""}
${findings ? `<h2>Other checks</h2><ul>${findings}</ul>` : ""}
</body></html>`;
}

/** Audit report header: "Save to Google Docs" (only when Google Drive is set up). */
export function AuditDocsButton({ audit }: { audit: Audit }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => preloadGoogle(), []);
  if (!googleExportReady()) return null;
  if (url)
    return (
      <a href={url} target="_blank" rel="noreferrer" className={buttonClass("secondary", "md")}>
        <ExternalLink size={15} /> Open the Google Doc
      </a>
    );
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="secondary"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          try {
            setUrl(await saveAsGoogleDoc(`SEO audit · ${audit.seo?.title || audit.url}`, reportHtml(audit)));
          } catch (e) {
            setErr((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {!busy && <FileText size={15} />} Save to Google Docs
      </Button>
      {err && <span className="text-[12px] text-danger">{err}</span>}
    </div>
  );
}

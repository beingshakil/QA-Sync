"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button, buttonClass } from "@/components/ui";
import { IntegrationIcon } from "@/components/integration-icon";

/** Issue detail: "Send to Notion" (or "Open in Notion" once sent). Shown only when the project is linked. */
export function NotionIssueButton({ issueId }: { issueId: string }) {
  const [st, setSt] = useState<{ linked: boolean; url: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/integrations/notion/push?issueId=${encodeURIComponent(issueId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setSt(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [issueId]);

  if (!st?.linked) return null;
  if (st.url)
    return (
      <a href={st.url} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
        <IntegrationIcon name="Notion" size={13} /> Open in Notion <ExternalLink size={12} />
      </a>
    );
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          try {
            const res = await fetch("/api/integrations/notion/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ issueId }) });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error ?? "Couldn't send to Notion");
            setSt({ linked: true, url: d.url });
          } catch (e) {
            setErr((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {!busy && <IntegrationIcon name="Notion" size={13} />} Send to Notion
      </Button>
      {err && <span role="alert" className="text-[12px] text-danger">{err}</span>}
    </span>
  );
}

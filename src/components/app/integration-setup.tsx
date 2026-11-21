"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, FolderOpen, X } from "lucide-react";
import { Button, buttonClass } from "@/components/ui";
import { IntegrationIcon } from "@/components/integration-icon";
import { connectGoogleDrive, googleExportReady, savedDriveLink, setGoogleConfig, type GoogleConfig } from "@/lib/google-drive";

/** GET /api/integrations/setup */
export type SetupInfo = {
  canSetup: boolean;
  origin: string;
  notion: { configured: boolean; source: "env" | "app" | null; redirectUri: string };
  google: { configured: boolean; source: "env" | "app" | null; clientId: string | null; hasApiKey: boolean; signInClientId: string | null };
};

export function useSetupInfo(enabled = true) {
  const [info, setInfo] = useState<SetupInfo | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetch("/api/integrations/setup")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setInfo(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [enabled]);
  return info;
}

async function post<T>(body: unknown): Promise<T> {
  const res = await fetch("/api/integrations/setup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error ?? "Couldn't save");
  return d as T;
}

/** A centred popup over everything (portalled, so no parent layout can clip it). */
export function SetupDialog({ title, icon, onClose, children }: { title: string; icon: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return createPortal(
    <div className="animate-fade fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/55 p-4 pt-[8vh] backdrop-blur-sm" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="animate-pop w-full max-w-lg rounded-2xl border border-line bg-surface shadow-2" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 text-ink">
            <IntegrationIcon name={icon} size={17} />
          </span>
          <h2 className="min-w-0 flex-1 text-[16px] font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink">
            <X size={17} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-soft font-mono text-[12px] font-semibold text-blue">{n}</span>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="text-[14px] font-medium text-ink">{title}</div>
        {children}
      </div>
    </li>
  );
}

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <input readOnly value={value} aria-label={label} onFocus={(e) => e.target.select()} className="input min-w-0 flex-1 font-mono text-[12px]" />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-10 shrink-0"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            window.prompt(label, value);
          }
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

const Ext = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
    {children} <ExternalLink size={12} />
  </a>
);

function AskAdmin({ what }: { what: string }) {
  return (
    <p className="rounded-lg bg-surface-2 px-3 py-2.5 text-[13.5px] text-ink-2">
      {what} isn&apos;t turned on for QASync yet. Ask a QASync admin to set it up; it takes them about two minutes, once.
    </p>
  );
}

/** One-time Notion setup: create the integration, paste two keys. */
export function NotionKeysForm({ info, onSaved }: { info: SetupInfo; onSaved: () => void }) {
  const [clientId, setClientId] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!info.canSetup) return <AskAdmin what="Notion" />;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          await post({ notion: { clientId, clientSecret: secret } });
          onSaved();
        } catch (e) {
          setErr((e as Error).message);
          setBusy(false);
        }
      }}
    >
      <p className="mb-4 text-[13.5px] text-ink-2">Turn on Notion for QASync. You do this once; after that everyone just clicks Connect.</p>
      <ol className="space-y-5">
        <Step n={1} title="Create a Notion integration">
          <p className="text-[13px] text-ink-3">
            Choose <b className="text-ink-2">Public</b>, then paste this as its redirect URL:
          </p>
          <CopyField value={info.notion.redirectUri} label="Redirect URL" />
          <Ext href="https://www.notion.so/profile/integrations">Open Notion integrations</Ext>
        </Step>
        <Step n={2} title="Paste its keys">
          <input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="OAuth client ID" aria-label="Notion OAuth client ID" className="input font-mono text-[13px]" autoComplete="off" required />
          <input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="OAuth client secret" aria-label="Notion OAuth client secret" type="password" className="input font-mono text-[13px]" autoComplete="off" required />
        </Step>
      </ol>
      {err && (
        <p role="alert" className="mt-4 text-[13px] text-danger">
          {err}
        </p>
      )}
      <div className="mt-5 flex justify-end">
        <Button type="submit" loading={busy}>
          Save and connect
        </Button>
      </div>
    </form>
  );
}

/** One-time Google Drive setup: two console switches, one origin, one client ID (pre-filled). */
export function GoogleKeysForm({ info, onSaved }: { info: SetupInfo; onSaved: (cfg: GoogleConfig) => void }) {
  const [clientId, setClientId] = useState(info.google.clientId ?? info.google.signInClientId ?? "");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!info.canSetup) return <AskAdmin what="Google Drive" />;
  const prefilled = !!info.google.signInClientId && clientId === info.google.signInClientId;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          const r = await post<{ google: GoogleConfig }>({ google: { clientId, apiKey } });
          onSaved(r.google);
        } catch (e) {
          setErr((e as Error).message);
          setBusy(false);
        }
      }}
    >
      <p className="mb-4 text-[13.5px] text-ink-2">Turn on Google Drive for QASync. You do this once in Google Cloud, in the project you use for Google sign-in.</p>
      <ol className="space-y-5">
        <Step n={1} title="Turn on two Google APIs">
          <div className="flex flex-wrap gap-2">
            <Ext href="https://console.cloud.google.com/apis/library/drive.googleapis.com">Google Drive API</Ext>
            <Ext href="https://console.cloud.google.com/apis/library/sheets.googleapis.com">Google Sheets API</Ext>
          </div>
        </Step>
        <Step n={2} title="Allow this site on your OAuth client">
          <p className="text-[13px] text-ink-3">
            Under <b className="text-ink-2">Authorized JavaScript origins</b>, add:
          </p>
          <CopyField value={info.origin} label="JavaScript origin" />
          <Ext href="https://console.cloud.google.com/apis/credentials">Open Credentials</Ext>
        </Step>
        <Step n={3} title="OAuth client ID">
          <input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="…apps.googleusercontent.com" aria-label="Google OAuth client ID" className="input font-mono text-[12.5px]" autoComplete="off" required />
          {prefilled && <p className="text-[12.5px] text-ink-3">Filled in with the client you already use for Google sign-in.</p>}
          <details className="group text-[13px]">
            <summary className="cursor-pointer select-none text-ink-3 hover:text-ink">Also pick designs from Drive (optional)</summary>
            <div className="mt-2 space-y-2">
              <p className="text-[12.5px] text-ink-3">Turn on the Google Picker API and paste a browser API key.</p>
              <div className="flex flex-wrap gap-2">
                <Ext href="https://console.cloud.google.com/apis/library/picker.googleapis.com">Google Picker API</Ext>
              </div>
              <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API key (optional)" aria-label="Google API key" className="input font-mono text-[12.5px]" autoComplete="off" />
            </div>
          </details>
        </Step>
      </ol>
      {err && (
        <p role="alert" className="mt-4 text-[13px] text-danger">
          {err}
        </p>
      )}
      <div className="mt-5 flex justify-end">
        <Button type="submit" loading={busy}>
          Save and connect
        </Button>
      </div>
    </form>
  );
}

/** Google Drive in a popup: set up the app's keys if needed, then connect (creates the QASync folder). */
export function DriveSetup({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [ready, setReady] = useState(googleExportReady());
  const info = useSetupInfo(!ready);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [link, setLink] = useState(savedDriveLink());

  async function connect() {
    setBusy(true);
    setErr(null);
    try {
      setLink(await connectGoogleDrive());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    if (!info) return <p className="text-[13px] text-ink-3">Loading…</p>;
    return (
      <GoogleKeysForm
        info={info}
        onSaved={(cfg) => {
          setGoogleConfig(cfg);
          setReady(true);
          router.refresh(); // other screens pick up the new keys too
          void connect(); // straight on to Google's consent popup
        }}
      />
    );
  }

  if (link)
    return (
      <div className="space-y-4">
        <p role="status" className="rounded-lg bg-pass-soft px-3 py-2.5 text-[13.5px] text-ink">
          Google Drive is connected{link.email ? ` as ${link.email}` : ""}. Sheets go to the <b>QASync</b> folder.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <a href={link.folderUrl} target="_blank" rel="noreferrer" className={buttonClass("secondary", "md")}>
            <FolderOpen size={15} /> Open the QASync folder
          </a>
          <Button onClick={onDone}>Done</Button>
        </div>
      </div>
    );

  return (
    <div className="space-y-4">
      <p className="text-[13.5px] text-ink-2">Connect your Google account. QASync makes a QASync folder in your Drive and can only see that folder and the files it creates.</p>
      {err && (
        <p role="alert" className="text-[13px] text-danger">
          {err}
        </p>
      )}
      <div className="flex justify-end">
        <Button loading={busy} onClick={connect}>
          Connect Google Drive
        </Button>
      </div>
    </div>
  );
}

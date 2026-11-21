"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, ExternalLink, FolderOpen, X } from "lucide-react";
import { Button, buttonClass } from "@/components/ui";
import { IntegrationIcon } from "@/components/integration-icon";
import { DRIVE_FOLDER_NAME, driveStatus, type DriveStatus } from "@/lib/google-drive";
import { ConnectDriveButton } from "@/components/app/google-connect";

/** GET /api/integrations/setup */
export type SetupInfo = {
  canSetup: boolean;
  origin: string;
  notion: { configured: boolean; source: "env" | "app" | null; redirectUri: string };
  google: { available: boolean; picker: boolean; pickerSource: "env" | "app" | null; project: string | null };
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

/** Admins, once: the sign-in client's Cloud project needs the Drive and Sheets APIs (and, to pick designs, the Picker API and a key). */
function GoogleApisSetup({ info }: { info: SetupInfo }) {
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(info.google.picker);
  const n = info.google.project;
  const api = (id: string) => (n ? `https://console.developers.google.com/apis/api/${id}/overview?project=${n}` : `https://console.cloud.google.com/apis/library/${id}`);
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="mb-3 text-[12.5px] font-medium uppercase tracking-wide text-ink-3">For admins · once in Google Cloud</div>
      <ol className="space-y-5">
        <Step n={1} title="Allow this site's sign-in address">
          <p className="text-[13px] text-ink-3">
            On your OAuth client, under <b className="text-ink-2">Authorized redirect URIs</b>, add (one per site address you use, such as localhost and the live site):
          </p>
          <CopyField value={`${info.origin}/api/auth/callback/google`} label="Redirect URI" />
          <Ext href={n ? `https://console.cloud.google.com/apis/credentials?project=${n}` : "https://console.cloud.google.com/apis/credentials"}>Open Credentials</Ext>
        </Step>
        <Step n={2} title="Turn on two Google APIs">
          <p className="text-[13px] text-ink-3">In the project you use for “Sign in with Google”.</p>
          <div className="flex flex-wrap gap-2">
            <Ext href={api("drive.googleapis.com")}>Google Drive API</Ext>
            <Ext href={api("sheets.googleapis.com")}>Google Sheets API</Ext>
          </div>
        </Step>
        <Step n={3} title="Pick designs from Drive (optional)">
          {saved ? (
            <p className="flex items-center gap-1.5 text-[13px] text-ink-2">
              <Check size={14} className="text-[var(--st-verified)]" /> Picking designs from Drive is on.
            </p>
          ) : (
            <form
              className="space-y-2"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setErr(null);
                try {
                  await post({ google: { apiKey } });
                  setSaved(true);
                } catch (e) {
                  setErr((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <p className="text-[13px] text-ink-3">Turn on the Google Picker API, then paste a browser API key.</p>
              <div className="flex flex-wrap gap-2">
                <Ext href={api("picker.googleapis.com")}>Google Picker API</Ext>
                <Ext href={n ? `https://console.cloud.google.com/apis/credentials?project=${n}` : "https://console.cloud.google.com/apis/credentials"}>Create an API key</Ext>
              </div>
              <div className="flex gap-2">
                <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API key" aria-label="Google API key" className="input min-w-0 flex-1 font-mono text-[12.5px]" autoComplete="off" required />
                <Button type="submit" variant="secondary" size="sm" className="h-10 shrink-0" loading={busy}>
                  Save
                </Button>
              </div>
              {err && (
                <p role="alert" className="text-[12.5px] text-danger">
                  {err}
                </p>
              )}
            </form>
          )}
        </Step>
      </ol>
    </div>
  );
}

/** Google Drive in a popup: connect (Google sign-in with Drive permission) and, for admins, the one-time Cloud switches. */
export function DriveSetup({ email, onDone }: { email?: string; onDone: () => void }) {
  const info = useSetupInfo();
  const [st, setSt] = useState<DriveStatus | null>(null);
  useEffect(() => {
    driveStatus()
      .then(setSt)
      .catch(() => {});
  }, []);
  if (!info || !st) return <p className="text-[13px] text-ink-3">Loading…</p>;

  return (
    <div className="space-y-5">
      {!info.google.available ? (
        info.canSetup ? (
          <p className="rounded-lg bg-surface-2 px-3 py-2.5 text-[13.5px] text-ink-2">
            Google Drive works through “Sign in with Google”, which isn&apos;t set up here yet: add <code className="font-mono text-[12px]">AUTH_GOOGLE_ID</code> and{" "}
            <code className="font-mono text-[12px]">AUTH_GOOGLE_SECRET</code> to the server.
          </p>
        ) : (
          <AskAdmin what="Google Drive" />
        )
      ) : st.connected ? (
        <div className="space-y-3">
          <p role="status" className="rounded-lg bg-pass-soft px-3 py-2.5 text-[13.5px] text-ink">
            Google Drive is connected{st.email ? ` as ${st.email}` : ""}. Sheets and docs go to the <b>{DRIVE_FOLDER_NAME}</b> folder.
          </p>
          {st.folderUrl && (
            <a href={st.folderUrl} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
              <FolderOpen size={14} /> Open the {DRIVE_FOLDER_NAME} folder
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[13.5px] text-ink-2">
            Connect with your Google account. QASync makes a {DRIVE_FOLDER_NAME} folder in your Drive and can only see that folder and the files it creates or you pick.
          </p>
          <ConnectDriveButton email={email} />
        </div>
      )}

      {info.canSetup && info.google.available && <GoogleApisSetup info={info} />}

      <div className="flex justify-end">
        <Button variant="secondary" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}

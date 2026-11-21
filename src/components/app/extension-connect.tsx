"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Chrome, Unplug } from "lucide-react";
import { Button } from "@/components/ui";
import { cn, timeAgo } from "@/lib/utils";
import type { ApiToken } from "@/lib/types";

function browserName() {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "Edge";
  if (/Brave/.test(ua) || (navigator as Navigator & { brave?: unknown }).brave) return "Brave";
  if (/OPR\//.test(ua)) return "Opera";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  return "Browser";
}

/**
 * "Connect this browser": mints an extension token on click (never on page load) and leaves it in
 * #qasync-extension-token, where the extension's injected script picks it up (extension/background.js).
 */
export function ExtensionConnect({ highlight }: { highlight: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ token: string; userName: string; workspaceName: string } | null>(null);

  async function connect() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/extension/connect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ browser: browserName() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't connect");
      setDone(data);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={cn("rounded-2xl border bg-surface p-6 shadow-1", highlight ? "border-brand ring-1 ring-brand/30" : "border-line")}>
      <h2 className="font-semibold">Connect this browser</h2>
      <p className="mt-1 text-[13.5px] text-ink-2">
        Links the extension to your account and this workspace. The extension then signs your comments as you. You can disconnect it below at any time.
      </p>
      {done ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl bg-pass-soft px-4 py-3 text-[13.5px] text-ink">
          <CheckCircle2 size={18} className="mt-px shrink-0 text-pass" />
          <div>
            <div className="font-medium">Connected as {done.userName} in {done.workspaceName}.</div>
            <div className="text-ink-2">If the extension opened this tab, it has picked up the connection and you can close the tab.</div>
          </div>
          {/* Read by the extension (extension/background.js); never shown or sent anywhere else. */}
          <div id="qasync-extension-token" data-token={done.token} hidden />
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button loading={busy} onClick={connect}>
            {!busy && <Chrome size={15} />} Connect this browser
          </Button>
          {err && (
            <p role="alert" className="text-sm text-danger">
              {err}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export function ExtensionConnections({ tokens }: { tokens: ApiToken[] }) {
  const router = useRouter();
  const [items, setItems] = useState(tokens);
  const [busy, setBusy] = useState<string | null>(null);

  async function disconnect(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/tokens/${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((xs) => xs.filter((t) => t.id !== id));
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface shadow-1">
      <div className="border-b border-line px-6 py-4">
        <h2 className="font-semibold">Connected browsers</h2>
        <p className="text-[13px] text-ink-3">Each one can comment as you in this workspace until you disconnect it.</p>
      </div>
      {items.length === 0 ? (
        <p className="px-6 py-5 text-[13.5px] text-ink-3">No browsers connected yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-6 py-3.5">
              <Chrome size={16} className="shrink-0 text-ink-3" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-medium">{t.name}</div>
                <div className="text-[12px] text-ink-3">{t.lastUsedAt ? `Last used ${timeAgo(t.lastUsedAt)}` : "Not used yet"}</div>
              </div>
              <Button variant="secondary" size="sm" loading={busy === t.id} onClick={() => disconnect(t.id)}>
                {busy !== t.id && <Unplug size={14} />} Disconnect
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

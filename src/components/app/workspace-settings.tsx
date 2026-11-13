"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Mail, X } from "lucide-react";
import { api } from "@/lib/api";
import type { Workspace } from "@/lib/types";
import { useConfirm } from "@/components/confirm";
import { Avatar, Button } from "@/components/ui";
import { cn } from "@/lib/utils";

const ROLE = { owner: "Owner", admin: "Admin", member: "Member" } as const;

/** Profile, workspace name, team (invite by Google email), and switching between workspaces. */
export function WorkspaceSettings({ initial, workspaces, activeId }: { initial: Workspace; workspaces: { id: string; name: string }[]; activeId: string }) {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const [ws, setWs] = useState(initial);
  const [userName, setUserName] = useState(initial.userName);
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const admin = ws.role === "owner" || ws.role === "admin";

  async function update(patch: Parameters<typeof api.updateWorkspace>[0], after?: () => void) {
    setErr(null);
    setBusy(true);
    try {
      const next = await api.updateWorkspace(patch);
      setWs(next);
      after?.();
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    await update({ userName, ...(admin ? { name } : {}) }, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    });
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    await update({ invite: email.trim() }, () => setEmail(""));
  }

  async function remove(userId: string, who: string) {
    const yes = await confirmDialog({
      title: `Remove ${who}?`,
      message: "They lose access to this workspace's projects right away. Their comments stay.",
      confirmLabel: "Remove",
    });
    if (yes) await update({ removeMember: userId });
  }

  async function switchTo(id: string) {
    setBusy(true);
    try {
      await api.updateWorkspace({ switchTo: id });
      router.push("/app/projects");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={saveProfile} className="space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-1">
        <div className="flex items-center gap-3">
          <Avatar name={ws.userName} image={ws.userImage} size={40} />
          <div className="min-w-0">
            <div className="truncate font-semibold">{ws.userName}</div>
            <div className="truncate text-[13px] text-ink-3">{ws.userEmail} · signed in with Google</div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-[13px] font-medium text-ink-2">Your name</span>
            <input value={userName} onChange={(e) => setUserName(e.target.value)} className="input" placeholder="Shown on your comments" maxLength={60} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[13px] font-medium text-ink-2">Workspace name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} disabled={!admin} className="input disabled:opacity-60" placeholder="Your team or company" maxLength={60} />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <Button disabled={busy}>{saved ? <><Check size={14} /> Saved</> : "Save changes"}</Button>
          <span className="text-[12.5px] text-ink-3">Renaming yourself also updates the comments you&apos;ve posted here.</span>
        </div>
      </form>

      <section className="rounded-2xl border border-line bg-surface shadow-1">
        <div className="border-b border-line px-6 py-4">
          <h2 className="font-semibold">Team</h2>
          <p className="text-[13px] text-ink-3">Members sign in with Google and can be assigned and @mentioned. Clients who comment through share links don&apos;t need to be added.</p>
        </div>
        <ul className="divide-y divide-line">
          {ws.memberList.map((m) => {
            const isMe = m.name === ws.userName && m.email === ws.userEmail;
            return (
              <li key={m.userId} className="flex items-center gap-3 px-6 py-3">
                <Avatar name={m.name} image={m.image} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium">
                    {m.name} {isMe && <span className="font-normal text-ink-3">(you)</span>}
                  </div>
                  <div className="truncate text-[12.5px] text-ink-3">{m.email}</div>
                </div>
                <span className="rounded-md border border-line px-2 py-1 text-[12px] text-ink-2">{ROLE[m.role]}</span>
                {admin && m.role !== "owner" && !isMe && (
                  <button onClick={() => remove(m.userId, m.name)} className="rounded-md p-1.5 text-ink-3 hover:bg-surface-2 hover:text-danger" title={`Remove ${m.name}`} aria-label={`Remove ${m.name}`}>
                    <X size={15} />
                  </button>
                )}
              </li>
            );
          })}
          {ws.invites.map((i) => (
            <li key={i.email} className="flex items-center gap-3 px-6 py-3">
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-dashed border-line-strong text-ink-3">
                <Mail size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-medium">{i.email}</div>
                <div className="text-[12.5px] text-ink-3">Invited · joins when they sign in with Google</div>
              </div>
              {admin && (
                <button onClick={() => update({ cancelInvite: i.email })} className="rounded-md p-1.5 text-ink-3 hover:bg-surface-2 hover:text-danger" title="Cancel invite" aria-label={`Cancel invite for ${i.email}`}>
                  <X size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
        {admin && (
          <form onSubmit={invite} className="flex gap-2 border-t border-line px-6 py-4">
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="teammate@gmail.com" className="input" aria-label="Email to invite" />
            <Button variant="secondary" disabled={!email.trim() || busy}>
              Invite
            </Button>
          </form>
        )}
      </section>

      {workspaces.length > 1 && (
        <section className="rounded-2xl border border-line bg-surface shadow-1">
          <div className="border-b border-line px-6 py-4">
            <h2 className="font-semibold">Your workspaces</h2>
            <p className="text-[13px] text-ink-3">You belong to more than one. Projects, issues and tokens are separate in each.</p>
          </div>
          <ul className="divide-y divide-line">
            {workspaces.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 px-6 py-3">
                <span className={cn("text-[14px]", w.id === activeId ? "font-semibold text-ink" : "text-ink-2")}>{w.name}</span>
                {w.id === activeId ? (
                  <span className="text-[12.5px] text-pass">Active</span>
                ) : (
                  <Button variant="secondary" size="sm" disabled={busy} onClick={() => switchTo(w.id)}>
                    Switch
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {err && <p className="text-sm text-danger">{err}</p>}
    </div>
  );
}

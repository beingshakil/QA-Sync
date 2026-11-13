"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { api } from "@/lib/api";
import type { Workspace } from "@/lib/types";
import { Avatar, Button } from "@/components/ui";

export function WorkspaceSettings({ initial }: { initial: Workspace }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [userName, setUserName] = useState(initial.userName);
  const [members, setMembers] = useState(initial.members.filter((m) => m !== initial.userName));
  const [newMember, setNewMember] = useState("");
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function addMember(e?: React.FormEvent) {
    e?.preventDefault();
    const n = newMember.trim();
    if (!n || members.includes(n) || n === userName) return setNewMember("");
    setMembers((xs) => [...xs, n]);
    setNewMember("");
  }

  async function save() {
    setErr(null);
    try {
      const ws = await api.updateWorkspace({ name, userName, members: [userName, ...members] });
      setName(ws.name);
      setUserName(ws.userName);
      setMembers(ws.members.filter((m) => m !== ws.userName));
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-1">
        <h2 className="font-semibold">Profile & workspace</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-[13px] font-medium text-ink-2">Your name</span>
            <input value={userName} onChange={(e) => setUserName(e.target.value)} className="input" placeholder="Shown on your comments" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[13px] font-medium text-ink-2">Workspace name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Your team or company" />
          </label>
        </div>
        <p className="text-[12.5px] text-ink-3">Changing your name also updates the comments and issues you&apos;ve already posted.</p>
      </section>

      <section className="rounded-2xl border border-line bg-surface shadow-1">
        <div className="border-b border-line px-6 py-4">
          <h2 className="font-semibold">Team members</h2>
          <p className="text-[13px] text-ink-3">Members can be assigned and @mentioned. Clients who comment through share links don&apos;t need to be added.</p>
        </div>
        <ul className="divide-y divide-line">
          <li className="flex items-center gap-3 px-6 py-3">
            <Avatar name={userName || "You"} size={30} />
            <div className="flex-1 text-[14px] font-medium">
              {userName || "You"} <span className="font-normal text-ink-3">(you)</span>
            </div>
            <span className="rounded-md border border-line px-2 py-1 text-[12px] text-ink-2">Owner</span>
          </li>
          {members.map((m) => (
            <li key={m} className="flex items-center gap-3 px-6 py-3">
              <Avatar name={m} size={30} />
              <div className="flex-1 text-[14px] font-medium">{m}</div>
              <button onClick={() => setMembers((xs) => xs.filter((x) => x !== m))} className="rounded-md p-1.5 text-ink-3 hover:bg-surface-2 hover:text-danger" title={`Remove ${m}`}>
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={addMember} className="flex gap-2 border-t border-line px-6 py-4">
          <input value={newMember} onChange={(e) => setNewMember(e.target.value)} placeholder="Teammate's name" className="input" />
          <Button variant="secondary" disabled={!newMember.trim()}>
            <Plus size={14} /> Add
          </Button>
        </form>
      </section>

      <div className="flex items-center gap-3">
        <Button onClick={save}>{saved ? <><Check size={14} /> Saved</> : "Save changes"}</Button>
        {err && <span className="text-sm text-accent-ink">{err}</span>}
      </div>
    </div>
  );
}

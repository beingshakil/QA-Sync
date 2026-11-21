"use client";

import { useEffect, useState } from "react";
import { Bot, Check, Copy, KeyRound, Plus, Trash2, TriangleAlert } from "lucide-react";
import { api } from "@/lib/api";
import type { ApiToken } from "@/lib/types";
import { useConfirm } from "@/components/confirm";
import { Ago, Button } from "@/components/ui";
import { cn } from "@/lib/utils";

const TOOLS: [string, string][] = [
  ["list_projects", "Projects and their open issue counts"],
  ["list_issues", "Open (or fixed, verified…) issues, filterable by project and page"],
  ["get_issue", "Comment, page URL, selector, element styles, browser, console errors, screenshots, thread"],
  ["reply_to_issue", "Explain the fix or ask the reviewer a question"],
  ["update_issue", 'Set status (e.g. "fixed"), priority or assignee; only people can mark Verified'],
];

type Client = "claude-code" | "cursor" | "vscode";
const CLIENTS: { id: Client; label: string }[] = [
  { id: "claude-code", label: "Claude Code" },
  { id: "cursor", label: "Cursor" },
  { id: "vscode", label: "VS Code" },
];

function setup(client: Client, url: string, token: string) {
  const auth = `Bearer ${token}`;
  if (client === "claude-code") return { hint: "Run in a terminal:", code: `claude mcp add --transport http qasync ${url} --header "Authorization: ${auth}"` };
  if (client === "cursor")
    return {
      hint: "Add to ~/.cursor/mcp.json (or .cursor/mcp.json in a project):",
      code: JSON.stringify({ mcpServers: { qasync: { url, headers: { Authorization: auth } } } }, null, 2),
    };
  return {
    hint: "Add to .vscode/mcp.json:",
    code: JSON.stringify({ servers: { qasync: { type: "http", url, headers: { Authorization: auth } } } }, null, 2),
  };
}

export function McpSettings({ initial }: { initial: ApiToken[] }) {
  const confirmDialog = useConfirm();
  const [tokens, setTokens] = useState(initial);
  const [name, setName] = useState("Claude Code");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fresh, setFresh] = useState<{ token: string; name: string } | null>(null);
  const [client, setClient] = useState<Client>("claude-code");
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin || "http://localhost:3000"}/api/mcp`;
  const placeholder = "<your-token>";
  const shown = setup(client, url, fresh?.token ?? placeholder);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setErr(null);
    try {
      const { token, record } = await api.createApiToken(name.trim());
      setTokens((xs) => [record, ...xs]);
      setFresh({ token, name: record.name });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function revoke(t: ApiToken) {
    const yes = await confirmDialog({
      title: `Revoke “${t.name}”?`,
      message: "Anything using this token loses access to QASync immediately. This can't be undone.",
      confirmLabel: "Revoke token",
    });
    if (!yes) return;
    try {
      await api.revokeApiToken(t.id);
      setTokens((xs) => xs.filter((x) => x.id !== t.id));
      if (fresh && t.name === fresh.name) setFresh(null);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <section id="mcp" className="rounded-2xl border border-line bg-surface shadow-1">
      <div className="flex items-start gap-3 border-b border-line px-6 py-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-grad-soft text-brand-ink">
          <Bot size={18} />
        </div>
        <div>
          <h2 className="font-semibold">AI agents (MCP)</h2>
          <p className="text-[13px] text-ink-3">
            Let Claude Code, Cursor or any MCP client read your QA issues, fix them in your code, reply, and mark them Fixed for you to verify.
          </p>
        </div>
      </div>

      <div className="space-y-6 px-6 py-5">
        {/* Server URL */}
        <div>
          <div className="mb-1.5 text-[13px] font-medium">Server URL</div>
          <CopyField value={url} />
          <p className="mt-1.5 text-[12px] text-ink-3">
            Streamable HTTP. Tools running on this computer can use the localhost URL; cloud apps (claude.ai, ChatGPT) need QASync on a public address.
          </p>
        </div>

        {/* Create token */}
        <div>
          <div className="mb-1.5 text-[13px] font-medium">1. Create a token</div>
          <form onSubmit={create} className="flex flex-wrap gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name it after the tool, e.g. Claude Code"
              aria-label="Token name"
              maxLength={60}
              className="input h-10 min-w-0 flex-1"
            />
            <Button type="submit" loading={creating} disabled={!name.trim()} className="h-10">
              {!creating && <Plus size={15} />} Create token
            </Button>
          </form>
          <p className="mt-1.5 text-[12px] text-ink-3">The name is shown as the author of the agent&apos;s replies and status changes.</p>
          {err && <p className="mt-2 text-[13px] text-danger">{err}</p>}

          {fresh && (
            <div className="animate-pop mt-3 rounded-xl border border-[var(--st-verified)]/40 bg-[var(--st-verified)]/8 p-4">
              <div className="flex items-center gap-2 text-[13px] font-medium">
                <KeyRound size={15} className="text-[var(--st-verified)]" /> Token for “{fresh.name}”
              </div>
              <div className="mt-2">
                <CopyField value={fresh.token} />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-2">
                <TriangleAlert size={13} className="shrink-0 text-[#d97706]" /> Copy it now: QASync won&apos;t show it again. Treat it like a password.
              </p>
            </div>
          )}
        </div>

        {/* Connect */}
        <div>
          <div className="mb-1.5 text-[13px] font-medium">2. Connect your AI tool</div>
          <div className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5 text-[13px]" role="tablist">
            {CLIENTS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={client === c.id}
                onClick={() => setClient(c.id)}
                className={cn("rounded-md px-3 py-1", client === c.id ? "bg-surface font-medium text-ink shadow-1" : "text-ink-3 hover:text-ink")}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-ink-3">
            {shown.hint}
            {!fresh && <> Create a token first; it&apos;s filled in here automatically.</>}
          </p>
          <CodeBlock code={shown.code} />
          {client === "claude-code" && (
            <p className="mt-2 text-[12px] text-ink-3">
              Then ask: <span className="text-ink-2">&ldquo;Fix the open QASync issues for my site, reply on each one, and mark them fixed.&rdquo;</span>
            </p>
          )}
        </div>

        {/* Tools */}
        <div>
          <div className="mb-1.5 text-[13px] font-medium">Tools the agent gets</div>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {TOOLS.map(([t, d]) => (
              <li key={t} className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-4">
                <code className="w-36 shrink-0 font-mono text-[12.5px] text-brand-ink">{t}</code>
                <span className="text-[13px] text-ink-2">{d}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tokens */}
        <div>
          <div className="mb-1.5 text-[13px] font-medium">Active tokens</div>
          {tokens.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line-strong px-4 py-3 text-[13px] text-ink-3">No tokens yet. Agents can&apos;t connect until you create one.</p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {tokens.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                  <KeyRound size={15} className="shrink-0 text-ink-3" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium">{t.name}</div>
                    <div className="text-[12px] text-ink-3">
                      <span className="font-mono">{t.prefix}…</span> · created <Ago iso={t.createdAt} /> ·{" "}
                      {t.lastUsedAt ? (
                        <>
                          last used <Ago iso={t.lastUsedAt} />
                        </>
                      ) : (
                        "never used"
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => revoke(t)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[12.5px] text-danger transition hover:bg-danger-soft"
                  >
                    <Trash2 size={13} /> Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("Copy this", text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return { copied, copy };
}

function CopyField({ value }: { value: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 py-1 pl-3 pr-1">
      <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink">{value}</code>
      <button type="button" onClick={() => copy(value)} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] text-ink-2 hover:bg-surface hover:text-ink" aria-label="Copy">
        {copied ? <Check size={14} className="text-[var(--st-verified)]" /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className="mt-2 overflow-hidden rounded-xl bg-[#0b1024]">
      <div className="flex items-center justify-end border-b border-white/10 px-2 py-1.5">
        <button
          type="button"
          onClick={() => copy(code)}
          className="inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] text-white/75 hover:bg-white/10 hover:text-white"
          aria-label="Copy setup"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap break-all p-4 font-mono text-[12px] leading-relaxed text-[#dbe4ff]">{code}</pre>
    </div>
  );
}

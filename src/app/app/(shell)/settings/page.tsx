import { PageHeader } from "@/components/app/page-header";
import { WorkspaceSettings } from "@/components/app/workspace-settings";
import { INTEGRATIONS } from "@/content/marketing";
import { IntegrationIcon } from "@/components/integration-icon";
import { getWorkspace } from "@/server/repo";
import { listApiTokens } from "@/server/tokens";
import { McpSettings } from "@/components/app/mcp-settings";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" sub="Your profile, workspace, team and integrations." />
      <div className="mx-auto max-w-4xl space-y-8 px-6 py-8">
        <WorkspaceSettings initial={getWorkspace()} />

        <McpSettings initial={listApiTokens()} />

        <section className="rounded-2xl border border-line bg-surface shadow-1">
          <div className="border-b border-line px-6 py-4">
            <h2 className="font-semibold">Integrations</h2>
            <p className="text-[13px] text-ink-3">AI agents connect through MCP today. Two-way sync with your tracker arrives in Phase 2.</p>
          </div>
          <div className="grid gap-px bg-line sm:grid-cols-2">
            {INTEGRATIONS.flatMap((g) => g.items)
              .slice(0, 10)
              .map((i) => (
                <div key={i.name} className="flex items-center gap-3 bg-surface px-6 py-3.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface-2 text-ink">
                    <IntegrationIcon name={i.name} size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-medium">{i.name}</div>
                    <div className="truncate text-[12px] text-ink-3">{i.desc}</div>
                  </div>
                  <span className={i.status ? "rounded border border-line px-2 py-0.5 text-[11px] text-ink-3" : "rounded bg-[var(--st-verified)]/12 px-2 py-0.5 text-[11px] font-medium text-[var(--st-verified)]"}>{i.status ?? "Available"}</span>
                </div>
              ))}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-6 shadow-1">
          <h2 className="font-semibold">REST API</h2>
          <p className="mt-1 text-[13px] text-ink-3">
            The app&apos;s own API, at <code className="font-mono text-ink-2">/api/*</code>. For AI agents, use the MCP server above.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-ink p-4 font-mono text-[12px] leading-relaxed text-paper">
{`GET   /api/issues?projectId=<projectId>&status=active
POST  /api/issues            { projectId, pageUrl, body, selector, ... }
PATCH /api/issues/:id        { status: "fixed" | "verified" | ... }
POST  /api/issues/:id/comments
POST  /api/uploads           multipart: file
POST  /api/audits            { projectId, url }`}
          </pre>
        </section>
      </div>
    </>
  );
}

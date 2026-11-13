import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { ScoreRing } from "@/components/app/project-widgets";
import { listAudits, listProjects } from "@/server/repo";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function AuditsPage() {
  const projects = listProjects();
  const audits = listAudits();
  const latest = new Map<string, (typeof audits)[number]>();
  for (const a of audits) if (!latest.has(a.projectId)) latest.set(a.projectId, a);

  return (
    <>
      <PageHeader title="Audits" sub="Page health across projects: broken links, accessibility, SEO, fonts and spelling, scored out of 100." />
      <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const a = latest.get(p.id);
            return (
              <Link key={p.id} href={`/app/projects/${p.id}?tab=audits`} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-1 hover:border-line-strong">
                {a ? <ScoreRing score={a.score} size={64} /> : <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-line-strong font-mono text-[11px] text-ink-3">—</div>}
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="mt-0.5 text-[12.5px] text-ink-3">{a ? `${a.stats.errors} errors · ${timeAgo(a.createdAt)}` : "Not audited yet"}</div>
                  <div className="mt-2 text-[13px] text-accent-ink">{a ? "View report →" : "Run first audit →"}</div>
                </div>
              </Link>
            );
          })}
        </div>

        {audits.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-1">
            <div className="border-b border-line px-5 py-3.5 font-medium">History</div>
            <table className="w-full text-left text-sm">
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 font-mono font-semibold">{a.score}</td>
                    <td className="px-5 py-3">{projects.find((p) => p.id === a.projectId)?.name}</td>
                    <td className="hidden max-w-[260px] truncate px-5 py-3 font-mono text-[12px] text-ink-3 md:table-cell">{a.url}</td>
                    <td className="px-5 py-3 text-ink-3">{a.findings.length} findings</td>
                    <td className="px-5 py-3 text-right text-ink-3">{timeAgo(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

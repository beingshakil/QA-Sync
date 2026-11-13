import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { AuditPanel, ProjectSettings, ShareBox } from "@/components/app/project-widgets";
import { IssuesView } from "@/components/app/issues-view";
import { ButtonLink } from "@/components/ui";
import { PagesOverview } from "@/components/app/pages-overview";
import { getProject, getWorkspace, listAudits, listIssues, listPages } from "@/server/repo";
import { cn, hostOf } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> };

export default async function ProjectPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab = "pages" } = await searchParams;
  const project = getProject(id);
  if (!project) notFound();
  const pages = listPages(id);
  const passed = pages.filter((p) => p.state === "passed").length;

  const tabs = [
    ["pages", `Pages · ${passed}/${pages.length} passed`],
    ["issues", `Issues · ${project.issueCount}`],
    ["audits", "Audits"],
    ["settings", "Settings"],
  ] as const;

  return (
    <>
      <PageHeader
        crumbs={
          <Link href="/app/projects" className="hover:text-ink">
            Projects
          </Link>
        }
        title={
          <span className="flex items-center gap-3">
            <span className="h-4 w-4 rounded-[5px]" style={{ background: project.color }} />
            {project.name}
          </span>
        }
        sub={<span className="font-mono text-[12.5px]">{project.baseUrl.startsWith("/") ? `localhost${project.baseUrl}` : hostOf(project.baseUrl)}</span>}
        actions={
          <ButtonLink href={`/app/projects/${project.id}/review`}>Open review canvas</ButtonLink>
        }
      />
      <div className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl gap-6 px-6 text-[14px]">
          {tabs.map(([k, label]) => (
            <Link key={k} href={`?tab=${k}`} className={cn("-mb-px border-b-2 py-3", tab === k ? "border-brand font-medium text-ink" : "border-transparent text-ink-3 hover:text-ink")}>
              {label}
            </Link>
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-8">
        {tab === "pages" && <PagesOverview projectId={id} initial={pages} />}
        {tab === "issues" && (
          <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
            <IssuesView initial={listIssues({ projectId: id })} projectId={id} members={getWorkspace().members} me={getWorkspace().userName} />
            <div className="space-y-4">
              <ShareBox projectId={id} />
              <div className="rounded-2xl border border-line bg-surface p-5 text-[13px] text-ink-2 shadow-1">
                <div className="font-medium text-ink">Capture methods</div>
                <ul className="mt-2 space-y-1.5">
                  <li>✓ URL mode (no install)</li>
                  <li className="text-ink-3">○ Browser extension (Phase 2)</li>
                  <li className="text-ink-3">○ JS widget snippet (Phase 2)</li>
                </ul>
              </div>
            </div>
          </div>
        )}
        {tab === "audits" && <AuditPanel project={project} initial={listAudits(id)} />}
        {tab === "settings" && <ProjectSettings project={project} />}
      </div>
    </>
  );
}

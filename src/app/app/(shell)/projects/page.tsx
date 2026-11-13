import { FolderPlus } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { NewProjectForm } from "@/components/app/project-widgets";
import { ProjectCard } from "@/components/app/project-card";
import { listProjects } from "@/server/repo";

export const dynamic = "force-dynamic";

export default function ProjectsPage() {
  const projects = listProjects();
  return (
    <>
      <PageHeader
        title="Projects"
        sub={`${projects.length} project${projects.length === 1 ? "" : "s"} · each one is a site, app or set of files under review`}
        actions={<NewProjectForm />}
      />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {projects.length === 0 ? (
          <div className="mx-auto max-w-md rounded-2xl border border-dashed border-line-strong bg-surface p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-grad-soft text-brand-ink">
              <FolderPlus size={22} />
            </div>
            <h2 className="mt-4 text-lg font-semibold">No projects yet</h2>
            <p className="mt-1 text-sm text-ink-3">Add a site to start pinning feedback on it.</p>
            <div className="mt-5 flex justify-center">
              <NewProjectForm />
            </div>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-label="Projects">
            {projects.map((p) => (
              <li key={p.id}>
                <ProjectCard project={{ id: p.id, name: p.name, baseUrl: p.baseUrl, color: p.color, createdAt: p.createdAt, issueCount: p.issueCount, openCount: p.openCount }} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

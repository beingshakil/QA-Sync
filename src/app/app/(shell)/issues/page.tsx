import { PageHeader } from "@/components/app/page-header";
import { IssuesView } from "@/components/app/issues-view";
import { getWorkspace, listIssues, listProjects } from "@/server/repo";

export const dynamic = "force-dynamic";

export default function AllIssuesPage() {
  const projects = listProjects().map((p) => ({ id: p.id, name: p.name }));
  return (
    <>
      <PageHeader title="Issues" sub="Every issue across your workspace. Drag cards on the board to change status." />
      <div className="mx-auto max-w-6xl px-6 py-8">
        <IssuesView initial={listIssues()} projects={projects} members={getWorkspace().members} me={getWorkspace().userName} />
      </div>
    </>
  );
}

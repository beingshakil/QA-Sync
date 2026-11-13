import { PageHeader } from "@/components/app/page-header";
import { IssuesView } from "@/components/app/issues-view";
import { listIssues, listProjects } from "@/server/repo";
import { getCurrentWorkspace, requireCtx } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function AllIssuesPage() {
  const ctx = await requireCtx();
  const ws = await getCurrentWorkspace();
  const projects = (await listProjects(ctx.workspaceId)).map((p) => ({ id: p.id, name: p.name }));
  return (
    <>
      <PageHeader title="Issues" sub="Every issue across your workspace. Drag cards on the board to change status." />
      <div className="mx-auto max-w-6xl px-6 py-8">
        <IssuesView initial={await listIssues({ workspaceId: ctx.workspaceId })} projects={projects} members={ws.members} me={ws.userName} />
      </div>
    </>
  );
}

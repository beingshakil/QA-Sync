import { MobileTopbar, Rail } from "@/components/app/rail";
import { listProjects } from "@/server/repo";
import { getCurrentWorkspace, requireCtx } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCtx();
  const projects = (await listProjects(ctx.workspaceId)).map((p) => ({ id: p.id, name: p.name, color: p.color, openCount: p.openCount }));
  return (
    <div className="flex min-h-dvh">
      <Rail projects={projects} workspace={await getCurrentWorkspace()} workspaces={ctx.workspaces} />
      <div className="min-w-0 flex-1">
        <MobileTopbar />
        {children}
      </div>
    </div>
  );
}

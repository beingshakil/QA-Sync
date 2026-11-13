import { MobileTopbar, Rail } from "@/components/app/rail";
import { getWorkspace, listProjects } from "@/server/repo";

export const dynamic = "force-dynamic";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const projects = listProjects().map((p) => ({ id: p.id, name: p.name, color: p.color, openCount: p.openCount }));
  return (
    <div className="flex min-h-dvh">
      <Rail projects={projects} workspace={getWorkspace()} />
      <div className="min-w-0 flex-1">
        <MobileTopbar />
        {children}
      </div>
    </div>
  );
}

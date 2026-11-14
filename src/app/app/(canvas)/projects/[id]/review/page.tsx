import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReviewCanvas } from "@/components/app/review-canvas";
import { CanvasRail } from "@/components/app/canvas-rail";
import { listIssues, listProjects, planAccess } from "@/server/repo";
import { projectFor } from "@/server/http";
import { getCurrentWorkspace, requireCtx } from "@/server/session";
import { hostOf } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Review" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ issue?: string; page?: string }> };

export default async function ReviewPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { issue, page } = await searchParams;
  const ctx = await requireCtx();
  const project = await projectFor(ctx, id);
  if (!project) notFound();
  const ws = await getCurrentWorkspace();
  const projects = (await listProjects(ctx.workspaceId)).map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    openCount: p.openCount,
    // Local path projects ("/demo") have no public site to take a logo from.
    host: p.baseUrl.startsWith("/") ? null : hostOf(p.baseUrl),
  }));
  return (
    <div className="flex h-dvh overflow-hidden">
      <CanvasRail projects={projects} currentId={project.id} />
      <div className="min-w-0 flex-1">
        <ReviewCanvas
          key={project.id}
          project={project}
          initialIssues={await listIssues({ projectId: id })}
          initialIssueId={issue}
          initialPage={page}
          members={ws.members}
          me={ws.userName}
          access={await planAccess(ctx.workspaceId)}
        />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReviewCanvas } from "@/components/app/review-canvas";
import { CanvasRail } from "@/components/app/canvas-rail";
import { getProject, getWorkspace, listIssues, listProjects } from "@/server/repo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Review" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ issue?: string; page?: string }> };

export default async function ReviewPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { issue, page } = await searchParams;
  const project = getProject(id);
  if (!project) notFound();
  const ws = getWorkspace();
  const projects = listProjects().map((p) => ({ id: p.id, name: p.name, color: p.color, openCount: p.openCount }));
  return (
    <div className="flex h-dvh overflow-hidden">
      <CanvasRail projects={projects} currentId={project.id} />
      <div className="min-w-0 flex-1">
        <ReviewCanvas
          key={project.id}
          project={project}
          initialIssues={listIssues({ projectId: id })}
          initialIssueId={issue}
          initialPage={page}
          members={ws.members}
          me={ws.userName}
        />
      </div>
    </div>
  );
}

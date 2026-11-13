import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuestReview } from "@/components/app/guest-review";
import { getProject, getShare, listIssues, planAccess } from "@/server/repo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ page?: string; issue?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const share = await getShare((await params).token);
  const project = share ? await getProject(share.projectId) : null;
  return { title: project ? `Review: ${project.name}` : "Review", robots: { index: false } };
}

/** /r/<token>?page=<url>&issue=<id>: opens the shared project on that exact page (and comment). */
export default async function SharePage({ params, searchParams }: Props) {
  const { token } = await params;
  const { page, issue } = await searchParams;
  const share = await getShare(token);
  if (!share) notFound();
  const project = await getProject(share.projectId);
  if (!project) notFound();
  const issues = await listIssues({ projectId: project.id });
  const initialIssueId = issue && issues.some((i) => i.id === issue) ? issue : undefined;
  return <GuestReview token={token} project={project} initialIssues={issues} initialPage={page || undefined} initialIssueId={initialIssueId} access={await planAccess(project.workspaceId!)} />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuditReport } from "@/components/app/audit-report";
import { getAudit, getProject } from "@/server/repo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Audit report" };

export default async function AuditReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab } = await searchParams;
  const audit = getAudit(id);
  const project = audit ? getProject(audit.projectId) : null;
  if (!audit || !project) notFound();
  return <AuditReport audit={audit} project={project} initialTab={tab} />;
}

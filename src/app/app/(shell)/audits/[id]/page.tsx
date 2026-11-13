import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuditReport } from "@/components/app/audit-report";
import { getAudit } from "@/server/repo";
import { projectFor } from "@/server/http";
import { requireCtx } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Audit report" };

export default async function AuditReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab } = await searchParams;
  const ctx = await requireCtx();
  const audit = await getAudit(id);
  const project = audit ? await projectFor(ctx, audit.projectId) : null;
  if (!audit || !project) notFound();
  return <AuditReport audit={audit} project={project} initialTab={tab} />;
}

import { deleteAudit, getAudit } from "@/server/repo";
import { fail, member, ok, projectFor } from "@/server/http";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** DELETE /api/audits/:id: remove one audit report. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const audit = await getAudit((await params).id);
  if (!audit || !(await projectFor(ctx, audit.projectId))) return fail("Not found", 404);
  await deleteAudit(audit.id);
  return ok({ ok: true });
}

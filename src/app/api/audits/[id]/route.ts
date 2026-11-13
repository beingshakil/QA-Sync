import { deleteAudit } from "@/server/repo";
import { fail, ok } from "@/server/http";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** DELETE /api/audits/:id: remove one audit report. */
export async function DELETE(_req: Request, { params }: Ctx) {
  return deleteAudit((await params).id) ? ok({ ok: true }) : fail("Not found", 404);
}

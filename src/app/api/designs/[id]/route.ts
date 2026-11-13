import { deleteDesign, getDesign } from "@/server/repo";
import { fail, member, ok, projectFor } from "@/server/http";

export const dynamic = "force-dynamic";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const design = await getDesign((await params).id);
  if (!design || !(await projectFor(ctx, design.projectId))) return fail("Not found", 404);
  await deleteDesign(design.id);
  return ok({ ok: true });
}

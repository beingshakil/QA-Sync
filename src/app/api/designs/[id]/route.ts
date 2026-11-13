import { deleteDesign } from "@/server/repo";
import { ok } from "@/server/http";

export const dynamic = "force-dynamic";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  deleteDesign((await params).id);
  return ok({ ok: true });
}

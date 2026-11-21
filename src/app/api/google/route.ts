import { fail, member, ok, projectFor } from "@/server/http";
import { disconnectGoogle, driveFail, driveStatus, getDriveLink } from "@/server/google";

export const dynamic = "force-dynamic";

/**
 * GET [?projectId=…]  →  { available, connected, email, folderUrl, project: { linked, ownerEmail, folderUrl, mine } }
 * DELETE             →  disconnect Google Drive (the token goes back to Google; files stay in Drive).
 */
export async function GET(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const status = await driveStatus(ctx.userId);
  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId) return ok(status);
  const project = await projectFor(ctx, projectId);
  if (!project) return fail("Project not found", 404);
  const link = await getDriveLink(project.id);
  return ok({ ...status, project: link ? { linked: true, ownerEmail: link.ownerEmail, folderUrl: link.folderUrl, mine: link.userId === ctx.userId } : { linked: false } });
}

export async function DELETE() {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  try {
    await disconnectGoogle(ctx.userId);
    return ok({ ok: true });
  } catch (e) {
    return driveFail(e);
  }
}

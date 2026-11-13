import { addDesign, getShare, getUpload, listDesigns } from "@/server/repo";
import { fail, member, ok, projectFor, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

/** GET /api/designs?projectId=…&pageUrl=…  (or ?shareToken=…) */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const token = sp.get("shareToken");
  let projectId: string | null;
  if (token) {
    const share = await getShare(token);
    if (!share) return fail("Invalid share link", 403);
    projectId = share.projectId;
  } else {
    const ctx = await member();
    if (ctx instanceof Response) return ctx;
    projectId = (await projectFor(ctx, sp.get("projectId")))?.id ?? null;
  }
  if (!projectId) return fail("Project not found", 404);
  return ok(await listDesigns(projectId, sp.get("pageUrl") ?? undefined));
}

/** POST /api/designs { projectId, pageUrl, device, uploadId } (members only) */
export async function POST(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const b = await readJson<{ projectId?: string; pageUrl?: string; device?: string; uploadId?: string }>(req);
  const project = await projectFor(ctx, b?.projectId);
  if (!project) return fail("Project not found", 404);
  if (!b?.pageUrl) return fail("pageUrl is required");
  const up = b.uploadId ? await getUpload(b.uploadId) : null;
  if (!up || !up.mime.startsWith("image/")) return fail("Upload an image of the design (PNG, JPG or WebP)");
  const device = ["desktop", "tablet", "mobile"].includes(b.device ?? "") ? b.device! : "desktop";
  return ok(await addDesign(project.id, b.pageUrl, device, b.uploadId!), 201);
}

import { getUpload } from "@/server/repo";
import { readFile } from "@/server/storage";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  // Upload ids are 16 random characters: the URL itself is the capability, as for share links.
  const u = await getUpload((await params).id);
  if (!u) return new Response("Not found", { status: 404 });
  try {
    const body = await readFile(u.file);
    if (!body) return new Response("Not found", { status: 404 });
    return new Response(body as BodyInit, {
      headers: {
        "content-type": u.mime,
        "content-disposition": `inline; filename="${u.name.replace(/"/g, "")}"`,
        "x-content-type-options": "nosniff",
        "cache-control": "private, max-age=31536000, immutable",
        // Allow the sandboxed (opaque-origin) review frame to load design overlays.
        "access-control-allow-origin": "*",
        "cross-origin-resource-policy": "cross-origin",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

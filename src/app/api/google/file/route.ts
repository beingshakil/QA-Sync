import { fail, member } from "@/server/http";
import { downloadPicked, driveFail } from "@/server/google";

export const dynamic = "force-dynamic";

const IMAGES = /^image\/(png|jpeg|webp)$/;
const MAX = 25 * 1024 * 1024;

/** GET ?id=…  →  the bytes of an image the person picked in Google's picker (for a design). */
export async function GET(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^[\w-]{10,200}$/.test(id)) return fail("Which file?");
  try {
    const res = await downloadPicked(ctx.userId, id);
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!IMAGES.test(type)) return fail("Pick a PNG, JPEG or WebP image", 415);
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX) return fail("That image is larger than 25 MB", 413);
    return new Response(buf, { headers: { "content-type": type, "cache-control": "no-store" } });
  } catch (e) {
    return driveFail(e);
  }
}

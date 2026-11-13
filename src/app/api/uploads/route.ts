import { nanoid } from "nanoid";
import { saveUpload } from "@/server/repo";
import { actorFrom, fail, ok } from "@/server/http";
import { storeFile } from "@/server/storage";

export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024;
// No SVG/HTML: uploads are served from our origin, so anything that can run script is refused.
const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "application/pdf": "pdf",
};

/** POST /api/uploads (multipart: file, shareToken?) → Attachment */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("Expected multipart form data");
  }
  const actor = await actorFrom({ shareToken: (form.get("shareToken") as string) || undefined });
  if ("error" in actor) return fail(actor.error, actor.status);

  const file = form.get("file");
  if (!(file instanceof File)) return fail("No file attached");
  const mime = file.type.split(";")[0].trim();
  const ext = ALLOWED[mime];
  if (!ext) return fail("Use an image (PNG, JPG, WebP, GIF), a PDF or an audio note");
  if (file.size > MAX_BYTES) return fail("Files can be up to 15 MB");

  const id = nanoid(16);
  const key = await storeFile(`${id}.${ext}`, mime, Buffer.from(await file.arrayBuffer()));
  const name = (file.name || `upload.${ext}`).replace(/[^\w.\- ]+/g, "_").slice(0, 120);
  return ok(await saveUpload({ id, file: key, mime, name, size: file.size }), 201);
}

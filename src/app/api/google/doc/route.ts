import { fail, member, ok, readJson } from "@/server/http";
import { driveFail, saveDoc } from "@/server/google";

export const dynamic = "force-dynamic";

/** POST { title, html }  →  { url }: a Google Doc (converted from HTML) in the person's QASync folder. */
export async function POST(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const b = await readJson<{ title?: string; html?: string }>(req);
  if (typeof b?.html !== "string" || !b.html.trim()) return fail("Nothing to save");
  if (b.html.length > 2_000_000) return fail("That report is too large to save as a doc");
  try {
    return ok({ url: await saveDoc(ctx.userId, String(b.title || "QASync report").slice(0, 200), b.html) });
  } catch (e) {
    return driveFail(e);
  }
}

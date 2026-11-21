import { fail, member, ok, readJson } from "@/server/http";
import { driveFail, exportSheet } from "@/server/google";

export const dynamic = "force-dynamic";

const MAX_ROWS = 5000;

/** POST { title, header, rows }  →  { url }: a new Google Sheet in the person's QASync folder. */
export async function POST(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const b = await readJson<{ title?: string; header?: unknown; rows?: unknown }>(req);
  const header = Array.isArray(b?.header) ? b.header.map((h) => String(h).slice(0, 200)) : null;
  const rows = Array.isArray(b?.rows) ? b.rows : null;
  if (!header?.length || !rows) return fail("Nothing to export");
  if (rows.length > MAX_ROWS) return fail(`At most ${MAX_ROWS} rows at a time`);
  const clean = rows.map((r) => (Array.isArray(r) ? r.slice(0, header.length).map((c) => (typeof c === "number" ? c : String(c ?? "").slice(0, 45000))) : []));
  try {
    return ok({ url: await exportSheet(ctx.userId, String(b?.title || "QASync export").slice(0, 200), header, clean) });
  } catch (e) {
    return driveFail(e);
  }
}

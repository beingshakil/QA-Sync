import { fail, member, ok } from "@/server/http";
import { driveFail, pickerToken } from "@/server/google";
import { integrationKeys } from "@/server/integration-keys";

export const dynamic = "force-dynamic";

/** GET  →  { token, apiKey, appId }: what Google's file picker needs in the browser (the token lasts about an hour). */
export async function GET() {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const picker = (await integrationKeys()).picker;
  if (!picker) return fail("Picking files from Drive isn't set up yet", 424);
  try {
    return ok({ token: await pickerToken(ctx.userId), apiKey: picker.apiKey, appId: picker.appId });
  } catch (e) {
    return driveFail(e);
  }
}

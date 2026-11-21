import { fail, member, ok, readJson } from "@/server/http";
import { selfOriginOf } from "@/server/fetch-guard";
import { canSetUpIntegrations, integrationKeys, projectNumberOf, saveNotionKeys, savePickerKey } from "@/server/integration-keys";
import { googleSignInConfigured } from "@/server/google";

export const dynamic = "force-dynamic";

/**
 * GET   →  what the setup popup needs: is each integration ready, may this person set it up, and the
 *          exact URLs to paste into Notion and links into Google Cloud.
 * POST  →  { notion: { clientId, clientSecret } } or { google: { apiKey } } (the file picker's key).
 */
export async function GET(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const keys = await integrationKeys();
  const origin = selfOriginOf(req);
  const project = projectNumberOf(process.env.AUTH_GOOGLE_ID ?? "");
  return ok({
    canSetup: await canSetUpIntegrations(ctx.email),
    origin,
    notion: { configured: !!keys.notion, source: keys.notion?.source ?? null, redirectUri: `${origin}/api/integrations/notion/callback` },
    google: {
      available: googleSignInConfigured(),
      picker: !!keys.picker,
      pickerSource: keys.picker?.source ?? null,
      // Links straight into the sign-in client's Cloud project.
      project: project || null,
    },
  });
}

const NOTION_ID = /^[A-Za-z0-9-]{8,100}$/;
const SECRET = /^\S{8,300}$/;
const API_KEY = /^[A-Za-z0-9_-]{20,80}$/;

export async function POST(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  if (!(await canSetUpIntegrations(ctx.email))) return fail("Only a QASync admin can set this up", 403);
  const b = await readJson<{ notion?: { clientId?: string; clientSecret?: string }; google?: { apiKey?: string } }>(req);
  const keys = await integrationKeys();

  if (b?.notion) {
    if (keys.notion?.source === "env") return fail("Notion's keys are set in the server's environment; change them there");
    const clientId = b.notion.clientId?.trim() ?? "";
    const clientSecret = b.notion.clientSecret?.trim() ?? "";
    if (!NOTION_ID.test(clientId)) return fail("That doesn't look like a Notion client ID. Copy “OAuth client ID” from the integration's page.");
    if (!SECRET.test(clientSecret)) return fail("That doesn't look like a Notion client secret. Copy “OAuth client secret” from the same page.");
    await saveNotionKeys(clientId, clientSecret);
    return ok({ ok: true });
  }

  if (b?.google) {
    if (keys.picker?.source === "env") return fail("The picker's key is set in the server's environment; change it there");
    const apiKey = b.google.apiKey?.trim() ?? "";
    if (!API_KEY.test(apiKey)) return fail("That doesn't look like a Google API key (it usually starts with “AIza”).");
    await savePickerKey(apiKey);
    return ok({ ok: true });
  }

  return fail("Nothing to save");
}

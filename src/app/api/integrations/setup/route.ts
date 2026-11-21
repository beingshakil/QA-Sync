import { fail, member, ok, readJson } from "@/server/http";
import { selfOriginOf } from "@/server/fetch-guard";
import { canSetUpIntegrations, integrationKeys, publicGoogleConfig, saveGoogleKeys, saveNotionKeys } from "@/server/integration-keys";

export const dynamic = "force-dynamic";

/**
 * GET   →  what the setup popup needs: is each integration ready, may this person set it up, and the
 *          exact URLs to paste into Notion and Google Cloud.
 * POST  →  { notion: { clientId, clientSecret } } or { google: { clientId, apiKey? } }: saves the app's keys.
 */
export async function GET(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  const keys = await integrationKeys();
  const canSetup = await canSetUpIntegrations(ctx.email);
  const origin = selfOriginOf(req);
  return ok({
    canSetup,
    origin,
    notion: { configured: !!keys.notion, source: keys.notion?.source ?? null, redirectUri: `${origin}/api/integrations/notion/callback` },
    google: {
      configured: !!keys.google,
      source: keys.google?.source ?? null,
      clientId: keys.google?.clientId ?? null,
      hasApiKey: !!keys.google?.apiKey,
      // The OAuth client already used for "Sign in with Google" works for Drive too: offered to admins as the default.
      signInClientId: canSetup ? (process.env.AUTH_GOOGLE_ID ?? null) : null,
    },
  });
}

const NOTION_ID = /^[A-Za-z0-9-]{8,100}$/;
const SECRET = /^\S{8,300}$/;
const GOOGLE_ID = /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/;
const API_KEY = /^[A-Za-z0-9_-]{20,80}$/;

export async function POST(req: Request) {
  const ctx = await member();
  if (ctx instanceof Response) return ctx;
  if (!(await canSetUpIntegrations(ctx.email))) return fail("Only a QASync admin can set this up", 403);
  const b = await readJson<{ notion?: { clientId?: string; clientSecret?: string }; google?: { clientId?: string; apiKey?: string } }>(req);
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
    if (keys.google?.source === "env") return fail("Google's keys are set in the server's environment; change them there");
    const clientId = b.google.clientId?.trim() ?? "";
    const apiKey = b.google.apiKey?.trim() ?? "";
    if (!GOOGLE_ID.test(clientId)) return fail("That doesn't look like a Google OAuth client ID (it ends in .apps.googleusercontent.com).");
    if (apiKey && !API_KEY.test(apiKey)) return fail("That doesn't look like a Google API key. Leave it empty if you don't need to pick designs from Drive.");
    await saveGoogleKeys(clientId, apiKey);
    return ok({ ok: true, google: await publicGoogleConfig() });
  }

  return fail("Nothing to save");
}

import "server-only";
import { q, run } from "./db";
import { seal, unseal } from "./crypto";
import { isAdmin } from "./admin";

/**
 * The app's own keys for Notion and Google Drive. They come from the environment when set there;
 * otherwise an admin pastes them once in the setup popup and they're kept in app_settings
 * (the Notion secret encrypted). Environment values always win.
 */
export type IntegrationKeys = {
  notion: { clientId: string; clientSecret: string; source: "env" | "app" } | null;
  google: { clientId: string; apiKey: string; appId: string; source: "env" | "app" } | null;
};
export type PublicGoogleConfig = { clientId: string; apiKey: string; appId: string };

const K = {
  notionId: "integrations.notion.clientId",
  notionSecret: "integrations.notion.clientSecret",
  googleId: "integrations.google.clientId",
  googleKey: "integrations.google.apiKey",
} as const;

/** A Google OAuth client ID starts with the project number, which is also the Picker's app ID. */
export const projectNumberOf = (clientId: string) => clientId.match(/^(\d+)-/)?.[1] ?? "";

let cache: { at: number; keys: IntegrationKeys } | null = null;

export async function integrationKeys(fresh = false): Promise<IntegrationKeys> {
  if (!fresh && cache && Date.now() - cache.at < 30_000) return cache.keys;
  const rows = await q("SELECT key, value FROM app_settings WHERE key LIKE 'integrations.%'");
  const db = Object.fromEntries(rows.map((r) => [r.key as string, r.value as string]));
  const open = (v: string | undefined) => {
    try {
      return v ? unseal(v) : "";
    } catch {
      return ""; // AUTH_SECRET changed: the admin pastes the secret again
    }
  };

  const env = process.env;
  const notionSecret = open(db[K.notionSecret]);
  const notion =
    env.NOTION_CLIENT_ID && env.NOTION_CLIENT_SECRET
      ? { clientId: env.NOTION_CLIENT_ID, clientSecret: env.NOTION_CLIENT_SECRET, source: "env" as const }
      : db[K.notionId] && notionSecret
        ? { clientId: db[K.notionId], clientSecret: notionSecret, source: "app" as const }
        : null;

  const envGoogle = env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const google = envGoogle
    ? { clientId: envGoogle, apiKey: env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "", appId: env.NEXT_PUBLIC_GOOGLE_APP_ID || projectNumberOf(envGoogle), source: "env" as const }
    : db[K.googleId]
      ? { clientId: db[K.googleId], apiKey: db[K.googleKey] ?? "", appId: projectNumberOf(db[K.googleId]), source: "app" as const }
      : null;

  const keys = { notion, google };
  cache = { at: Date.now(), keys };
  return keys;
}

/** What the browser needs for Google Drive: all public by design (an OAuth client ID, a browser API key). */
export async function publicGoogleConfig(): Promise<PublicGoogleConfig | null> {
  const g = (await integrationKeys()).google;
  return g ? { clientId: g.clientId, apiKey: g.apiKey, appId: g.appId } : null;
}

async function put(key: string, value: string | null) {
  if (value === null) {
    await run("DELETE FROM app_settings WHERE key = ?", key);
    return;
  }
  await run(
    "INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    key,
    value,
    new Date().toISOString(),
  );
}

export async function saveNotionKeys(clientId: string, clientSecret: string) {
  await put(K.notionId, clientId);
  await put(K.notionSecret, seal(clientSecret));
  cache = null;
}

export async function saveGoogleKeys(clientId: string, apiKey: string) {
  await put(K.googleId, clientId);
  await put(K.googleKey, apiKey || null);
  cache = null;
}

/** On someone's own machine (no Vercel, local database) whoever runs it sets things up. */
export const runningLocally = () => !process.env.VERCEL && process.env.QASYNC_DB !== "remote";

/** Who may paste the app's keys: site admins, or anyone when running locally. */
export async function canSetUpIntegrations(email: string | null | undefined) {
  return runningLocally() || (await isAdmin(email));
}

import "server-only";
import { q, run } from "./db";

/**
 * Built-in error monitoring. Problems are grouped by kind + host + message, counted, and shown to
 * site admins on /app/admin, so breakages (above all: sites the preview can't load) are visible
 * before anyone reports them. No third-party account needed.
 *
 * Kinds:
 *   proxy    the review proxy couldn't fetch a page, or the site answered with an error status
 *   asset    the proxy asset route couldn't fetch a script, stylesheet or font
 *   preview  a canvas frame never came up (reported by the browser; usually framing refused)
 *   shot     a screenshot capture failed
 *   audit    an SEO audit failed
 *   integration  a Notion (or other integration) sync failed
 *   client   a JavaScript error in the app
 */
export type ErrorKind = "proxy" | "asset" | "preview" | "shot" | "audit" | "integration" | "client";

export interface ErrorEvent {
  key: string;
  kind: ErrorKind;
  host: string | null;
  message: string;
  url: string | null;
  detail: string | null;
  count: number;
  firstAt: string;
  lastAt: string;
}

const MAX_GROUPS = 500;
const THROTTLE_MS = 10_000;
const g = globalThis as unknown as { __qasyncErrSeen?: Map<string, number> };
const seen = (g.__qasyncErrSeen ??= new Map());

export function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Records one occurrence. Never throws and never blocks the caller (fire and forget). */
export function reportError(e: { kind: ErrorKind; message: string; url?: string | null; host?: string | null; detail?: string | null }): void {
  const host = e.host ?? hostOf(e.url);
  const message = e.message.replace(/\s+/g, " ").trim().slice(0, 300) || "Unknown error";
  const key = `${e.kind}|${host ?? ""}|${message}`.slice(0, 400);
  const now = Date.now();
  // The same problem repeating in a burst is written once per window; the count still says "often".
  if (now - (seen.get(key) ?? 0) < THROTTLE_MS) return;
  seen.set(key, now);
  if (seen.size > 2000) seen.clear();

  const at = new Date(now).toISOString();
  void (async () => {
    try {
      await run(
        `INSERT INTO error_events (key, kind, host, message, url, detail, count, first_at, last_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
         ON CONFLICT (key) DO UPDATE SET count = error_events.count + 1, last_at = excluded.last_at, url = excluded.url, detail = excluded.detail`,
        key,
        e.kind,
        host,
        message,
        e.url?.slice(0, 500) ?? null,
        e.detail?.slice(0, 2000) ?? null,
        at,
        at,
      );
      if (Math.random() < 0.05) {
        await run(`DELETE FROM error_events WHERE key IN (SELECT key FROM error_events ORDER BY last_at DESC OFFSET ${MAX_GROUPS})`);
      }
    } catch {
      // Monitoring must never break the request it's watching.
    }
  })();
}

export async function listErrors(limit = 200): Promise<ErrorEvent[]> {
  const rows = await q("SELECT * FROM error_events ORDER BY last_at DESC LIMIT ?", limit);
  return rows.map((r) => ({
    key: r.key as string,
    kind: r.kind as ErrorKind,
    host: (r.host as string) || null,
    message: r.message as string,
    url: (r.url as string) || null,
    detail: (r.detail as string) || null,
    count: Number(r.count),
    firstAt: r.first_at as string,
    lastAt: r.last_at as string,
  }));
}

export async function clearErrors(key?: string): Promise<void> {
  if (key) await run("DELETE FROM error_events WHERE key = ?", key);
  else await run("DELETE FROM error_events");
}

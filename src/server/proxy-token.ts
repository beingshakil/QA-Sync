import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Signed tokens for the proxy asset route (/api/proxy/a/<token>/<path>).
 *
 * A proxied page runs in an opaque origin, so its requests to our server carry no cookies; the
 * token in the path is the authorisation instead. The page proxy (which does check the session or
 * share link) mints one per site, and it lets the asset route fetch scripts, stylesheets and fonts
 * from that one origin for a few hours. Expiry is rounded to the hour so the token, and with it the
 * browser cache for those assets, stays stable across reloads.
 */

const g = globalThis as unknown as { __qasyncProxySecret?: string };
const SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || (g.__qasyncProxySecret ??= randomBytes(32).toString("hex"));
const HOUR = 3600;

function sign(value: string) {
  return createHmac("sha256", SECRET).update(`qasync-asset:${value}`).digest("base64url").slice(0, 32);
}

export function mintAssetToken(origin: string): string {
  const exp = (Math.floor(Date.now() / 1000 / HOUR) + 7) * HOUR; // valid 6-7 h, constant within the hour
  const o = Buffer.from(origin).toString("base64url");
  return `${o}.${exp}.${sign(`${o}.${exp}`)}`;
}

/** The origin the token covers, or null when it's malformed, forged or expired. */
export function verifyAssetToken(token: string): string | null {
  const [o, e, s] = token.split(".");
  if (!o || !e || !s) return null;
  const exp = Number(e);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return null;
  const want = sign(`${o}.${e}`);
  if (want.length !== s.length || !timingSafeEqual(Buffer.from(want), Buffer.from(s))) return null;
  try {
    const origin = Buffer.from(o, "base64url").toString();
    const u = new URL(origin);
    return /^https?:$/.test(u.protocol) && u.origin === origin ? origin : null;
  } catch {
    return null;
  }
}

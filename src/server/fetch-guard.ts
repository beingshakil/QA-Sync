import "server-only";

/**
 * Resolve a user-supplied URL against our own origin and apply a basic SSRF guard.
 * Phase 1 checks hostnames only. Production must resolve DNS and re-check the IP,
 * and run fetches from an isolated egress network.
 */
const PRIVATE_HOST =
  /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|\[?::1\]?|\[?fc|\[?fd|metadata\.google\.internal)/i;

export function resolveTarget(raw: string, selfOrigin: string): URL {
  const url = new URL(raw, selfOrigin);
  if (!/^https?:$/.test(url.protocol)) throw new Error("Only http(s) URLs are supported");
  const self = new URL(selfOrigin);
  if (url.host !== self.host && PRIVATE_HOST.test(url.hostname)) {
    throw new Error("Private network and localhost addresses can't be reviewed through the proxy yet. Use a public or staging URL.");
  }
  return url;
}

export function selfOriginOf(req: Request): string {
  const u = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? u.host;
  const proto = req.headers.get("x-forwarded-proto") ?? u.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export const FETCH_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 QASyncReviewer/0.1",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
};

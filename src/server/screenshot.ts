import "server-only";
import type { Browser } from "playwright-core";
import { FETCH_HEADERS, isPrivateHost } from "./fetch-guard";

/**
 * Server-side screenshots for the canvas's screenshot mode: sites that refuse to be framed (or that
 * break in the live preview) can still be reviewed as a captured image at the frame's own width.
 *
 * - On Vercel / Linux serverless: @sparticuz/chromium. Locally: the installed Chrome, or CHROME_PATH.
 * - One browser is kept per server instance and reused; each capture gets a fresh context.
 * - Requests to private-network hosts are blocked inside the browser.
 * - Captures are cached for 10 minutes per URL + width, and concurrent requests share one capture.
 */

const MAX_HEIGHT = 16000;
const CACHE_MS = 10 * 60 * 1000;
const CACHE_MAX = 30;

export type Shot = { bytes: Buffer; status: number; width: number; height: number };

const g = globalThis as unknown as {
  __qasyncShotBrowser?: Promise<Browser> | null;
  __qasyncShotCache?: Map<string, Shot & { at: number }>;
  __qasyncShotInflight?: Map<string, Promise<Shot>>;
};
const cache = (g.__qasyncShotCache ??= new Map());
const inflight = (g.__qasyncShotInflight ??= new Map());

async function launch(): Promise<Browser> {
  const { chromium } = await import("playwright-core");
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const serverless = (await import("@sparticuz/chromium")).default;
    return chromium.launch({ executablePath: await serverless.executablePath(), args: serverless.args, headless: true });
  }
  if (process.env.CHROME_PATH) return chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
  return chromium.launch({ channel: "chrome", headless: true });
}

async function browser(): Promise<Browser> {
  const existing = g.__qasyncShotBrowser ? await g.__qasyncShotBrowser.catch(() => null) : null;
  if (existing?.isConnected()) return existing;
  g.__qasyncShotBrowser = launch();
  const b = await g.__qasyncShotBrowser.catch((e) => {
    g.__qasyncShotBrowser = null;
    throw e;
  });
  b.on("disconnected", () => (g.__qasyncShotBrowser = null));
  return b;
}

/** Clamp the requested width to something sane for a page capture. */
export function shotWidth(w: string | null): number {
  const n = Math.round(Number(w));
  return Number.isFinite(n) ? Math.min(2560, Math.max(320, n)) : 1440;
}

export function captureScreenshot(url: string, width: number): Promise<Shot> {
  const key = `${url}|${width}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return Promise.resolve(hit);
  let job = inflight.get(key);
  if (!job) {
    job = capture(url, width)
      .then((shot) => {
        cache.set(key, { ...shot, at: Date.now() });
        if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
        return shot;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, job);
  }
  return job;
}

async function capture(url: string, width: number): Promise<Shot> {
  const b = await browser();
  const mobile = width < 600;
  const ctx = await b.newContext({
    viewport: { width, height: mobile ? 844 : 900 },
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile,
    userAgent: FETCH_HEADERS["user-agent"],
    locale: "en-US",
  });
  try {
    // Never let a captured page reach the private network (by hostname; see fetch-guard).
    await ctx.route("**/*", (route) => {
      try {
        return isPrivateHost(new URL(route.request().url()).hostname) ? route.abort() : route.continue();
      } catch {
        return route.continue();
      }
    });
    const page = await ctx.newPage();
    const res = await page.goto(url, { waitUntil: "load", timeout: 25000 });
    // Bring in lazy-loaded images and scroll-triggered content, then return to the top.
    await page.evaluate(async (max) => {
      const step = Math.max(400, window.innerHeight - 100);
      const end = Math.min(document.documentElement.scrollHeight, max);
      for (let y = 0; y < end; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    }, MAX_HEIGHT);
    await page.waitForTimeout(700);
    const height = Math.min(await page.evaluate(() => document.documentElement.scrollHeight), MAX_HEIGHT);
    const bytes = await page.screenshot({ type: "jpeg", quality: 82, fullPage: true, clip: { x: 0, y: 0, width, height } });
    return { bytes, status: res?.status() ?? 0, width, height };
  } finally {
    await ctx.close().catch(() => {});
  }
}

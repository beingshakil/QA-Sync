import { NextResponse, type NextRequest } from "next/server";

/**
 * Review-canvas frames show the proxied site's own path (see proxyShim in
 * src/server/proxy-rewrite.ts), with a `__qasync=<token>~<page url>` marker. If the site reloads
 * itself, the browser requests that path from us; this sends it back through the proxy (keeping the
 * address the site sees) instead of serving one of our pages inside the frame.
 * Every other request passes straight through.
 */
export function middleware(req: NextRequest) {
  const marker = req.nextUrl.searchParams.get("__qasync");
  if (!marker) return NextResponse.next();
  const cut = marker.indexOf("~");
  if (cut < 1) return NextResponse.next();
  const token = marker.slice(0, cut);
  const target = marker.slice(cut + 1);
  if (!/^https?:\/\//i.test(target)) return NextResponse.next();
  const to = new URL("/api/proxy", req.url);
  to.searchParams.set("url", target);
  to.searchParams.set("t", token);
  return NextResponse.rewrite(to);
}

export const config = {
  // Pages only: never API routes or build assets.
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico).*)"],
};

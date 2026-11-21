"use client";

import { useEffect } from "react";

/** Sends uncaught JavaScript errors in the app to /api/errors (see src/server/monitor.ts). */
export function ErrorReporter() {
  useEffect(() => {
    let sent = 0;
    const send = (message: string, detail?: string) => {
      if (sent >= 5 || !message) return; // a page stuck in an error loop reports a handful, not thousands
      if (/ResizeObserver loop|Script error\.?$/i.test(message)) return; // browser noise / opaque cross-origin errors
      sent++;
      void fetch("/api/errors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "client", message: message.slice(0, 300), url: location.href, detail: detail?.slice(0, 2000) }),
        keepalive: true,
      }).catch(() => {});
    };
    const onError = (e: ErrorEvent) => {
      if (e.filename && /^(chrome|moz|safari)-extension:/.test(e.filename)) return;
      send(e.message, e.error?.stack ?? (e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : undefined));
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason as { message?: string; stack?: string } | string | undefined;
      send(typeof r === "string" ? r : r?.message ?? "Unhandled promise rejection", typeof r === "object" ? r?.stack : undefined);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}

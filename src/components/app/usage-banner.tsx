"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface UsageNotice {
  key: string;
  state: "near" | "full";
  text: string;
}

/**
 * Top-of-app notice for a Free workspace that is close to, or at, a plan limit.
 * "Almost there" warnings can be dismissed for the session; "limit reached" stays until they upgrade.
 */
export function UsageBanner({ notice }: { notice: UsageNotice }) {
  const id = `qasync-usage-dismissed:${notice.key}:${notice.state}`;
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      if (notice.state === "near" && sessionStorage.getItem(id)) setHidden(true);
    } catch {}
  }, [id, notice.state]);
  if (hidden) return null;
  const full = notice.state === "full";
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-3 border-b px-4 py-2.5 text-[13px] sm:px-6",
        full ? "border-danger/25 bg-danger-soft text-ink" : "border-[var(--st-progress)]/25 bg-[color-mix(in_srgb,var(--st-progress)_10%,transparent)] text-ink-2",
      )}
    >
      <AlertTriangle size={15} className={cn("shrink-0", full ? "text-danger" : "text-[var(--st-progress)]")} />
      <p className="min-w-0 flex-1">{notice.text}</p>
      <Link href="/pricing" className="shrink-0 font-semibold text-brand-ink hover:underline">
        Upgrade to Pro
      </Link>
      {!full && (
        <button
          onClick={() => {
            setHidden(true);
            try {
              sessionStorage.setItem(id, "1");
            } catch {}
          }}
          className="shrink-0 rounded p-1 text-ink-3 hover:text-ink"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

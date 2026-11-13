import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Spec-sheet building blocks shared by the marketing visuals: a small grey label over a clear
 * sans value with even-width numbers, colour swatches and status badges. Monospace is kept for
 * real code only (selectors, console output, the agent terminal).
 */
export function Spec({ label, value, note, size = "md", className }: { label: string; value: ReactNode; note?: string; size?: "md" | "sm"; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className={cn("font-medium text-ink-3", size === "md" ? "text-[12px]" : "text-[11px]")}>{label}</dt>
      <dd
        className={cn(
          "flex flex-wrap items-center gap-x-1.5 gap-y-1 font-semibold tabular-nums tracking-[-0.01em] text-ink",
          size === "md" ? "mt-1.5 text-[15px]" : "mt-1 text-[13px]",
        )}
      >
        {value}
        {note && <span className={cn("font-normal text-ink-3", size === "md" ? "text-[12.5px]" : "text-[11.5px]")}>{note}</span>}
      </dd>
    </div>
  );
}

export function Swatch({ hex, note, size = "md" }: { hex: string; note?: string; size?: "md" | "sm" | "xs" }) {
  const box = size === "md" ? "h-4 w-4 rounded-[5px]" : size === "sm" ? "h-3.5 w-3.5 rounded-[4px]" : "h-3 w-3 rounded-[3px]";
  const text = size === "md" ? "text-[14px]" : size === "sm" ? "text-[12.5px]" : "text-[11px]";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("shrink-0 border border-black/10 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]", box)} style={{ background: hex }} />
      <span className={cn("font-semibold tabular-nums", text)}>{hex}</span>
      {note && <span className="text-[11.5px] font-normal text-ink-3">{note}</span>}
    </span>
  );
}

export function FailBadge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger">{children}</span>;
}

/** Small status pill used for "New", "Soon", "Beta" tags. */
export function TagPill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "blue" | "brand" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tone === "blue" ? "bg-blue-soft text-blue" : tone === "brand" ? "bg-brand-soft text-brand-ink" : "bg-surface-2 text-ink-3",
      )}
    >
      {children}
    </span>
  );
}

import Link from "next/link";
import { cn, initials, timeAgo } from "@/lib/utils";
import { PRIORITY_COLOR, PRIORITY_LABEL, STATUS_LABEL, type Priority, type Status } from "@/lib/types";
import { useId, type ComponentProps, type ReactNode } from "react";

/* ── Logo: a sync arrow that closes into a Q, with a check mark for its tail (QA + verified fix) ──
   Same artwork as src/app/icon.svg; keep the two in step. */
export function LogoMark({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const g = `qs-g-${uid}`;
  const h = `qs-h-${uid}`;
  return (
    <svg viewBox="0 0 32 32" className={cn("h-7 w-7 shrink-0", className)} aria-hidden>
      <defs>
        <linearGradient id={g} x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2b5ebe" />
          <stop offset="1" stopColor="#7b2fb0" />
        </linearGradient>
        <radialGradient id={h} cx="9" cy="5" r="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity=".22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${g})`} />
      <path d="M19.4 6.95A8 8 0 1 0 22.9 13" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M21 4.6l.6 4.4-4.3 1z" fill="#fff" />
      <path d="M16.3 17.6l3.4 3.4 7-7" fill="none" stroke={`url(#${g})`} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.3 17.6l3.4 3.4 7-7" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect width="32" height="32" rx="8" fill={`url(#${h})`} />
    </svg>
  );
}

/** "QA" in ink, "Sync" in the brand gradient. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold tracking-tight", className)}>
      QA<span className="text-gradient">Sync</span>
    </span>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} aria-label="QASync home" className={cn("flex items-center gap-2 text-ink", className)}>
      <LogoMark />
      <Wordmark className="text-[18px]" />
    </Link>
  );
}

/* ── Button ── */
type Variant = "primary" | "secondary" | "ghost" | "ink" | "danger" | "danger-solid" | "success";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "btn-sheen bg-brand bg-grad-brand text-white hover:brightness-105 shadow-1",
  ink: "bg-ink text-paper hover:opacity-90 shadow-1",
  secondary: "bg-surface text-ink border border-line hover:border-line-strong shadow-1",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: "bg-surface text-danger border border-line hover:bg-danger-soft",
  "danger-solid": "bg-danger text-white hover:brightness-95 shadow-1",
  success: "bg-[var(--st-verified)] text-white hover:brightness-95 shadow-1",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-md",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-12 px-5 text-[15px] gap-2 rounded-xl",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center font-medium whitespace-nowrap transition disabled:opacity-50 disabled:pointer-events-none",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

/* ── Eyebrow / labels ── */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("eyebrow-pill", className)}>{children}</div>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border border-line bg-surface px-1.5 py-0.5 text-[11px] font-medium text-ink-2", className)}>
      {children}
    </span>
  );
}

const statusColor: Record<Status, string> = {
  open: "var(--st-open)",
  in_progress: "var(--st-progress)",
  in_review: "var(--st-review)",
  fixed: "var(--st-fixed)",
  verified: "var(--st-verified)",
  wont_fix: "var(--st-wontfix)",
};

export function StatusDot({ status, className }: { status: Status; className?: string }) {
  return <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full", className)} style={{ background: statusColor[status] }} />;
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-0.5 text-[12px] font-medium text-ink-2">
      <StatusDot status={status} />
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Severity dot: red = critical/major, orange = medium, yellow = low. Optional text label. */
export function PriorityIcon({ priority, label }: { priority: Priority; label?: boolean }) {
  return (
    <span title={PRIORITY_LABEL[priority]} className="inline-flex items-center gap-1">
      <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: PRIORITY_COLOR[priority] }} />
      {label && <span>{PRIORITY_LABEL[priority]}</span>}
    </span>
  );
}

const avatarColors = ["#2b5ebe", "#7b2fb0", "#4074c7", "#9558c0", "#1f4c9c", "#5e1d95"];
export function Avatar({ name, size = 24, image }: { name: string; size?: number; image?: string | null }) {
  const idx = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % avatarColors.length;
  if (image)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt="" title={name} referrerPolicy="no-referrer" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
    );
  return (
    <span
      title={name}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4, background: avatarColors[idx] }}
    >
      {initials(name)}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-surface-2 px-1 font-mono text-[10px] text-ink-3">
      {children}
    </kbd>
  );
}

/** Relative time. Server and client clocks differ by the time it takes to hydrate, so allow the text to differ. */
export function Ago({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString()} suppressHydrationWarning>
      {timeAgo(iso)}
    </time>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-line bg-surface shadow-1", className)}>{children}</div>;
}

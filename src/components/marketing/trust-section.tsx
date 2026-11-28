import type { CSSProperties, ReactNode } from "react";
import { Ban, Check, KeyRound, Link2, Lock, ShieldCheck, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

/* ───────── Trust: "Safe to send to clients" ─────────
 * Three cards, each with a small mockup of what it promises. Hovering a card plays it:
 * the sandbox boundary lights up, the share link's scope chips settle, the agent token
 * flips from Active to Revoked. Reduced motion keeps them still (.bento-anim).
 */

const d = (ms: number) => ({ "--d": ms }) as CSSProperties;

const CARDS = [
  {
    icon: ShieldCheck,
    t: "Sandboxed pages",
    b: "Sites load in an isolated sandbox with no access to your QASync session or cookies.",
    visual: <SandboxVisual />,
  },
  {
    icon: Link2,
    t: "Scoped share links",
    b: "A link opens one project. Guests can edit or delete only what they wrote.",
    visual: <ShareVisual />,
  },
  {
    icon: KeyRound,
    t: "Revocable agent tokens",
    b: "AI tokens are stored hashed, shown once, and stop working the moment you revoke them.",
    visual: <TokenVisual />,
  },
];

export function TrustSection() {
  return (
    <ul className="mt-12 grid gap-4 md:grid-cols-3">
      {CARDS.map(({ icon: Icon, t, b, visual }, i) => (
        <li
          key={t}
          data-reveal
          data-spotlight
          style={d(i * 100)}
          className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-surface transition-colors duration-300 hover:border-line-strong"
        >
          <div className="relative isolate flex h-48 items-center justify-center overflow-hidden border-b border-line px-6">
            <span aria-hidden className="pointer-events-none absolute -top-20 left-1/2 -z-10 h-52 w-52 -translate-x-1/2 rounded-full bg-brand/20 blur-3xl transition-opacity duration-500 group-hover:opacity-100 md:opacity-60" />
            <span aria-hidden className="hiw-grid pointer-events-none absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_at_center,#000_10%,transparent_70%)]" />
            {visual}
          </div>
          <div className="p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-line-strong bg-brand-soft text-brand-ink">
                <Icon size={17} strokeWidth={1.9} />
              </span>
              <h3 className="text-[17px] font-semibold tracking-[-0.012em] text-ink">{t}</h3>
            </div>
            <p className="mt-3 text-pretty text-[14.5px] leading-[1.65] text-ink-2">{b}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ───────── mockups ───────── */

function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full border border-line-strong bg-surface px-2 py-0.5 text-[11px] font-medium text-ink-2 shadow-1", className)}>{children}</span>;
}

/** A page inside a dashed sandbox boundary; QASync's session and cookies stay outside. */
function SandboxVisual() {
  return (
    <div className="relative w-full max-w-[250px]">
      <div className="bento-anim rounded-2xl border-[1.5px] border-dashed border-line-strong p-2.5 transition-colors duration-500 group-hover:border-brand-ink/70">
        <div className="overflow-hidden rounded-lg border border-line bg-paper shadow-2">
          <div className="flex h-5 items-center gap-1 border-b border-line px-2">
            <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />
            <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />
            <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />
            <span className="ml-auto flex items-center gap-1 text-[9px] text-ink-3">
              <Lock size={8} /> client-site.com
            </span>
          </div>
          <div className="space-y-1.5 p-2.5">
            <span className="block h-1.5 w-1/2 rounded-full bg-ink-3/40" />
            <span className="block h-1.5 w-4/5 rounded-full bg-line-strong" />
            <span className="block h-1.5 w-3/5 rounded-full bg-line-strong" />
            <span className="mt-1 block h-3 w-1/3 rounded bg-brand/70" />
          </div>
        </div>
      </div>
      <span className="absolute -top-2.5 left-4 rounded-full bg-surface px-2 font-mono text-[10px] uppercase tracking-[0.14em] text-brand-ink">sandbox</span>
      <div className="bento-anim absolute -bottom-3 right-0 flex flex-col items-end gap-1 transition-transform duration-500 [transition-timing-function:var(--ease-smooth)] group-hover:-translate-y-1">
        <Chip>
          <Ban size={10} className="text-danger" /> cookies: blocked
        </Chip>
        <Chip>
          <Ban size={10} className="text-danger" /> session: none
        </Chip>
      </div>
    </div>
  );
}

/** A share link, what it opens, and a guest who can change only their own comment. */
function ShareVisual() {
  return (
    <div className="w-full max-w-[260px] space-y-2.5">
      <div className="flex items-center gap-2 rounded-full border border-line-strong bg-surface py-1 pl-3 pr-1 shadow-2">
        <Link2 size={13} className="shrink-0 text-brand-ink" />
        <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-2">qasync.app/r/7Kf2…/pricing</span>
        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10.5px] font-medium text-brand-ink">1 project</span>
      </div>
      <div className="bento-anim rounded-xl border border-line-strong bg-surface p-3 shadow-2 transition-transform duration-500 [transition-timing-function:var(--ease-smooth)] group-hover:-translate-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
            <UserRound size={12} />
          </span>
          <span className="text-[12px] font-medium text-ink">Jordan</span>
          <span className="text-[11px] text-ink-3">Guest</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip>
            <Check size={10} strokeWidth={3} className="text-pass" /> edit own
          </Chip>
          <Chip>
            <Check size={10} strokeWidth={3} className="text-pass" /> delete own
          </Chip>
          <Chip className="text-ink-3">
            <Ban size={10} className="text-danger" /> others&apos;
          </Chip>
        </div>
      </div>
    </div>
  );
}

/** An agent token, masked, that flips from Active to Revoked on hover. */
function TokenVisual() {
  return (
    <div className="w-full max-w-[260px] rounded-xl border border-line-strong bg-surface p-3 shadow-2">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-ink">Claude Code</span>
        <span className="relative inline-flex h-5 w-[72px] items-center justify-end text-[11px] font-medium">
          <span className="bento-anim absolute right-0 flex items-center gap-1 text-pass transition-opacity duration-300 group-hover:opacity-0">
            <span className="h-1.5 w-1.5 rounded-full bg-pass" /> Active
          </span>
          <span className="bento-anim absolute right-0 flex items-center gap-1 text-danger opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="h-1.5 w-1.5 rounded-full bg-danger" /> Revoked
          </span>
        </span>
      </div>
      <div className="bento-anim mt-2 rounded-lg border border-line bg-paper px-2.5 py-1.5 font-mono text-[11.5px] text-ink-2 transition-opacity duration-300 group-hover:opacity-50">
        qs_live_••••••••••3f9a
      </div>
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-ink-3">
        <span>Stored hashed · shown once</span>
        <span className="bento-anim rounded-md border border-line-strong px-2 py-0.5 font-medium text-ink-2 transition-colors duration-300 group-hover:border-danger/50 group-hover:bg-danger-soft group-hover:text-danger">
          Revoke
        </span>
      </div>
    </div>
  );
}

import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, Braces, Plug, ShieldCheck, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { cn } from "@/lib/utils";

/* ───────── AI agents: the agent takes the first pass, a person signs off ─────────
 * Left: the three points as icon cards, the clients that connect, and the CTA.
 * Right: the agent's terminal on a lit stage, with the hand-off card ("waiting for
 * you to verify") floating over its corner.
 */

const d = (ms: number) => ({ "--d": ms }) as CSSProperties;

const POINTS = [
  { icon: Braces, t: "Full context", b: "Every issue comes with its selector, element styles, browser and console errors." },
  { icon: Plug, t: "Your tools", b: "Claude Code, Cursor, VS Code or any MCP client, connected with a token from Settings." },
  { icon: ShieldCheck, t: "People sign off", b: "Agents can mark issues Fixed. Only a person can mark them Verified." },
] as const;

const CLIENTS = ["Claude Code", "Cursor", "VS Code", "Any MCP client"];

export function AgentSection() {
  return (
    <div className="mt-12 grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
      {/* the visual (first on mobile, right on desktop) */}
      <div className="lg:order-2 lg:col-span-7">
        <AgentStage />
      </div>

      <div className="lg:order-1 lg:col-span-5">
        <ul className="space-y-3">
          {POINTS.map(({ icon: Icon, t, b }, i) => (
            <li key={t} data-reveal style={d(i * 100)} className="group flex gap-4 rounded-2xl border border-line bg-surface/40 p-5 transition-colors duration-300 hover:border-line-strong hover:bg-surface">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-brand-soft text-brand-ink transition-colors duration-300 group-hover:border-brand/40">
                <Icon size={20} strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <h3 className="text-[17px] font-semibold tracking-[-0.012em] text-ink">{t}</h3>
                <p className="mt-1.5 text-pretty text-[14.5px] leading-[1.6] text-ink-2">{b}</p>
              </div>
            </li>
          ))}
        </ul>

        <div data-reveal style={d(300)} className="mt-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Works with</div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {CLIENTS.map((c) => (
              <li key={c} className="rounded-full border border-line bg-surface px-3 py-1 text-[12.5px] font-medium text-ink-2">
                {c}
              </li>
            ))}
          </ul>
        </div>

        <div data-reveal style={d(380)} className="mt-8">
          <ButtonLink href="/product/ai-agents" variant="secondary">
            How agents connect <ArrowRight size={15} />
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

/* ───────── The stage: terminal + hand-off card ───────── */

function AgentStage() {
  return (
    <div data-reveal className="relative isolate rounded-3xl border border-line bg-surface-2/40 p-4 sm:p-8 sm:pb-24">
      {/* light behind the window, kept inside the rounded frame */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        <span className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-brand/30 blur-3xl" />
        <span className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
        <span className="hiw-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,#000_15%,transparent_75%)]" />
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface/80 px-3 py-1.5 text-[12.5px] font-medium text-ink shadow-1 backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-pass" />
          MCP connected
        </span>
        <span className="hidden items-center gap-1.5 text-[12px] text-ink-3 sm:inline-flex">
          <Sparkles size={13} className="text-brand-ink" /> 3 issues in, 3 fixes out
        </span>
      </div>

      <Terminal />

      {/* hand-off: the agent stops at Fixed, a person verifies */}
      <div
        data-reveal
        style={d(1900)}
        className="relative z-10 -mt-4 ml-auto w-[92%] rounded-2xl border border-line-strong bg-surface p-4 shadow-2 sm:absolute sm:-bottom-6 sm:right-8 sm:mt-0 sm:w-[300px]"
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Waiting for you</span>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-ink-2">3</span>
        </div>
        <ul className="mt-3 space-y-2 text-[12.5px]">
          <HandOff n="1" t="Solvd description wraps" />
          <HandOff n="2" t="Tag text size" />
          <HandOff n="3" t="Card media ratio" />
        </ul>
        <span className="mt-3 flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand text-[12.5px] font-medium text-white">
          <ShieldCheck size={14} /> Check them on the live page
        </span>
      </div>
    </div>
  );
}

function HandOff({ n, t }: { n: string; t: string }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[10px_10px_10px_3px] bg-[var(--st-fixed)] text-[10px] font-semibold text-white">{n}</span>
      <span className="min-w-0 flex-1 truncate text-ink">{t}</span>
      <span className="shrink-0 text-[11px] font-medium text-[var(--st-fixed)]">Fixed</span>
    </li>
  );
}

function Terminal() {
  const call = "text-[var(--st-review)]";
  return (
    <div className="overflow-hidden rounded-2xl border border-line-strong bg-paper font-mono text-[12.5px] leading-[1.8] text-ink shadow-2">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-[11px] text-ink-3">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        </span>
        <span className="ml-2">claude · connected to qasync</span>
      </div>
      <div className="space-y-0.5 overflow-hidden p-5 sm:pb-20">
        <Line delay={150} className="text-ink">
          <span className="text-ink-3">›</span> Fix the open QASync issues on afternow.co
        </Line>
        <Line delay={500} className="pt-2">
          <span className={call}>list_issues</span> project: afternow · <span className="text-ink">3 open</span>
        </Line>
        <Line delay={800}>
          <span className={call}>get_issue</span> #3 · <span className="text-ink">.work-card__media</span> · 582 px vs 436 px
        </Line>
        <Line delay={1100}>
          edited <span className="text-ink">styles/work.css</span>, <span className="text-ink">components/WorkCard.tsx</span>
        </Line>
        <Line delay={1400}>
          <span className={call}>reply_to_issue</span> #3 “All cards share one media ratio now”
        </Line>
        <Line delay={1700}>
          <span className={call}>update_issue</span> #1 #2 #3 → <span className="text-ink">fixed</span>
        </Line>
        <Line delay={2100} className="pt-2">
          <span className="text-pass">✓ 3 issues marked fixed</span> <span className="text-ink-3">· waiting for you to verify</span>
        </Line>
      </div>
    </div>
  );
}

function Line({ delay, className, children }: { delay: number; className?: string; children: ReactNode }) {
  return (
    <p data-reveal style={d(delay)} className={cn("text-ink-2 sm:whitespace-nowrap", className)}>
      {children}
    </p>
  );
}

import Link from "next/link";
import { Check, Lock, Sparkles } from "lucide-react";
import { FEATURE_LABEL, PLAN_LIMITS, usageState, type Feature, type Metered, type Usage, type WorkspacePlan } from "@/lib/plans";
import { cn } from "@/lib/utils";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const METERS: [Metered, string][] = [
  ["projects", "Projects"],
  ["comments", "Comments (pins and replies)"],
  ["audits", "Page audits"],
  ["members", "Team members (incl. invites)"],
];
const PRO_TOOLS: Feature[] = ["inspect", "freeze", "devices", "overlay", "pageQa", "guests", "agents"];

/** The workspace's plan, how much of each limit is used, and which tools it includes. */
export function PlanCard({ plan, usage }: { plan: WorkspacePlan; usage: Usage }) {
  const limits = PLAN_LIMITS[plan.plan];
  const pro = plan.plan === "pro";
  return (
    <section className="rounded-2xl border border-line bg-surface p-6 shadow-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="font-semibold">Plan</h2>
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold", pro ? "bg-brand-soft text-brand-ink" : "bg-surface-2 text-ink-2")}>
            {pro && <Sparkles size={12} />}
            {limits.label}
          </span>
        </div>
        <span className="text-[13px] text-ink-3">
          {plan.local ? "Local testing · always Pro" : plan.admin ? "Site admin · always Pro" : pro ? (plan.expiresAt ? `Pro until ${fmt(plan.expiresAt)}` : "Pro, no end date") : plan.expired ? `Pro ended ${fmt(plan.expiresAt!)}` : "Free forever"}
        </span>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {METERS.map(([key, label]) => {
          const used = usage[key];
          const max = limits[key];
          const state = usageState(used, max);
          const pct = Number.isFinite(max) ? Math.min(100, Math.round((used / max) * 100)) : 0;
          return (
            <div key={key}>
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="text-ink-2">{label}</span>
                <span className="tabular-nums text-ink-3">
                  <b className={cn("font-semibold", state === "full" ? "text-danger" : "text-ink")}>{used}</b> {Number.isFinite(max) ? `of ${max}` : "· unlimited"}
                </span>
              </div>
              {Number.isFinite(max) && (
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className={cn("h-full rounded-full", state === "full" ? "bg-danger" : state === "near" ? "bg-[var(--st-progress)]" : "bg-brand")} style={{ width: `${pct}%` }} />
                </div>
              )}
              {state === "full" && <p className="mt-1 text-[12px] text-danger">Limit reached. Upgrade to add more.</p>}
              {state === "near" && <p className="mt-1 text-[12px] text-[var(--st-progress)]">Almost at the limit.</p>}
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <div className="text-[12.5px] font-medium text-ink-3">{pro ? "Every tool is included" : "Included tools"}</div>
        <ul className="mt-3 grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
          <li className="flex items-center gap-2 text-ink">
            <Check size={14} className="text-pass" /> Live element pins
          </li>
          {PRO_TOOLS.map((f) => (
            <li key={f} className={cn("flex items-center gap-2", pro ? "text-ink" : "text-ink-3")}>
              {pro ? <Check size={14} className="text-pass" /> : <Lock size={13} />}
              {FEATURE_LABEL[f]}
              {!pro && <span className="rounded bg-surface-2 px-1.5 py-px text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Pro</span>}
            </li>
          ))}
        </ul>
      </div>

      {!pro && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3">
          <p className="text-[13px] text-ink-2">Pro is $5 a month: every tool, with no limits on projects, comments, audits or people.</p>
          <Link href="/pricing" className="inline-flex h-8 items-center rounded-lg bg-ink px-3 text-[12.5px] font-medium text-paper hover:opacity-90">
            Upgrade to Pro
          </Link>
        </div>
      )}
    </section>
  );
}

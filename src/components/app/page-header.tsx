import type { ReactNode } from "react";

export function PageHeader({ title, sub, actions, crumbs }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; crumbs?: ReactNode }) {
  return (
    <div className="relative overflow-hidden border-b border-line bg-surface">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-[520px] rounded-full bg-grad-soft opacity-70 blur-3xl" />
      <div className="relative mx-auto flex max-w-6xl flex-wrap items-end gap-4 px-6 py-6">
        <div className="min-w-0 flex-1">
          {crumbs && <div className="mb-1 text-[13px] text-ink-3">{crumbs}</div>}
          <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
          {sub && <p className="mt-1 text-[14px] text-ink-3">{sub}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

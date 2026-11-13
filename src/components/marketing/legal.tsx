import type { ReactNode } from "react";

/** Contact address for privacy and legal requests (NEXT_PUBLIC_CONTACT_EMAIL). */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null;

export function Contact() {
  return CONTACT_EMAIL ? (
    <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand-ink hover:underline">
      {CONTACT_EMAIL}
    </a>
  ) : (
    <span>the contact address listed on this site</span>
  );
}

/** Readable long-form legal text: numbered sections in one narrow column. */
export function LegalDoc({ updated, children }: { updated: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-12 sm:px-6">
      <p className="text-[13px] text-ink-3">Last updated {updated}</p>
      <div className="legal mt-8 space-y-10 text-[15.5px] leading-[1.75] text-ink-2">{children}</div>
    </div>
  );
}

export function LegalSection({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="flex items-baseline gap-3 text-[20px] font-semibold tracking-[-0.015em] text-ink">
        <span className="text-[13px] font-semibold tabular-nums text-brand-ink">{String(n).padStart(2, "0")}</span>
        {title}
      </h2>
      <div className="mt-3 space-y-3 [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">{children}</div>
    </section>
  );
}

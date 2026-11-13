import type { Metadata } from "next";
import { PageHero, Section } from "@/components/marketing/sections";
import { CHANGELOG } from "@/content/marketing";

export const metadata: Metadata = { title: "Changelog" };

export default function ChangelogPage() {
  return (
    <>
      <PageHero eyebrow="Changelog" title="What's new" accent="in QASync." sub="Every release, newest first." />
      <Section className="max-w-3xl">
        <ol className="relative space-y-12 border-l border-line pl-8">
          {CHANGELOG.map((c) => (
            <li key={c.date} data-reveal className="relative">
              <span className="absolute -left-[37px] top-1.5 h-2.5 w-2.5 rounded-full bg-grad-brand ring-4 ring-paper" />
              <time className="font-mono text-[12px] text-ink-3">{c.date}</time>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">{c.title}</h2>
              <ul className="mt-3 space-y-1.5 text-ink-2">
                {c.items.map((i) => (
                  <li key={i}>• {i}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}

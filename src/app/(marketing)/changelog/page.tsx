import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import { JsonLd, breadcrumbs, graph } from "@/components/json-ld";
import { PageHero, Section } from "@/components/marketing/sections";
import { CHANGELOG } from "@/content/marketing";

export const metadata: Metadata = pageMetadata({
  title: "Changelog: What's New in QASync",
  description: "Release notes for QASync: new review tools, SEO audit checks, AI agent support over MCP and the fixes that shipped with each update.",
  path: "/changelog",
});

export default function ChangelogPage() {
  return (
    <>
      <JsonLd data={graph(breadcrumbs([{ name: "Changelog", path: "/changelog" }]))} />
      <PageHero eyebrow="Changelog" title="What's new" accent="in QASync." sub="Every release, newest first." />
      <Section className="max-w-3xl">
        <ol className="relative space-y-12 border-l border-line pl-8">
          {CHANGELOG.map((c) => (
            <li key={`${c.date}-${c.title}`} data-reveal className="relative">
              <span className="absolute -left-[37px] top-1.5 h-2.5 w-2.5 rounded-full bg-grad-brand ring-4 ring-paper" />
              <time dateTime={c.date} className="text-[13px] font-medium tabular-nums text-ink-3">{new Date(`${c.date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</time>
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

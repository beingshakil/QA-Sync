import { BRAND } from "@/lib/brand";
import { PLANS } from "@/content/marketing";
import { absoluteUrl } from "@/lib/site";

/** Structured data for search engines. `<` is escaped so content can't close the script tag. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export const ORG_ID = absoluteUrl("/#organization");

export const organization = () => ({
  "@type": "Organization",
  "@id": ORG_ID,
  name: BRAND.name,
  url: absoluteUrl("/"),
  logo: absoluteUrl("/apple-icon.png"),
  description: BRAND.description,
});

export const website = () => ({
  "@type": "WebSite",
  "@id": absoluteUrl("/#website"),
  name: BRAND.name,
  url: absoluteUrl("/"),
  inLanguage: "en",
  publisher: { "@id": ORG_ID },
});

/** The product, with the real plans and prices. No ratings or reviews: there are none to cite. */
export const softwareApplication = () => ({
  "@type": "SoftwareApplication",
  "@id": absoluteUrl("/#software"),
  name: BRAND.name,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web browser",
  url: absoluteUrl("/"),
  description: BRAND.description,
  publisher: { "@id": ORG_ID },
  offers: PLANS.map((p) => ({
    "@type": "Offer",
    name: `${p.name} plan`,
    price: String(p.price),
    priceCurrency: "USD",
    description: p.features.join(", "),
    url: absoluteUrl("/pricing"),
    ...(p.price > 0 && {
      priceSpecification: { "@type": "UnitPriceSpecification", price: String(p.price), priceCurrency: "USD", billingDuration: "P1M", unitCode: "MON" },
    }),
  })),
});

export const faqPage = (items: { q: string; a: string }[], path: string) => ({
  "@type": "FAQPage",
  "@id": absoluteUrl(`${path}#faq`),
  mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});

export const breadcrumbs = (trail: { name: string; path: string }[]) => ({
  "@type": "BreadcrumbList",
  itemListElement: [{ name: "Home", path: "/" }, ...trail].map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: absoluteUrl(t.path) })),
});

export const graph = (...nodes: Record<string, unknown>[]) => ({ "@context": "https://schema.org", "@graph": nodes });

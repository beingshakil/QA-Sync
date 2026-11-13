import {
  siAsana,
  siBasecamp,
  siBitbucket,
  siClaude,
  siClickup,
  siFigma,
  siGithub,
  siGitlab,
  siJira,
  siLinear,
  siMake,
  siN8n,
  siNetlify,
  siNotion,
  siOpenai,
  siShopify,
  siSlack,
  siTrello,
  siVercel,
  siWebflow,
  siWordpress,
  siZapier,
} from "simple-icons";
import { Braces, Code2, Mail, MessagesSquare, Webhook, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Brand = { path: string; hex: string; title: string };

/** Brand marks (Simple Icons, CC0). Names match the integration list. */
const BRANDS: Record<string, Brand> = {
  Jira: siJira,
  Linear: siLinear,
  GitHub: siGithub,
  GitLab: siGitlab,
  Bitbucket: siBitbucket,
  ClickUp: siClickup,
  Asana: siAsana,
  Trello: siTrello,
  Notion: siNotion,
  Basecamp: siBasecamp,
  Slack: siSlack,
  Figma: siFigma,
  Vercel: siVercel,
  Netlify: siNetlify,
  WordPress: siWordpress,
  Webflow: siWebflow,
  Shopify: siShopify,
  Claude: siClaude,
  ChatGPT: siOpenai,
  "Zapier / Make / n8n": siZapier,
  Zapier: siZapier,
  Make: siMake,
  n8n: siN8n,
};

/** Generic marks for entries that aren't a single brand (or have no public icon). */
const GENERIC: Record<string, LucideIcon> = {
  Email: Mail,
  Webhooks: Webhook,
  "REST API": Braces,
  "Codex / Cursor": Code2,
  "Microsoft Teams": MessagesSquare,
};

/** Very dark brand colours (GitHub, Vercel, Notion…) would vanish on dark surfaces: use the text colour instead. */
function readable(hex: string): string {
  const n = parseInt(hex, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum < 0.22 ? "currentColor" : `#${hex}`;
}

export function IntegrationIcon({ name, size = 20, className, mono = false }: { name: string; size?: number; className?: string; mono?: boolean }) {
  const brand = BRANDS[name];
  if (brand) {
    return (
      <svg role="img" aria-label={brand.title} viewBox="0 0 24 24" width={size} height={size} className={cn("shrink-0", className)} fill={mono ? "currentColor" : readable(brand.hex)}>
        <path d={brand.path} />
      </svg>
    );
  }
  const Icon = GENERIC[name];
  if (Icon) return <Icon size={size} className={cn("shrink-0 text-brand-ink", className)} aria-hidden />;
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-md bg-grad-soft font-semibold text-brand-ink", className)}
      style={{ width: size, height: size, fontSize: size * 0.55 }}
    >
      {name[0]}
    </span>
  );
}

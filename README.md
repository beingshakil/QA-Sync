# QASync: visual feedback that gets fixed

Phase 1 of the product described in [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md): a marketing site and a working review app in one Next.js project.

## Run it

Requires Node 22.5 or later. It uses the built-in `node:sqlite`; Node 24 is recommended.

```bash
npm install

# Fast (recommended for using the app): compile once, then every click is instant
npm run build
npm start          # http://localhost:3000

# While editing code: hot reload, but each screen compiles on first use (slow clicks)
npm run dev
```

After changing code, run `npm run build` again before `npm start`.

The first request creates `.data/qasync.db` (empty) and `.data/uploads/` for attachments and design images. To reset everything, stop the server and delete `.data/`. Set your name, workspace name and team members in **Settings**.

## Where to look

| URL | What it is |
|---|---|
| `/` | Marketing homepage (paste a URL in the hero to start reviewing) |
| `/product/capture`, `/design-qa`, `/developer-context`, `/ai-agents`, `/monitoring` | Product pages |
| `/solutions/designers`, `/agencies`, `/developers`, `/qa-teams`, `/product-teams` | Solution pages |
| `/integrations` · `/pricing` · `/changelog` | The rest of the marketing site |
| `/app` | Inbox: paste a URL to start, then stats, needs-verification queue, activity |
| `/app/projects/<id>/review` | **Review canvas** (see below) |
| `/app/issues` | All issues: list and drag-and-drop board |
| `/app/projects/<id>?tab=audits` | Page audit with a 100-point score |
| `/r/<token>` | Guest share view (copy the link with the Share button) |
| `/app/settings` | Your name, workspace and team members |

## Page-by-page QA tracking

Every URL in a project is a **page** with its own QA state:

| State | Meaning |
|---|---|
| Not reviewed | No issues yet and not signed off |
| In review | Has open issues |
| Ready to sign off | All of its issues are resolved |
| QA passed | Someone signed it off. Their name and the time are recorded |

- **How pages get added:**
  - automatically, when you open them in the canvas or comment on them;
  - by hand, with **+ Add page**;
  - in bulk, with **Import pages from site** (sitemap, or the start page's links).
- **Where you see them:** the canvas has page tabs, and the **Pages** button opens the full overview. The overview is also the first tab of each project. Guests see it too and can sign pages off.
- **Automatic reset:** a new or reopened issue on a passed page puts it back to *In review*.
- **One project per site:** pasting a URL of a site that already has a project opens that page in it.

## Review canvas

- **Devices:** Desktop, Tablet (768), Mobile (390), and **Split view** (desktop + mobile side by side).
- **Zoom:** *Fit to pane*, 50%, 75%, 100%, 125%.
- **Design tools:**
  - **Upload design:** a PNG/JPG per page and device.
  - **Compare:** the design beside the live page, scrolling together.
  - **Overlay:** the design on top of the page, with opacity and a *Difference* blend.
- **Inline comment box** at the pin:
  - Text, with **Enter** to send.
  - **Voice note** (with live transcript in Chrome and Edge).
  - **Attach** images or PDFs. Pasting images works too.
  - **Priority tag** and **@mention**, which also assigns the person.
- **Panel:**
  - Search comments, and sort (newest, oldest, priority, pin number, show resolved).
  - Progress bar with *This page / All pages*.
  - Device filter chips with counts, and a one-click resolve on each comment.

## Canvas shortcuts

| Key | Action |
|---|---|
| `C` | Comment mode: click any element to pin it |
| `I` | Inspect mode: font, size, spacing and contrast |
| `B` | Browse mode: links navigate inside the canvas |
| `F` | Freeze hover states and animations |
| `J` / `K` | Next / previous issue |
| `Esc` | Cancel the current action |

## AI agents (MCP)

QASync runs an MCP server at `/api/mcp` (Streamable HTTP). AI tools such as Claude Code and Cursor can use it to read QA issues, fix them in your code, reply, and mark them Fixed. A person still marks each fix Verified.

1. In the app, open **Settings → AI agents (MCP)** and create a token. It is shown once; QASync stores only a hash.
2. Connect your tool. For Claude Code:
   ```bash
   claude mcp add --transport http qasync http://localhost:3000/api/mcp --header "Authorization: Bearer <your-token>"
   ```
   Settings also shows ready-to-paste config for Cursor and VS Code.
3. Ask the agent, for example: *"Fix the open QASync issues for my site, reply on each one, and mark them fixed."*

| Tool | What it does |
|---|---|
| `list_projects` | Projects with their URLs and open issue counts |
| `list_issues` | Issues by project, page and status (default: still needs work) |
| `get_issue` | Comment, page URL, device, CSS selector, element styles, browser, console errors, attachments and thread |
| `reply_to_issue` | Adds a reply, authored as the token's name |
| `update_issue` | Status, priority or assignee. Agents can't set `verified` |

Tools on the same computer can use the `localhost` URL. Cloud apps (claude.ai, ChatGPT) need QASync on a public address. Revoking a token in Settings cuts off access immediately.

## SEO

Set the public address before deploying, so canonical URLs, the sitemap, robots.txt, share images and structured data point at your domain:

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

On Vercel the production domain is used automatically when this isn't set; locally it falls back to `http://localhost:3000`.

- **Metadata:** every marketing page has its own title, description, canonical URL, Open Graph and Twitter card (`src/lib/site.ts` → `pageMetadata`). Product and solution titles and descriptions live in `src/content/marketing.ts` (`seoTitle`, `seoDescription`).
- **Share images:** generated at `/opengraph-image`, plus one per product and solution page (`src/lib/og.tsx`).
- **Structured data:** Organization, WebSite, SoftwareApplication with the real plans, FAQPage and breadcrumbs (`src/components/json-ld.tsx`).
- **Crawling:** `/robots.txt` and `/sitemap.xml`. The app (`/app`), the API and private share links (`/r/…`) are disallowed and marked `noindex`.
- **Check it:** run QASync's own SEO audit on any page of the site.

## How it fits together

- `public/reviewer.js`: the in-page agent, injected by `/api/proxy`. It talks to the canvas over `postMessage`.
- `src/app/api/*`: REST routes. They call `src/server/repo.ts`, which uses SQLite in `src/server/db.ts`.
- `src/content/marketing.ts`: all marketing copy, kept separate from the page templates.
- Testimonials on the solution pages are **placeholders**. Replace them with real customer quotes before launch.

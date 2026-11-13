# QASync — System Design

> QASync: visual feedback and QA for websites, where every fix gets verified.
> "QASync" is a working name. Swap it in `src/lib/brand.ts`.

This document covers two things:

1. The **target architecture**: the full production system from the blueprint.
2. The **Phase 1 slice** that runs locally today, and how each part maps onto the target, so nothing has to be rewritten later.

---

## 1. Product scope

| Surface | Users | Purpose |
|---|---|---|
| Marketing site | Prospects | Home, product pages, solutions, integrations, pricing, compare, changelog |
| App | Workspace members | Projects, the review canvas, issues, approvals, audits, analytics, settings |
| Share / client portal | Guests (no account) | Open a review link, comment, reply, approve |
| Capture surfaces | Reviewers | URL proxy (no install), JavaScript widget, browser extension |
| Public API + MCP | Developers and AI agents | Read and write reviews, fix issues, verify |

The core loop is **Capture → Discuss → Fix → Verify**.

---

## 2. Target architecture (production)

```
                         ┌───────────────────────── Cloudflare CDN / WAF ─────────────────────────┐
                         │                                                                         │
 Browser ── marketing ──►│  Next.js (Vercel)  — marketing (static)  ·  app (server rendered)       │
 Widget  ── events  ────►│  Edge: share links, widget config                                       │
 Extension ─────────────►│                                                                         │
 AI agents ── MCP ──────►│  MCP server (remote HTTP, OAuth)                                        │
                         └───────────────┬─────────────────────────────────────────────────────────┘
                                         │ tRPC / REST
                         ┌───────────────▼──────────────┐      ┌─────────────────────────────────┐
                         │  Core API (Hono, TypeScript) │◄────►│  Realtime (Liveblocks / Yjs)    │
                         │  auth · projects · issues    │      │  presence, cursors, threads     │
                         │  comments · approvals · sync │      └─────────────────────────────────┘
                         └──┬──────────┬────────────┬───┘
                            │          │            │ enqueue
                 ┌──────────▼─┐  ┌─────▼──────┐  ┌──▼───────────────────────────────────────────┐
                 │ Postgres   │  │ Redis      │  │ Job orchestrator (Inngest / Temporal)        │
                 │ + pgvector │  │ rate limit │  │  ├─ capture-worker   (Playwright snapshot)   │
                 └────────────┘  │ queues     │  │  ├─ audit-worker     (axe, links, SEO, vitals)│
                                 └────────────┘  │  ├─ verify-worker    (re-render + image diff) │
                 ┌────────────┐                  │  ├─ monitor-scheduler (cron scans)           │
                 │ S3 / R2    │◄─────────────────┤  ├─ sync-worker      (Jira/Linear/... sync)  │
                 │ screenshots│                  │  ├─ ai-worker        (rewrite, triage, dedup) │
                 │ DOM snaps  │                  │  └─ notify-worker    (email, Slack, digests)  │
                 │ replays    │                  └──────────────────────────────────────────────┘
                 └────────────┘
```

### 2.1 Services

| Service | Responsibility | Scaling notes |
|---|---|---|
| **web** (Next.js) | Marketing pages, app UI, share pages, backend-for-frontend | Stateless; marketing pages are static |
| **core-api** | Domain logic, permissions, multi-tenant isolation | Stateless; horizontal pods |
| **proxy** | Fetches the target page, rewrites URLs, injects the reviewer script, serves it same-origin | Cache snapshots by URL hash plus TTL |
| **capture-worker** | Headless Chromium: screenshots and DOM snapshots for each pin | GPU-less pool, autoscaled on queue depth |
| **audit-worker** | Links, spelling, fonts, SEO, axe-core accessibility, Lighthouse | Same pool as capture |
| **verify-worker** | Re-renders the pinned element after "Fixed"; compares pixels and DOM against the original and the design | Writes the verdict and evidence |
| **sync-worker** | Two-way sync with project-management tools (webhooks in, API out); field mapping; conflict resolution | Per-integration rate limits |
| **ai-worker** | Rewrite/title/translate, severity triage, duplicate detection (pgvector), sprint plans | Model routing: small model for volume, large for reasoning |
| **mcp** | Exposes tools to agents: `list_reviews`, `get_open_comments`, `get_repro_bundle`, `get_design_diff`, `reply_and_resolve`, `verify_fix`, `deploy_site` | OAuth, per-workspace scopes |
| **realtime** | Presence, live cursors, live thread updates | Managed service |

### 2.2 Data model (shared by the target and Phase 1)

```
Workspace 1─* Member(user, role)
Workspace 1─* Project(name, type: website|files, baseUrl, figmaUrl?, color)
Project   1─* Page(url, title)                    -- discovered or added pages
Project   1─* Issue
Issue:  id, number, projectId, pageUrl, title, body, status, priority,
        assignee?, reporterName, reporterType(member|guest),
        selector, xPct, yPct, viewport{w,h}, device,
        element{tag,text,font,size,weight,lineHeight,color,bg,contrast,padding},
        env{ua, os, browser, dpr, url, consoleErrors[]},
        createdAt, updatedAt, resolvedAt?, verifiedAt?
Issue   1─* Comment(author, authorType, body, createdAt)
Issue   1─* Activity(type, from, to, actor, at)    -- audit trail
Project 1─* ShareLink(token, role: comment|view, expiresAt?)
Project 1─* Audit(url, score, findings[], createdAt)
Project 1─* ApprovalRound(name, status, signedBy?, signedAt?)
```

**Status lifecycle:**
`open → in_progress → in_review → fixed → verified`, with `fixed → open` when verification fails, and `* → wont_fix`.

### 2.3 Key flows

1. **No-install review.** The user pastes a URL. `GET /api/proxy?url=` fetches the HTML, injects `<base href>` and `reviewer.js`, and serves it same-origin inside an iframe. The injected script talks to the parent canvas via `postMessage`: hover → highlight; click → `{selector, rect, computed styles}`. The parent opens the composer and `POST /api/issues` saves the issue. Pins are re-anchored by selector, falling back to stored percentage coordinates.
2. **Share.** Creating a `ShareLink` produces `/r/{token}`. Guests enter a name once (stored locally) and can comment and reply without an account.
3. **Audit.** `POST /api/audits` fetches the page server-side, runs the rule set, scores it out of 100, and stores the findings. Any finding can become an issue with one click.
4. **Verify (Phase 2).** Status changes to `fixed`, which enqueues `verify-worker`. The worker re-renders the page, compares the element's styles and pixels, then marks the issue `verified` or reopens it with evidence.

### 2.4 Cross-cutting concerns

- **Tenancy:** every row carries `workspaceId`; enforced in the repository layer and by Postgres row-level security in production.
- **Security:** the proxy blocks private IP ranges (SSRF guard), strips the target's cookies, and serves under a sandboxed iframe. Share tokens are 21-character random IDs.
- **Privacy:** sensitive values are masked in the browser before upload (`data-private`, plus email and card patterns).
- **Observability:** OpenTelemetry traces from the API through workers; Sentry; PostHog events for funnel analytics.

---

## 3. Phase 1 — what runs locally now

One Next.js app. Every module sits behind an interface, so moving to the target means swapping implementations, not rewriting features.

| Target component | Phase 1 implementation | Swap path |
|---|---|---|
| web | Next.js 15 App Router, Tailwind v4 | Same |
| core-api | Next.js route handlers in `src/app/api/*` calling `src/server/*` services | Move services into the Hono service |
| Postgres | `node:sqlite` (Node 24 built-in) via `src/server/db.ts` | Replace `db.ts` with Drizzle + Postgres |
| proxy | `src/app/api/proxy/route.ts` | Extract to its own service with a cache |
| reviewer script | `public/reviewer.js` (injected into proxied pages) | Same script reused by the widget and extension |
| audit-worker | Runs inline in `src/server/audit.ts` | Moves to a queue worker |
| realtime | Polling every 4 s in the canvas | Liveblocks |
| auth | Single local demo workspace and user | WorkOS / Clerk |
| ai-worker | Rule-based auto-title (`src/server/ai.ts`) | Claude API |
| verify-worker | Manual "Mark verified" with activity log | Playwright + image-diff worker |

### 3.1 Folder layout

```
src/
  app/
    (marketing)/            marketing site with shared header and footer
      page.tsx              home
      product/[slug]/       capture · design-qa · developer-context · ai-agents
      solutions/[slug]/     designers · agencies · developers · qa-teams · product-teams
      integrations/  pricing/  compare/  changelog/
    app/                    the product (workspace layout with left rail)
      page.tsx              inbox / dashboard
      projects/[id]/        project overview: pages, issues, share, audits
      projects/[id]/review  REVIEW CANVAS
      issues/               all issues: list + board
      audits/  settings/
    r/[token]/              guest share view
    api/                    projects · issues · comments · share · audits · proxy
  components/
    marketing/              header, footer, sections
    app/                    rail, canvas, composer, issue panel, board
    ui/                     button, badge, input …
  content/                  marketing copy as data (product, solutions, integrations, pricing)
  lib/                      brand, types, utils
  server/                   db, repositories, audit, ai, proxy helpers
public/reviewer.js          in-page reviewer agent
```

### 3.2 Build order

1. Foundation: design tokens, fonts, UI primitives, brand.
2. Data layer: SQLite schema, repositories, seed data.
3. API routes.
4. Marketing site: home, then product, solutions, integrations, pricing, compare, changelog.
5. App shell: rail, dashboard, projects.
6. Review canvas: proxy, reviewer script, pins, composer, inspect, devices.
7. Issues: list, board, detail, activity.
8. Share links and guest view.
9. Page audit.
10. Run, smoke-test, iterate on feedback.

### 3.3 Phase 2 and later

Fix verification worker · Figma design drift · pull-request preview reviews plus a GitHub check · code-aware pins (source maps) · AI triage and dedup · approval rounds with sign-off · analytics · JavaScript widget and browser extension · two-way project-management sync · MCP server · SSO and SOC 2.

# QASync: frontend design rules

Next.js 15 app (App Router, Tailwind v4, dark-only). Dev server: `npm run dev`. Port 3000 is often taken on this machine, so check the log for the actual port (usually 3001).

Design tooling lives outside the repo in `F:/Web Development/design-toolkit/`. The skills are linked into `.claude/skills/` as junctions (gitignored), and the Playwright MCP is registered in `.mcp.json` (gitignored).

## 1. Design system grounding
- Read [DESIGN.md](DESIGN.md) before creating or modifying any UI.
- Use the tokens from `src/app/globals.css` (`bg-surface`, `text-ink-2`, `border-line`, `text-brand`, and so on). No raw hex values in components, and no new one-off colours, radii, or shadows.
- Refinement preserves the existing identity. A redesign happens only when the user asks for one.

## 2. Anti-slop rules (Impeccable and Taste Skill)
- Palette is blue, green, and near-black only (see DESIGN.md section 2). Never introduce purple, violet, or other off-palette hues, including in hardcoded hexes, SVGs, emails, and `public/reviewer.js`.
- Don't add new gradient-text headlines or new blue-to-green gradient fills. The existing brand accent words (logo "Sync", hero and section accent words) are intentional; change them only if asked.
- No emoji icon tiles above feature headings. Use lucide-react or simple-icons SVGs.
- For design work, use `/impeccable` (`audit`, `critique`, `polish`, `typeset`, `layout`, and so on). The marketing site is Persuade mode; `/app`, the canvas, and admin are Operate mode.
- `/design-taste-frontend` (Taste Skill) is built for new or restyled landing pages. Its house rules (one section per screen, photography-led) amount to a redesign, so use it only when the user asks for a restyle, not for small fixes.

## 3. UX and accessibility (`/web-design-guidelines`)
- Interactive elements, including close (X) icons, have a hit target of at least 24x24px, and 44x44px on mobile.
- Never disable browser zoom (`user-scalable=no` and `maximum-scale=1` are forbidden).
- Every async form submit or action button shows an explicit spinner and a disabled state while pending.
- Keep the `:focus-visible` ring and the `prefers-reduced-motion` overrides for any new animation.

## 4. Closed-loop browser QA (Playwright MCP)
- After building or changing a page, open it on the running localhost dev server with the Playwright MCP (`browser_navigate`).
- Check at 1440, 768, and 390 widths (`browser_resize`). Click the interactive elements you touched, then `browser_take_screenshot` and look at it.
- Confirm that no close button or CTA overflows its card or overlaps text and that `browser_console_messages` has no errors. Fix what you find before calling the task done.

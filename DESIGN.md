---
name: QASync
world: "Precision instrument at night: a near-black measurement surface, hairline grids and ruler ticks, deep blue for action and green for checked/verified."
colors:
  # Canonical values are the dark theme; the site and app ship dark-only (layout.tsx sets data-theme="dark").
  # The marketing site and the app share these exact tokens (.site-dark adds only gradient stops, eyebrow, shadows).
  paper: "#05070b"          # near-black page background
  surface: "#0b0e15"        # cards, panels, popovers
  surface-2: "#121722"      # raised/hover surface, inset wells
  ink: "#eef1f6"            # primary text
  ink-2: "#aeb6c6"          # body copy, secondary text
  ink-3: "#7d8699"          # meta text, placeholders (>= 4.9:1 on every surface)
  line: "#1b2130"           # hairline borders, grid
  line-strong: "#283044"    # input borders, dividers that must read
  brand: "#2f66e0"          # deep blue: primary buttons, pins, focus fills (white text 5.1:1)
  brand-ink: "#8fb3ff"      # blue text on dark
  brand-soft: "#0d1a38"     # navy tint backgrounds
  navy: "#102c5c"           # blue-900: glows, showcase panels, depth
  accent: "#22c27e"         # green-400: accent words, highlights, pass, verified
  accent-ink: "#6ee7b7"     # green-300: green text on dark
  accent-soft: "#0b2a1e"    # green tint backgrounds
  danger: "#f07686"
  danger-soft: "#35161d"
  status-open: "#f2555a"    # rose red: needs attention
  status-progress: "#f0900c"
  status-review: "#6f9bff"
  status-fixed: "#2f66e0"
  status-verified: "#22c27e"
  status-wontfix: "#8a92a6"
typography:
  sans: "Inter (variable), ui-sans-serif, system-ui, sans-serif"
  mono: "Geist Mono, ui-monospace, monospace"
  serif: "Instrument Serif, Georgia, serif (italic accent words only)"
  display-hero: { size: "46px / 64px sm / 84px md", weight: 600, line-height: 0.98, tracking: "-0.04em" }
  body-lead: { size: "18px", line-height: 1.625 }
  body: { size: "14px-15px" }
  meta: { size: "12px-13px" }
  eyebrow: { family: mono, size: "11px", tracking: "0.14em", transform: uppercase }
rounded:
  sm: "6px"       # rounded-md: chips, small controls
  md: "8px-0.6rem" # rounded-lg buttons and list rows; .input uses 0.6rem
  lg: "12px-16px" # rounded-xl / rounded-2xl: cards, panels
  xl: "24px"      # showcase frames
  full: "9999px"  # pills, avatars, eyebrows, status dots
spacing:
  base: "4px (Tailwind scale)"
  container: "max-w-7xl, px-4 / sm:px-6"
  grid-motif: "32px"
components:
  button-primary: { background: "{colors.brand}", text: "#ffffff", rounded: "{rounded.md}", min-hit: "24px desktop / 44px touch" }
  input: { height: "40px", background: "{colors.paper}", border: "{colors.line}", focus-border: "{colors.ink-3}", rounded: "{rounded.md}", text: "14px" }
  card: { background: "{colors.surface}", border: "{colors.line}", rounded: "{rounded.lg}" }
  eyebrow: { rounded: "{rounded.full}", border: "{colors.line-strong}", text: "{colors.brand-ink}" }
---

# QASync design system

Source of truth for tokens is [src/app/globals.css](src/app/globals.css) (CSS variables, exposed to Tailwind via `@theme inline`). This file describes them; if the two disagree, fix the disagreement instead of picking one silently.

## 1. Visual world

QASync is a visual QA tool, so the look borrows from measuring instruments: a dark, calm surface; hairline grids (`.bg-grid`) and ruler ticks (`.ruler-x`); precise small type; and colour used as signal, not decoration. The marketing site is in **Persuade** mode (bolder, with the hero glow, reveals, and gradient accent words). The app (`/app`, canvas, admin) is in **Operate** mode: restraint, density, and consistency come before expression.

## 2. Colour

Three colours only: **deep blue, green, near-black.** Blue and green are the classic quality-assurance pair (trust and "checked"), so the palette itself says what the product does.

- **Blue is the brand.** Primary buttons, links, comment pins, focus rings, and selection. Navy (`blue-900`) carries depth: glows, showcase panels, and tinted surfaces.
- **Green is the accent and means "checked".** Accent words, highlights, pass, and verified. Don't use green for primary actions, so "verified" stays legible.
- **Near-black canvas** with a faint navy cast. No purple, violet, or other off-palette hues anywhere, including logos, avatars, project colours, emails, and the injected reviewer script.
- **Amber and red appear only where they mean something:** in progress, open (rose red), and delete/error.
- Issue status colours (`--st-*`) are fixed semantics shared by pins, badges, and filters. Don't reuse them for decoration.
- Text hierarchy is `ink` > `ink-2` > `ink-3`. Never put `ink-3` text on `surface-2` at small sizes (contrast).
- The brand gradient (`--grad-brand`, blue to green) is reserved for the existing brand accents: the "Sync" in the logo, the hero accent words, and section accent words. Don't add new gradient headlines or gradient fills elsewhere.

## 3. Typography

- **Inter** (variable, via `next/font`) for everything; `ss01` is on globally. Tabular numbers are not global (in Inter they also widen hyphens), so add `tabular-nums` wherever digits must line up: counts, prices, tables, sizes.
- **Geist Mono** for eyebrows (11px, uppercase, 0.14em tracking), code, and data labels.
- **Instrument Serif italic** (`.serif-accent`) only for single accent words, never for whole lines.
- Display type is tight: weight 600, about -0.04em tracking, line-height near 1. Body copy is relaxed (1.6+) and capped near 38rem.
- Use `text-balance` on headings and `text-pretty` on paragraphs.

## 4. Shape and depth

- Radius scales with size: 6px for chips, 0.6rem for controls, 12-16px for cards, 24px for showcase frames, and full for pills.
- Depth comes from borders (`line`) and surface steps, not heavy shadows. `--shadow-1` is for resting elevation; `--shadow-2` is for popovers and menus only.

## 5. Motion

- Easing: `--ease-out` cubic-bezier(0.2, 0.7, 0.2, 1) for UI, `--ease-spring` for pins popping in, and `--ease-smooth` cubic-bezier(0.16, 1, 0.3, 1) for scroll reveals and view switches on the marketing site.
- The marketing site smooths wheel scrolling with Lenis (`MotionLayer` in `src/components/marketing/motion.tsx`). It keeps native scroll, so `position: sticky` and scroll listeners still work. It's off under `prefers-reduced-motion`, and touch keeps native momentum.
- Don't put `data-reveal` on an element whose `className` React changes after mount (for example an active/inactive tab). React rewrites the class and drops `is-visible`, so the element fades out. Put `data-reveal` on a wrapper with a fixed class instead.
- Motion explains the product (pin, fix, verify) or guides the eye once. Nothing loops loudly.
- **Signature motion: the orbiting ring.** A light-blue (`#8fb3ff`) → light-green (`#6ee7b7`) arc circles a 1px border once every 6s over a dim `line-strong` base. Use `.ring-flow` on small controls (account button, Sign in, hero URL box) and `.device-ring` on review-canvas device frames (a GPU-rotated layer, so it stays cheap on large frames). The hero horizon line flows the same two colours at the same pace. Reserve it for these brand moments; don't put it on ordinary cards or inputs.
- The review canvas stage is plain black (`.stage-wash`), so the page under review and its ring are all that shows.
- Every animation is disabled under `prefers-reduced-motion` (see the existing reduced-motion block in globals.css). New animations must join it.

## 6. Icons

- Use lucide-react line icons at a consistent stroke width, and simple-icons for real third-party logos (integrations, site logos).
- No emoji as icons.

## 7. Accessibility floor

- Hit targets are at least 24x24px, and 44x44px on touch layouts.
- Visible `:focus-visible` ring (2px blue, 2px offset). Never remove it without a replacement.
- Never disable zoom in the viewport config.
- Async buttons show a pending state (spinner plus disabled) while the action runs.

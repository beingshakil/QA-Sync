/* All marketing copy lives here so pages stay templates. Swap path: a headless CMS. */

export type Feature = { title: string; body: string; tag?: string };

export interface ProductPage {
  slug: string;
  name: string;
  /** Search title (≤ 51 chars; " | QASync" is appended) and meta description (≤ 160 chars). */
  seoTitle: string;
  seoDescription: string;
  menuBlurb: string;
  eyebrow: string;
  headline: string;
  accent: string;
  sub: string;
  features: Feature[];
  steps: { title: string; body: string }[];
  stat: { value: string; label: string };
  soon?: boolean;
}

export const PRODUCTS: ProductPage[] = [
  {
    slug: "capture",
    seoTitle: "Website Feedback Tool: Pin Comments on Live Sites",
    seoDescription: "Pin feedback on any live website in seconds. No snippet and no install, and the clients you invite comment without creating an account.",
    name: "Capture",
    menuBlurb: "Pin feedback on any page, PDF or image",
    eyebrow: "Capture",
    headline: "Point at it.",
    accent: "Don't describe it.",
    sub: "Paste a URL and start pinning in seconds. No snippet, no install, and no account needed for the people you invite.",
    features: [
      { title: "Live element pins", body: "Pins attach to the real element, not a flat screenshot, and stay put across redeploys and screen sizes." },
      { title: "Freeze hover states", body: "Press F to hold dropdowns, tooltips and hover styles in place long enough to pin them." },
      { title: "Device preview", body: "Switch between desktop, tablet and phone, or enter any width. Every pin remembers the viewport it was made on." },
      { title: "Voice notes with transcript", body: "Talk instead of typing. You get an editable transcript, and it's translated automatically for the assignee.", tag: "Soon" },
      { title: "Photo & PDF review", body: "Upload images and PDFs and pin them the same way. PDF text stays real, so you can select and measure it.", tag: "Soon" },
      { title: "Three ways in", body: "Use URL mode for zero setup, the browser extension for staging and logged-in pages, or a 25 KB widget for live sites." },
    ],
    steps: [
      { title: "Paste a URL", body: "Live, staging or a preview deploy." },
      { title: "Click the element", body: "QASync records the selector, styles, viewport and console." },
      { title: "Say what's wrong", body: "One text box. QASync writes the title and sets the priority." },
    ],
    stat: { value: "< 60s", label: "from URL to first shared pin" },
  },
  {
    slug: "design-qa",
    seoTitle: "Design QA Tool: Compare the Build With the Design",
    seoDescription: "Inspect type, spacing and contrast on the live page, then overlay the approved design to see exactly where the build drifted.",
    name: "Design QA",
    menuBlurb: "Check the build against the design",
    eyebrow: "Design QA",
    headline: "Catch the 2px drift",
    accent: "before your client does.",
    sub: "Inspect type, measure spacing and check contrast on the real page. Overlay the Figma frame and see exactly where the build drifted.",
    features: [
      { title: "Inspect mode", body: "Hover any element to read its font, size, weight, line height, colour and padding, just like in Figma." },
      { title: "Contrast, scored", body: "Every pin records the real contrast ratio against the effective background, with AA and AAA results." },
      { title: "Spacing overlay", body: "Padding is shaded right on the page, so your note says 24px instead of “a bit tight”." },
      { title: "Figma overlay", body: "Place the design frame over the build at the same width, then fade between them.", tag: "Soon" },
      { title: "Design drift detection", body: "Map frames to routes once. Each deploy is checked for token, spacing and type drift automatically.", tag: "Soon" },
      { title: "Design fidelity score", body: "One number per page that shows whether the build is getting closer to the design or further away.", tag: "Soon" },
    ],
    steps: [
      { title: "Press I", body: "Inspect mode shows specs on hover." },
      { title: "Click to capture", body: "The specs are attached to the issue automatically." },
      { title: "Developers fix it once", body: "Exact values, not adjectives." },
    ],
    stat: { value: "AA · AAA", label: "contrast result on every pin" },
  },
  {
    slug: "developer-context",
    seoTitle: "Visual Bug Reports With Full Developer Context",
    seoDescription: "Every QASync pin carries a CSS selector, browser, OS, viewport, pixel ratio and console errors, so developers can fix visual bugs without follow-ups.",
    name: "Developer context",
    menuBlurb: "Console, environment and selector on every issue",
    eyebrow: "Developer context",
    headline: "Every report arrives",
    accent: "ready to fix.",
    sub: "A stable CSS selector, the browser and OS, the viewport, the pixel ratio and recent console errors are attached to every pin automatically.",
    features: [
      { title: "Stable selectors", body: "QASync prefers IDs and meaningful classes and skips hashed CSS-in-JS names, so selectors survive a rebuild." },
      { title: "Console capture", body: "Errors logged before the report are attached, with file and line." },
      { title: "Environment snapshot", body: "Browser, OS, viewport and pixel ratio, captured without asking the reporter anything." },
      { title: "Session replay", body: "The 60 seconds before a report, masked in the browser before upload.", tag: "Soon" },
      { title: "Code-aware pins", body: "A Vite or Next.js plugin maps the element to its component and source file:line, with an “Open in editor” button.", tag: "Soon" },
      { title: "Two-way sync", body: "Jira, Linear, GitHub, GitLab, Azure DevOps, ClickUp, Asana and more, with status kept in step both ways.", tag: "Soon" },
    ],
    steps: [
      { title: "A reviewer pins an issue", body: "No technical knowledge needed." },
      { title: "QASync attaches the context", body: "Selector, styles, environment, console." },
      { title: "A developer reproduces it", body: "Without a single follow-up message." },
    ],
    stat: { value: "0", label: "“what browser were you on?” messages" },
  },
  {
    slug: "ai-agents",
    seoTitle: "AI Agents for Website QA, Connected Over MCP",
    seoDescription: "Connect Claude Code, Cursor or any MCP client to QASync. Agents read QA issues with full context, ship fixes and mark them Fixed for you to verify.",
    name: "AI & agents",
    menuBlurb: "Claude Code and Cursor fix issues over MCP",
    eyebrow: "AI & agents",
    headline: "Your agent fixes it.",
    accent: "QASync proves it.",
    sub: "Connect Claude Code, Cursor or any MCP client with a token from Settings. Agents read open issues with full context, fix them in your code, reply with what changed, and mark them Fixed for you to verify.",
    features: [
      { title: "Fix verification", body: "When an issue is marked fixed, QASync re-renders the element and compares it with the original. If the fix didn't land, the issue reopens with evidence attached.", tag: "Soon" },
      { title: "MCP server", body: "list_projects, list_issues, get_issue, reply_to_issue and update_issue, over Streamable HTTP with per-tool API tokens.", tag: "New" },
      { title: "Auto title & triage", body: "Type freely and QASync writes a clear title and suggests a priority. Duplicate reports are merged." },
      { title: "Two-way translation", body: "Clients write in their own language and developers read in theirs, within the same thread.", tag: "Soon" },
      { title: "Feedback to plan", body: "Turn a 40-comment review round into a prioritised sprint plan and client-ready release notes.", tag: "Soon" },
      { title: "Accessibility copilot", body: "Every WCAG finding comes with a code fix you can paste in.", tag: "Soon" },
    ],
    steps: [
      { title: "Connect once", body: "OAuth into your agent of choice." },
      { title: "“Fix the open issues”", body: "The agent gets selectors, specs and console output." },
      { title: "Verified ✓", body: "QASync re-checks and closes the loop." },
    ],
    stat: { value: "1 click", label: "from Fixed to Verified" },
  },
  {
    slug: "monitoring",
    seoTitle: "Website Audit: SEO, Broken Links and Accessibility",
    seoDescription: "Audit any page for SEO basics, broken links, alt text, accessibility and font sprawl. Every failing check comes with the fix to make.",
    name: "Audits & monitoring",
    menuBlurb: "Broken links, accessibility, SEO, scored",
    eyebrow: "Audits & monitoring",
    headline: "A health score",
    accent: "for every page.",
    sub: "One click checks for broken links, missing labels, alt text, SEO basics, font sprawl and misspellings, and scores the page out of 100. Turn any finding into an issue.",
    features: [
      { title: "Broken links", body: "Every link on the page is checked, with the HTTP status for each one." },
      { title: "Accessibility basics", body: "Unlabelled fields, missing alt text, missing accessible names and missing lang attributes." },
      { title: "SEO checks", body: "Title, description, H1 structure, canonical URL, Open Graph tags and the viewport tag." },
      { title: "Font sprawl", body: "Counts the font families a page actually loads, including those in linked stylesheets." },
      { title: "Scheduled scans", body: "Run nightly or on each deploy, and get alerted when a score drops.", tag: "Soon" },
      { title: "Visual regression", body: "Compare every deploy with the last approved version and pin the differences automatically.", tag: "Soon" },
    ],
    steps: [
      { title: "Run an audit", body: "From a project or the canvas." },
      { title: "Review findings", body: "Grouped by severity." },
      { title: "One click → issue", body: "Sent to the same workflow as everything else." },
    ],
    stat: { value: "100", label: "point page health score" },
  },
];

export interface SolutionPage {
  slug: string;
  name: string;
  seoTitle: string;
  seoDescription: string;
  menuBlurb: string;
  headline: string;
  accent: string;
  sub: string;
  pains: { title: string; body: string }[];
  gains: string[];
  quote: { text: string; who: string };
}

export const SOLUTIONS: SolutionPage[] = [
  {
    slug: "designers",
    seoTitle: "Visual QA for Designers: Specs, Not Screenshots",
    seoDescription: "Inspect, measure and compare your design on the live page, then hand developers exact values instead of screenshots with red circles.",
    name: "Designers",
    menuBlurb: "See whether the build matches",
    headline: "Your design,",
    accent: "built as drawn.",
    sub: "Inspect, measure and compare on the real page, then hand developers exact values instead of screenshots with red circles.",
    pains: [
      { title: "“Looks a bit off”", body: "Vague notes become exact values: 24px vs 16px, weight 500 vs 600, contrast 3.8:1." },
      { title: "Screenshot ping-pong", body: "Every pin is tied to the live element, so nobody asks which button you meant." },
      { title: "Drift after launch", body: "Fix verification re-checks the element, so a fixed spacing issue can't quietly come back." },
    ],
    gains: ["Inspect mode with type and spacing specs", "Contrast ratios on every pin", "Device-specific pins", "Figma overlay (soon)"],
    quote: { text: "My notes say 24px now instead of “feels tight”. Developers fix things the first time.", who: "Placeholder quote: replace with a real customer" },
  },
  {
    slug: "agencies",
    seoTitle: "Client Feedback Tool for Web Design Agencies",
    seoDescription: "Send clients one link. They pin feedback on the real site with no account or install, and your team gets a clean, prioritised list of fixes.",
    name: "Agencies",
    menuBlurb: "Painless client feedback and sign-off",
    headline: "Client feedback",
    accent: "without the chaos.",
    sub: "Send one link. Clients pin feedback on the real site with no account and no install, and you get a clean, prioritised list.",
    pains: [
      { title: "Feedback by email, PDF and WhatsApp", body: "Everything lands in one place, pinned to the element it refers to." },
      { title: "“Did you fix my thing?”", body: "Clients see live status on every pin and can sign off themselves." },
      { title: "Scope creep", body: "Approval rounds freeze what was agreed, so new requests stay visible as new.", },
    ],
    gains: ["Guest links with no account", "Client portal on your own domain (soon)", "Approval rounds with sign-off (soon)", "Monthly quality report for clients (soon)"],
    quote: { text: "Our clients stopped sending annotated PDFs. That alone saved a day a week.", who: "Placeholder quote: replace with a real customer" },
  },
  {
    slug: "developers",
    seoTitle: "Visual Bug Reports Developers Can Act On",
    seoDescription: "Every issue arrives with a CSS selector, computed styles, browser, viewport and console errors, ready for you or your AI agent to fix.",
    name: "Developers",
    menuBlurb: "Precise context, zero follow-ups",
    headline: "Bug reports",
    accent: "you can actually use.",
    sub: "A stable selector, computed styles, environment and console errors on every issue, delivered to your tracker or your AI agent.",
    pains: [
      { title: "Unreproducible reports", body: "Browser, OS, viewport, pixel ratio and console errors are captured automatically." },
      { title: "Hunting for the element", body: "You get a selector you can paste straight into the devtools console." },
      { title: "Context switching", body: "Work from Jira, Linear or GitHub, with status synced both ways." },
    ],
    gains: ["Stable CSS selectors", "Console error capture", "MCP for agent fixes", "Source file:line mapping (soon)"],
    quote: { text: "I paste the selector into devtools and I'm looking at the bug. No back-and-forth.", who: "Placeholder quote: replace with a real customer" },
  },
  {
    slug: "qa-teams",
    seoTitle: "Website QA Tool for QA Teams and Testers",
    seoDescription: "Pin issues with keyboard shortcuts, test every device size, run page audits and track each page from not reviewed to passed in one canvas.",
    name: "QA teams",
    menuBlurb: "File visual issues faster",
    headline: "Visual QA",
    accent: "at the speed of clicking.",
    sub: "Keyboard-driven pinning, device presets, page audits and a verification step that proves each fix landed.",
    pains: [
      { title: "Slow bug filing", body: "C to comment, I to inspect, F to freeze. Most issues are filed in under 10 seconds." },
      { title: "Fixed, then broken again", body: "The Verified status means a fix was re-checked, not just claimed." },
      { title: "Checklists in spreadsheets", body: "Guided review checklists turn each failed check into an issue.", },
    ],
    gains: ["Keyboard shortcuts throughout", "Page audit with a score", "Fixed → Verified workflow", "Guided QA checklists (soon)"],
    quote: { text: "The verified column is the first time our board has told the truth.", who: "Placeholder quote: replace with a real customer" },
  },
  {
    slug: "product-teams",
    seoTitle: "Website Review Tool for Product Teams",
    seoDescription: "Bring design, engineering, marketing and clients into one review of the live product, page by page, from first draft to launch.",
    name: "Product teams",
    menuBlurb: "Review releases before your users do",
    headline: "Ship the release",
    accent: "everyone signed off on.",
    sub: "Bring design, engineering, marketing and stakeholders into one review of the real product, from preview deploy to launch.",
    pains: [
      { title: "Launch-day surprises", body: "Review every preview deploy, with a pull-request check that blocks merging until it's approved." },
      { title: "Feedback everywhere", body: "One inbox across projects, with saved views by owner and priority." },
      { title: "No quality signal", body: "Time to resolution, reopen rate and fidelity score, tracked over time." },
    ],
    gains: ["Unified inbox", "Board and list views", "PR preview reviews (soon)", "Quality analytics (soon)"],
    quote: { text: "We finally review the thing we ship, not a Figma file from three weeks ago.", who: "Placeholder quote: replace with a real customer" },
  },
];

export const INTEGRATIONS: { group: string; items: { name: string; desc: string; status?: "Soon" | "Beta" }[] }[] = [
  {
    group: "Issue trackers",
    items: [
      { name: "Jira", desc: "Two-way status, custom field mapping", status: "Soon" },
      { name: "Linear", desc: "Issues, labels and cycles stay in sync", status: "Soon" },
      { name: "GitHub", desc: "Issues plus a pull-request check that blocks merging", status: "Soon" },
      { name: "GitLab", desc: "Issues and merge-request previews", status: "Soon" },
      { name: "Azure DevOps", desc: "Work items with full context", status: "Soon" },
      { name: "Bitbucket", desc: "Issues and pipelines", status: "Soon" },
    ],
  },
  {
    group: "Project management",
    items: [
      { name: "ClickUp", desc: "Two-way task sync", status: "Soon" },
      { name: "Asana", desc: "Tasks with screenshots and specs", status: "Soon" },
      { name: "Trello", desc: "Cards per pin", status: "Soon" },
      { name: "Monday.com", desc: "Items with status mapping", status: "Soon" },
      { name: "Notion", desc: "Database rows per issue", status: "Soon" },
      { name: "Basecamp", desc: "To-dos per pin", status: "Soon" },
    ],
  },
  {
    group: "Communication",
    items: [
      { name: "Slack", desc: "Assign and resolve without leaving Slack", status: "Soon" },
      { name: "Microsoft Teams", desc: "Channel alerts and digests", status: "Soon" },
      { name: "Email", desc: "Mentions and daily digests", status: "Beta" },
    ],
  },
  {
    group: "Design & build",
    items: [
      { name: "Figma", desc: "Frame overlay and drift detection", status: "Soon" },
      { name: "Vercel", desc: "A review for every preview deploy", status: "Soon" },
      { name: "Netlify", desc: "Deploy previews, reviewed", status: "Soon" },
      { name: "WordPress", desc: "One-click widget plugin", status: "Soon" },
      { name: "Webflow", desc: "Widget app", status: "Soon" },
      { name: "Shopify", desc: "Theme app extension", status: "Soon" },
    ],
  },
  {
    group: "AI & automation",
    items: [
      { name: "Claude", desc: "Claude Code over MCP: read, fix, reply" },
      { name: "ChatGPT", desc: "MCP connector", status: "Soon" },
      { name: "Codex / Cursor", desc: "MCP: fix issues from your editor" },
      { name: "Webhooks", desc: "Signed, with a delivery log and replay", status: "Soon" },
      { name: "Zapier / Make / n8n", desc: "Connect anything", status: "Soon" },
      { name: "REST API", desc: "Everything the app can do", status: "Beta" },
    ],
  },
];

export interface Plan {
  name: string;
  /** Price in USD per month. */
  price: number;
  blurb: string;
  cta: string;
  featured?: boolean;
  features: string[];
  /** Small print under the feature list. */
  note?: string;
}

export const PLANS: Plan[] = [
  {
    name: "Free",
    price: 0,
    blurb: "For freelancers and small sites.",
    cta: "Start free",
    features: ["2 projects", "50 comments", "Live element pins", "3 page audits", "You and 1 teammate"],
    note: "Guests can view shared reviews. Inspect, freeze hover, device sizes, design overlay and page-wise QA are on Pro.",
  },
  {
    name: "Pro",
    price: 5,
    blurb: "Drop a cup of coffee.",
    cta: "Get Pro",
    featured: true,
    features: ["Unlimited projects, comments and audits", "Unlimited teammates and client guests", "Inspect, measure and freeze hover", "Device sizes, split view and design overlay", "Page-wise QA tracking and AI agents"],
    note: "Unlimited under fair use: everything a normal team needs. If one workspace's usage starts slowing QASync down for others, we'll talk to you first.",
  },
];

/** Comparison table: one value per plan, in PLANS order. */
export const PLAN_MATRIX: { group: string; rows: [string, ...(string | boolean)[]][] }[] = [
  {
    group: "Limits",
    rows: [
      ["Projects", "2", "Unlimited"],
      ["Comments (pins and replies)", "50", "Unlimited"],
      ["Page audits", "3", "Unlimited"],
      ["Team members", "2", "Unlimited"],
      ["Guests (comment through a share link, no account)", "View only", "Unlimited"],
    ],
  },
  {
    group: "Review tools",
    rows: [
      ["Live element pins", true, true],
      ["Inspect, measure, contrast", false, true],
      ["Freeze hover", false, true],
      ["Device sizes, split view and sync scroll", false, true],
      ["Design overlay", false, true],
      ["Page-wise QA tracking", false, true],
      ["AI agents (MCP)", false, true],
    ],
  },
];

export const FAQ: { q: string; a: string }[] = [
  { q: "Do the people I share with need an account?", a: "No. A share link opens in any browser. Guests enter their name once, then pin, reply and sign off without signing up or installing anything." },
  { q: "How does it work without installing anything?", a: "Paste a URL and QASync loads the page through a secure proxy with the review tools added on top. Nothing is added to your site. Pages behind a login, or on localhost, can't be loaded this way yet." },
  { q: "What's the difference between Fixed and Verified?", a: "Fixed means someone shipped a change. Verified means a person checked the live page and confirmed it. AI agents can mark issues Fixed, but only people can mark them Verified." },
  { q: "Does it work with my website?", a: "Most public sites work, whether they're built with Webflow, WordPress, Shopify, Framer or custom code. Sites that block automated access may not load in the canvas." },
  { q: "Can AI agents fix issues?", a: "Yes. Create a token in Settings and connect Claude Code, Cursor or any MCP client. Agents get the selector, element styles and console errors for each issue, reply with what they changed and mark it Fixed; you verify it in the canvas." },
  { q: "Who can see my projects?", a: "Your workspace, plus anyone you send a share link to. A share link only opens the project it was made for, and guests can only edit what they wrote." },
];

export const CHANGELOG: { date: string; title: string; items: string[] }[] = [
  { date: "2026-11-13", title: "AI agents and SEO audits", items: ["MCP server: Claude Code, Cursor and other MCP clients can read, reply to and fix issues", "Full SEO audit report with 12 pass/fail checks and a fix for every red item", "Exclude navbar and footer links from link checks", "Delete audit reports you no longer need"] },
  { date: "2026-11-13", title: "Phase 1 preview", items: ["Review canvas with live element pins, inspect mode and freeze hover", "Issue workflow from Open through Fixed to Verified, with list and board views", "Guest share links", "Page audits with a 100-point score"] },
  { date: "2026-10-28", title: "Design system", items: ["“Precision instrument” design language", "Light and dark themes", "Geist Sans and Mono typography"] },
];

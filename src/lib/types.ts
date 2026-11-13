export const STATUSES = ["open", "in_progress", "in_review", "fixed", "verified", "wont_fix"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  open: "Open",
  in_progress: "In progress",
  in_review: "In review",
  fixed: "Fixed",
  verified: "Verified",
  wont_fix: "Won't fix",
};

export const PRIORITIES = ["urgent", "high", "medium", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export type ProjectType = "website" | "files";

export interface Project {
  id: string;
  workspaceId?: string;
  name: string;
  type: ProjectType;
  baseUrl: string;
  figmaUrl: string | null;
  color: string;
  createdAt: string;
  issueCount?: number;
  openCount?: number;
}

export interface ElementInfo {
  tag: string;
  text: string;
  font: string;
  size: string;
  weight: string;
  lineHeight: string;
  color: string;
  bg: string;
  contrast: number | null;
  padding: string;
  width: number;
  height: number;
}

export interface EnvInfo {
  ua: string;
  browser: string;
  os: string;
  dpr: number;
  url: string;
  consoleErrors: string[];
}

export interface Issue {
  id: string;
  number: number;
  projectId: string;
  pageUrl: string;
  title: string;
  body: string;
  status: Status;
  priority: Priority;
  assignee: string | null;
  reporterName: string;
  reporterType: "member" | "guest";
  selector: string | null;
  xPct: number;
  yPct: number;
  viewportW: number;
  device: string;
  element: ElementInfo | null;
  env: EnvInfo | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  verifiedAt: string | null;
  editedAt?: string | null;
  attachments: Attachment[];
  commentCount?: number;
  projectName?: string;
}

export interface Attachment {
  id: string;
  url: string;
  mime: string;
  name: string;
  size: number;
}

export interface Design {
  id: string;
  projectId: string;
  pageUrl: string;
  device: string;
  url: string;
  createdAt: string;
}

export interface Member {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: "owner" | "admin" | "member";
}

/** The current user's view of their active workspace. */
export interface Workspace {
  id: string;
  name: string;
  /** The signed-in user's display name, email, picture and role here. */
  userName: string;
  userEmail: string;
  userImage: string | null;
  role: Member["role"];
  /** Display names, for assignees and @mentions. */
  members: string[];
  memberList: Member[];
  invites: { email: string; createdAt: string }[];
}

export interface Comment {
  id: string;
  issueId: string;
  author: string;
  authorType: "member" | "guest";
  body: string;
  createdAt: string;
  editedAt?: string | null;
}

export interface Activity {
  id: string;
  issueId: string;
  type: "created" | "status" | "priority" | "assignee" | "comment";
  fromVal: string | null;
  toVal: string | null;
  actor: string;
  createdAt: string;
}

export interface ShareLink {
  token: string;
  projectId: string;
  role: "comment" | "view";
  createdAt: string;
}

export interface AuditFinding {
  rule: string;
  severity: "error" | "warning" | "info";
  message: string;
  detail?: string;
  selector?: string;
}

export interface Audit {
  id: string;
  projectId: string;
  url: string;
  score: number;
  findings: AuditFinding[];
  stats: Record<string, number | string>;
  /** On-page and technical SEO data; null for audits run before the SEO report existed. */
  seo: SeoReport | null;
  createdAt: string;
}

/* ── SEO report: raw facts gathered by the audit; pass/fail rules live in lib/seo-checks.ts ── */
export interface SeoLink {
  url: string;
  anchor: string;
  /** false when rel contains nofollow, sponsored or ugc */
  dofollow: boolean;
  /** HTTP status when the link was checked (0 = unreachable), undefined when not checked */
  status?: number;
  /** Where the link sits: site navbar, footer, or page content. Missing on audits before this existed. */
  area?: LinkArea;
}

export type LinkArea = "content" | "nav" | "footer";

export interface SeoImage {
  src: string;
  /** null = no alt attribute; "" = marked decorative */
  alt: string | null;
}

export interface SeoSchemaItem {
  type: string;
  source: "json-ld" | "microdata";
  fields: [string, string][];
}

export interface SeoReport {
  finalUrl: string;
  status: number;
  url: { length: number; pathLength: number; https: boolean; depth: number; params: number; hasUppercase: boolean; hasUnderscore: boolean; hasSpaces: boolean };
  robots: { meta: string | null; header: string | null; indexable: boolean };
  title: string | null;
  description: string | null;
  canonical: string | null;
  lang: string | null;
  wordCount: number;
  headings: { level: number; text: string }[];
  links: { internal: SeoLink[]; external: SeoLink[]; checked: number };
  images: SeoImage[];
  schema: SeoSchemaItem[];
  og: Record<string, string>;
  twitter: Record<string, string>;
}


export type PageState = "not_reviewed" | "in_review" | "ready" | "passed";

export const PAGE_STATE_LABEL: Record<PageState, string> = {
  not_reviewed: "Not reviewed",
  in_review: "In review",
  ready: "Ready to sign off",
  passed: "QA passed",
};

export const PAGE_STATE_COLOR: Record<PageState, string> = {
  not_reviewed: "var(--st-wontfix)",
  in_review: "var(--st-progress)",
  ready: "var(--st-fixed)",
  passed: "var(--st-verified)",
};

export interface Page {
  id: string;
  projectId: string;
  url: string;
  key: string;
  title: string | null;
  qaStatus: "pending" | "done";
  qaBy: string | null;
  qaAt: string | null;
  createdAt: string;
  lastVisitedAt: string | null;
  total: number;
  open: number;
  resolved: number;
  state: PageState;
}

/** A page's QA state follows from its sign-off flag and its issues. */
export function pageState(qaStatus: Page["qaStatus"], total: number, open: number): PageState {
  if (qaStatus === "done") return "passed";
  if (open > 0) return "in_review";
  if (total > 0) return "ready";
  return "not_reviewed";
}

export const OPEN_STATUSES: Status[] = ["open", "in_progress", "in_review"];

/* ── Issue colour = severity while open, green once solved ── */
export const PRIORITY_LABEL: Record<Priority, string> = { urgent: "Critical", high: "Major", medium: "Medium", low: "Low" };
export const PRIORITY_COLOR: Record<Priority, string> = { urgent: "#b91c1c", high: "#ef4444", medium: "#f97316", low: "#eab308" };
export const SOLVED_COLOR = "#16a34a";
export const WONTFIX_COLOR = "#9ca3af";

export function issueColor(i: { status: Status; priority: Priority }): string {
  if (i.status === "fixed" || i.status === "verified") return SOLVED_COLOR;
  if (i.status === "wont_fix") return WONTFIX_COLOR;
  return PRIORITY_COLOR[i.priority];
}

/** Readable text on top of issueColor (yellow needs dark text). */
export function issueTextColor(i: { status: Status; priority: Priority }): string {
  return issueColor(i) === PRIORITY_COLOR.low ? "#422006" : "#ffffff";
}

/** API token for the MCP server; the raw token is only shown once, on creation. */
export interface ApiToken {
  id: string;
  name: string;
  /** First characters of the token, so people can tell their tokens apart. */
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

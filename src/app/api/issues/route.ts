import { checkLimit, createIssue, notifyUsage, requireFeature, getShare, getUpload, listIssues, resetPageQa, upsertPage, type IssueFilter } from "@/server/repo";
import { actorFrom, fail, isMember, member, ok, projectFor, readJson } from "@/server/http";
import { autoTitle, stripMentions, suggestPriority } from "@/server/ai";
import { q } from "@/server/db";
import { autoPush, maybeSync } from "@/server/notion";
import { PRIORITIES, type Attachment, type ElementInfo, type EnvInfo, type Priority } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const token = sp.get("shareToken");
  const filter: IssueFilter = {
    projectId: sp.get("projectId") ?? undefined,
    status: (sp.get("status") as IssueFilter["status"]) ?? undefined,
    pageUrl: sp.get("pageUrl") ?? undefined,
    assignee: sp.get("assignee") ?? undefined,
    q: sp.get("q") ?? undefined,
  };
  if (token) {
    const share = await getShare(token);
    if (!share) return fail("Invalid share link", 403);
    filter.projectId = share.projectId;
  } else {
    const ctx = await member();
    if (ctx instanceof Response) return ctx;
    filter.workspaceId = ctx.workspaceId;
  }
  // Someone is looking at this project's issues: pull status changes made in Notion (every 2 min at most).
  if (filter.projectId) maybeSync(filter.projectId);
  return ok(await listIssues(filter));
}

interface Body {
  projectId: string;
  pageUrl: string;
  body: string;
  title?: string;
  priority?: Priority;
  assignee?: string | null;
  selector?: string | null;
  xPct?: number;
  yPct?: number;
  viewportW?: number;
  device?: string;
  element?: ElementInfo | null;
  env?: EnvInfo | null;
  attachments?: { id: string }[];
  shareToken?: string;
  guestName?: string;
}

/** Display names of the members of a project's workspace (for @mentions in auto titles). */
async function memberNames(workspaceId: string) {
  return (await q<{ name: string }>("SELECT u.name FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.workspace_id = ?", workspaceId)).map((r) => r.name);
}

export async function POST(req: Request) {
  const b = await readJson<Body>(req);
  if (!b?.projectId || !b.pageUrl) return fail("projectId and pageUrl are required");
  if (!b.body?.trim() && !b.title?.trim() && !b.attachments?.length) return fail("Say what needs to change");
  const actor = await actorFrom(b);
  if ("error" in actor) return fail(actor.error, actor.status);
  const project = await projectFor(actor, b.projectId);
  if (!project) return fail(actor.kind === "guest" ? "Share link doesn't cover this project" : "Project not found", actor.kind === "guest" ? 403 : 404);

  if (actor.kind === "guest" && (await requireFeature(project.workspaceId!, "guests"))) return fail("This review is view-only for now. Commenting is turned off for guests.", 402);
  const limited = await checkLimit(project.workspaceId!, "comments");
  if (limited) return fail(actor.kind === "guest" ? "This project can't take new comments right now. Let the team know." : limited, 402);

  const text = (b.body ?? "").trim().slice(0, 5000);
  // Only reference files that were really uploaded; rebuild metadata server-side.
  const attachments: Attachment[] = [];
  for (const a of (b.attachments ?? []).slice(0, 10)) {
    const u = a?.id ? await getUpload(a.id) : null;
    if (u) attachments.push({ id: a.id, url: `/api/uploads/${a.id}`, mime: u.mime, name: u.name, size: u.size });
  }
  const names = await memberNames(project.workspaceId!);
  const issue = await createIssue({
    projectId: project.id,
    pageUrl: b.pageUrl,
    title: (b.title?.trim() || autoTitle(stripMentions(text, names), b.element)).slice(0, 140),
    body: text,
    priority: b.priority && PRIORITIES.includes(b.priority) ? b.priority : suggestPriority(text),
    assignee: actor.kind === "member" && (await isMember(actor.workspaceId, b.assignee)) ? b.assignee! : null,
    attachments,
    reporterName: actor.name,
    reporterType: actor.kind,
    selector: b.selector ?? null,
    xPct: clamp(b.xPct),
    yPct: clamp(b.yPct),
    viewportW: Math.round(b.viewportW ?? 1280),
    device: b.device ?? "desktop",
    element: b.element ?? null,
    env: b.env ?? null,
  });
  // The page joins the QA checklist, and new work on a signed-off page puts it back in review.
  await upsertPage(issue.projectId, issue.pageUrl);
  await resetPageQa(issue.projectId, issue.pageUrl);
  await notifyUsage(project.workspaceId!);
  autoPush(issue);
  return ok(issue, 201);
}

const clamp = (n?: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? (n as number) : 0));

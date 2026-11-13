import { createIssue, getProject, getShare, getUpload, getWorkspace, listIssues, resetPageQa, upsertPage, type IssueFilter } from "@/server/repo";
import { actorFrom, fail, isMember, ok, readJson } from "@/server/http";
import { autoTitle, stripMentions, suggestPriority } from "@/server/ai";
import { PRIORITIES, type Attachment, type ElementInfo, type EnvInfo, type Priority } from "@/lib/types";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
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
    const share = getShare(token);
    if (!share) return fail("Invalid share link", 403);
    filter.projectId = share.projectId;
  }
  return ok(listIssues(filter));
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

export async function POST(req: Request) {
  const b = await readJson<Body>(req);
  if (!b?.projectId || !b.pageUrl) return fail("projectId and pageUrl are required");
  if (!b.body?.trim() && !b.title?.trim() && !b.attachments?.length) return fail("Say what needs to change");
  const actor = actorFrom(b);
  if ("error" in actor) return fail(actor.error, 403);
  if (actor.kind === "guest" && actor.projectId !== b.projectId) return fail("Share link doesn't cover this project", 403);
  if (!getProject(b.projectId)) return fail("Project not found", 404);

  const text = (b.body ?? "").trim().slice(0, 5000);
  // Only reference files that were really uploaded; rebuild metadata server-side.
  const attachments: Attachment[] = (b.attachments ?? []).slice(0, 10).flatMap((a) => {
    const u = a?.id ? getUpload(a.id) : null;
    return u ? [{ id: a.id, url: `/api/uploads/${a.id}`, mime: u.mime, name: u.name, size: u.size }] : [];
  });
  const issue = createIssue({
    projectId: b.projectId,
    pageUrl: b.pageUrl,
    title: (b.title?.trim() || autoTitle(stripMentions(text, getWorkspace().members), b.element)).slice(0, 140),
    body: text,
    priority: b.priority && PRIORITIES.includes(b.priority) ? b.priority : suggestPriority(text),
    assignee: actor.kind === "member" && isMember(b.assignee) ? b.assignee : null,
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
  upsertPage(issue.projectId, issue.pageUrl);
  resetPageQa(issue.projectId, issue.pageUrl);
  return ok(issue, 201);
}

const clamp = (n?: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? (n as number) : 0));

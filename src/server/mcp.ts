import "server-only";
import { addComment, getIssue, getProject, getWorkspace, listActivity, listComments, listIssues, listProjects, resetPageQa, updateIssue } from "./repo";
import { OPEN_STATUSES, PRIORITIES, STATUS_LABEL, PRIORITY_LABEL, type Issue, type Priority, type Status } from "@/lib/types";

/**
 * QASync MCP server: tools that let AI agents (Claude Code, Cursor, …) read review feedback,
 * reply, and move issues through the workflow. Transport lives in app/api/mcp/route.ts.
 *
 * Agents may mark an issue Fixed, but only a person marks it Verified.
 */

export const MCP_SERVER_INFO = { name: "qasync", title: "QASync", version: "1.0.0" } as const;

export const MCP_INSTRUCTIONS = `QASync holds visual QA feedback that people pinned on live websites.
Typical flow: list_projects -> list_issues (open ones) -> get_issue for full context (page URL, CSS selector, element styles, browser, console errors, screenshots, thread) -> fix the code -> reply_to_issue explaining the fix -> update_issue with status "fixed".
Never claim an issue is verified; a person checks the fix in QASync and marks it Verified.`;

/** Context for one MCP request. */
export interface McpContext {
  /** Absolute origin of this QASync instance, for links. */
  origin: string;
  /** Who is acting: the API token's name, e.g. "Claude Code". */
  actor: string;
}

interface ToolDef {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: Record<string, unknown>;
  run: (args: Record<string, unknown>, ctx: McpContext) => unknown;
}

class ToolError extends Error {}

const AGENT_STATUSES = ["open", "in_progress", "in_review", "fixed", "wont_fix"] as const;

function str(args: Record<string, unknown>, key: string, required = false): string | undefined {
  const v = args[key];
  if (v === undefined || v === null || v === "") {
    if (required) throw new ToolError(`"${key}" is required`);
    return undefined;
  }
  if (typeof v !== "string") throw new ToolError(`"${key}" must be a string`);
  return v.trim();
}

function requireIssue(args: Record<string, unknown>): Issue {
  const id = str(args, "issue_id", true)!;
  const issue = getIssue(id);
  if (!issue) throw new ToolError(`No issue with id "${id}". Use list_issues to find issue ids.`);
  return issue;
}

const reviewLink = (ctx: McpContext, i: Pick<Issue, "projectId" | "id">) => `${ctx.origin}/app/projects/${i.projectId}/review?issue=${i.id}`;

function summary(i: Issue, ctx: McpContext) {
  return {
    issue_id: i.id,
    number: i.number,
    project: i.projectName,
    title: i.title,
    status: i.status,
    priority: PRIORITY_LABEL[i.priority],
    page_url: i.pageUrl,
    device: i.device,
    selector: i.selector,
    assignee: i.assignee,
    replies: i.commentCount ?? 0,
    created_at: i.createdAt,
    link: reviewLink(ctx, i),
  };
}

const TOOLS: ToolDef[] = [
  {
    name: "list_projects",
    title: "List projects",
    description: "List every QASync project (a website under review) with its URL and how many issues are open.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
    run: (_args, ctx) =>
      listProjects().map((p) => ({
        project_id: p.id,
        name: p.name,
        url: p.baseUrl,
        open_issues: p.openCount ?? 0,
        total_issues: p.issueCount ?? 0,
        link: `${ctx.origin}/app/projects/${p.id}/review`,
      })),
  },
  {
    name: "list_issues",
    title: "List issues",
    description:
      'List feedback issues, newest first. Defaults to issues that still need work ("open": Open, In progress, In review). Filter by project and page. Returns ids for get_issue.',
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Only issues in this project (from list_projects)." },
        status: {
          type: "string",
          enum: ["open", "fixed", "verified", "wont_fix", "all"],
          description: '"open" (default) = still needs work; "fixed" = waiting for a person to verify; "all" = everything.',
        },
        page_url: { type: "string", description: "Only issues pinned on this exact page URL." },
        limit: { type: "integer", minimum: 1, maximum: 200, description: "Maximum issues to return (default 50)." },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    run: (args, ctx) => {
      const projectId = str(args, "project_id");
      if (projectId && !getProject(projectId)) throw new ToolError(`No project with id "${projectId}". Use list_projects.`);
      const status = str(args, "status") ?? "open";
      if (!["open", "fixed", "verified", "wont_fix", "all"].includes(status)) throw new ToolError(`Unknown status "${status}"`);
      const limit = Math.min(200, Math.max(1, Number(args.limit ?? 50) || 50));
      let issues = listIssues({ projectId, pageUrl: str(args, "page_url"), status: status === "open" || status === "all" ? undefined : (status as Status) });
      if (status === "open") issues = issues.filter((i) => OPEN_STATUSES.includes(i.status));
      return { total: issues.length, issues: issues.slice(0, limit).map((i) => summary(i, ctx)) };
    },
  },
  {
    name: "get_issue",
    title: "Get issue details",
    description:
      "Everything needed to fix one issue: the reviewer's comment, page URL, device and viewport, CSS selector and computed styles of the pinned element, browser and console errors, screenshot/attachment URLs, and the reply thread.",
    inputSchema: {
      type: "object",
      properties: { issue_id: { type: "string", description: "Issue id from list_issues." } },
      required: ["issue_id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    run: (args, ctx) => {
      const i = requireIssue(args);
      return {
        ...summary(i, ctx),
        status_label: STATUS_LABEL[i.status],
        comment: i.body,
        reporter: i.reporterName,
        viewport_width: i.viewportW,
        pin_position: { x_percent: i.xPct, y_percent: i.yPct },
        element: i.element,
        environment: i.env,
        attachments: i.attachments.map((a) => ({ name: a.name, type: a.mime, url: a.url.startsWith("/") ? ctx.origin + a.url : a.url })),
        thread: listComments(i.id).map((c) => ({ author: c.author, text: c.body, at: c.createdAt })),
        history: listActivity(i.id).map((a) => ({ change: a.type, from: a.fromVal, to: a.toVal, by: a.actor, at: a.createdAt })),
      };
    },
  },
  {
    name: "reply_to_issue",
    title: "Reply to an issue",
    description: "Add a reply to an issue's thread, e.g. to explain what was changed and where, or to ask the reviewer a question.",
    inputSchema: {
      type: "object",
      properties: {
        issue_id: { type: "string", description: "Issue id from list_issues." },
        text: { type: "string", description: "The reply (plain text, up to 5000 characters)." },
      },
      required: ["issue_id", "text"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    run: (args, ctx) => {
      const i = requireIssue(args);
      const text = str(args, "text", true)!.slice(0, 5000);
      const c = addComment({ issueId: i.id, author: ctx.actor, authorType: "member", body: text });
      return { ok: true, reply_id: c.id, issue_id: i.id, link: reviewLink(ctx, i) };
    },
  },
  {
    name: "update_issue",
    title: "Update an issue",
    description:
      'Change an issue\'s status, priority or assignee. Set status "fixed" once the fix is in; a person then verifies it in QASync. Agents cannot set "verified".',
    inputSchema: {
      type: "object",
      properties: {
        issue_id: { type: "string", description: "Issue id from list_issues." },
        status: { type: "string", enum: [...AGENT_STATUSES], description: "New status." },
        priority: { type: "string", enum: [...PRIORITIES], description: "urgent = Critical, high = Major, medium, low." },
        assignee: { type: ["string", "null"], description: "A workspace member's name, or null to unassign." },
      },
      required: ["issue_id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    run: (args, ctx) => {
      const i = requireIssue(args);
      const patch: Parameters<typeof updateIssue>[1] = {};
      const status = str(args, "status");
      if (status) {
        if (status === "verified") throw new ToolError('Only a person can mark an issue "verified". Set "fixed" and they will check it.');
        if (!(AGENT_STATUSES as readonly string[]).includes(status)) throw new ToolError(`Unknown status "${status}"`);
        patch.status = status as Status;
      }
      const priority = str(args, "priority");
      if (priority) {
        if (!(PRIORITIES as readonly string[]).includes(priority)) throw new ToolError(`Unknown priority "${priority}"`);
        patch.priority = priority as Priority;
      }
      if ("assignee" in args) {
        const a = args.assignee;
        if (a === null || a === "") patch.assignee = null;
        else if (typeof a === "string" && getWorkspace().members.includes(a.trim())) patch.assignee = a.trim();
        else throw new ToolError(`"${String(a)}" is not a workspace member. Members: ${getWorkspace().members.join(", ")}`);
      }
      if (!Object.keys(patch).length) throw new ToolError("Nothing to change: pass status, priority or assignee.");
      const next = updateIssue(i.id, patch, ctx.actor)!;
      if (patch.status && OPEN_STATUSES.includes(patch.status)) resetPageQa(next.projectId, next.pageUrl);
      return summary(next, ctx);
    },
  },
];

export function listTools() {
  return TOOLS.map(({ name, title, description, inputSchema, annotations }) => ({ name, title, description, inputSchema, annotations }));
}

/** Runs a tool. Errors become `isError` results so the model can read them and recover. */
export function callTool(name: string, args: Record<string, unknown>, ctx: McpContext) {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) return null;
  try {
    const out = tool.run(args ?? {}, ctx);
    return { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] };
  } catch (e) {
    const msg = e instanceof ToolError ? e.message : `Internal error: ${(e as Error).message}`;
    return { content: [{ type: "text", text: msg }], isError: true };
  }
}

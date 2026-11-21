import { PRIORITY_LABEL, STATUS_LABEL, type Issue } from "@/lib/types";

/** Spreadsheet columns for issues: the issue list's Export, the canvas's Send, and Drive's auto-sync. */
export const ISSUE_HEADER = ["#", "Title", "Status", "Priority", "Assignee", "Reporter", "Page", "Device", "Created", "Comment", "Link"];

/** One row per issue; `origin` makes the "Link" column point back into QASync. */
export function issueRows(issues: Issue[], origin: string): (string | number)[][] {
  return issues.map((i) => [
    i.number,
    i.title,
    STATUS_LABEL[i.status],
    PRIORITY_LABEL[i.priority],
    i.assignee ?? "",
    i.reporterName,
    i.pageUrl,
    i.device,
    i.createdAt.slice(0, 16).replace("T", " "),
    i.body,
    `${origin}/app/projects/${i.projectId}/review?issue=${i.id}`,
  ]);
}

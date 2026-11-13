import Link from "next/link";
import { BadgeCheck, CircleAlert, Clock, Inbox as InboxIcon, Zap } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { ProjectCard } from "@/components/app/project-card";
import { UrlStart } from "@/components/marketing/interactive";
import { Avatar, PriorityIcon, StatusBadge } from "@/components/ui";
import { getWorkspace, listIssues, listProjects, recentActivity, workspaceStats } from "@/server/repo";
import { STATUS_LABEL, type Issue, type Status } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

const issueHref = (i: Issue) => `/app/projects/${i.projectId}/review?issue=${i.id}`;

export default function InboxPage() {
  const ws = getWorkspace();
  const stats = workspaceStats();
  const toVerify = listIssues({ status: "fixed" });
  const mine = listIssues({ assignee: ws.userName, status: "active" }).filter((i) => i.status !== "fixed");
  const urgent = listIssues({ status: "active" }).filter((i) => i.priority === "urgent" && i.status !== "fixed");
  const activity = recentActivity(14);
  const projects = listProjects();

  const tiles = [
    { label: "Open", value: stats.open, icon: <InboxIcon size={15} />, tone: "text-ink" },
    { label: "Urgent", value: stats.urgent, icon: <CircleAlert size={15} />, tone: "text-accent-ink" },
    { label: "Awaiting verification", value: stats.awaitingVerify, icon: <Clock size={15} />, tone: "text-blue" },
    { label: "Verified", value: stats.verified, icon: <BadgeCheck size={15} />, tone: "text-[var(--st-verified)]" },
    { label: "Avg. time to fix", value: stats.avgResolveHours != null ? `${stats.avgResolveHours}h` : "—", icon: <Zap size={15} />, tone: "text-ink" },
  ];

  return (
    <>
      <PageHeader
        title={ws.userName === "You" ? "Inbox" : `Good to see you, ${ws.userName.split(" ")[0]}.`}
        sub={
          stats.projects === 0
            ? "Start by reviewing your first site."
            : `${stats.open} open issue${stats.open === 1 ? "" : "s"} across ${stats.projects} project${stats.projects === 1 ? "" : "s"}`
        }
      />
      <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-5">
          <div className="mb-3 text-[14px] font-medium">Review a new site</div>
          <UrlStart size="md" className="max-w-2xl" />
        </div>

        {activity.length === 0 ? (
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ["1", "Paste a URL", "Add any live or staging site above. No install needed."],
              ["2", "Press C and click", "Pin a comment on the exact element. Specs are captured for you."],
              ["3", "Share one link", "Teammates and clients reply without an account."],
            ].map(([n, t, b]) => (
              <div key={n} className="rounded-2xl border border-line bg-surface p-5 shadow-1">
                <span className="font-mono text-sm text-accent-ink">0{n}</span>
                <div className="mt-2 font-medium">{t}</div>
                <p className="mt-1 text-[13.5px] text-ink-3">{b}</p>
              </div>
            ))}
          </div>
        ) : (
        <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {tiles.map((t) => (
            <div key={t.label} className="lift rounded-2xl border border-line bg-surface p-4 shadow-1">
              <div className={`flex items-center gap-1.5 text-[12.5px] text-ink-3`}>
                <span className={t.tone}>{t.icon}</span>
                {t.label}
              </div>
              <div className={`mt-2 font-mono text-[28px] font-semibold tracking-tight ${t.tone}`}>{t.value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <IssueBlock
              title="Needs verification"
              hint="Marked fixed. Confirm the fix landed, or reopen it."
              issues={toVerify}
              empty="Nothing waiting for verification."
              accent="var(--st-fixed)"
            />
            {urgent.length > 0 && <IssueBlock title="Urgent" issues={urgent} empty="" accent="var(--brand)" />}
            <IssueBlock title="Assigned to you" issues={mine} empty="You're all caught up." accent="var(--ink-3)" />
          </div>

          <div className="rounded-2xl border border-line bg-surface shadow-1">
            <div className="border-b border-line px-5 py-3.5 font-medium">Activity</div>
            <ul className="divide-y divide-line">
              {activity.map((a) => (
                <li key={a.id} className="flex gap-3 px-5 py-3">
                  <Avatar name={a.actor} size={24} />
                  <div className="min-w-0 flex-1 text-[13px]">
                    <span className="font-medium">{a.actor}</span>{" "}
                    <span className="text-ink-2">
                      {a.type === "created" && "reported"}
                      {a.type === "comment" && "commented on"}
                      {a.type === "status" && <>moved to <b className="font-medium">{STATUS_LABEL[a.toVal as Status] ?? a.toVal}</b></>}
                      {a.type === "priority" && <>set priority {a.toVal} on</>}
                      {a.type === "assignee" && <>assigned {a.toVal ?? "nobody"} to</>}
                    </span>{" "}
                    <Link href={`/app/projects/${a.projectId}/review?issue=${a.issueId}`} className="text-ink hover:underline">
                      #{a.issueNumber} {a.issueTitle}
                    </Link>
                    <div className="mt-0.5 text-[11.5px] text-ink-3">
                      {a.projectName} · {timeAgo(a.createdAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        </>
        )}

        {projects.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Projects</h2>
            <Link href="/app/projects" className="text-sm text-accent-ink">
              All projects →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={{ id: p.id, name: p.name, baseUrl: p.baseUrl, color: p.color, createdAt: p.createdAt, issueCount: p.issueCount, openCount: p.openCount }} />
            ))}
          </div>
        </div>
        )}
      </div>
    </>
  );
}

function IssueBlock({ title, hint, issues, empty, accent }: { title: string; hint?: string; issues: Issue[]; empty: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface shadow-1">
      <div className="flex items-center gap-2 border-b border-line px-5 py-3.5">
        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
        <span className="font-medium">{title}</span>
        <span className="font-mono text-[12px] text-ink-3">{issues.length}</span>
        {hint && <span className="ml-auto hidden text-[12px] text-ink-3 sm:inline">{hint}</span>}
      </div>
      {issues.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-3">{empty}</p>
      ) : (
        <ul className="divide-y divide-line">
          {issues.slice(0, 6).map((i) => (
            <li key={i.id}>
              <Link href={issueHref(i)} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2/60">
                <PriorityIcon priority={i.priority} />
                <span className="font-mono text-[12px] text-ink-3">#{i.number}</span>
                <span className="min-w-0 flex-1 truncate text-[14px]">{i.title}</span>
                <span className="hidden truncate text-[12px] text-ink-3 sm:inline">{i.projectName}</span>
                <StatusBadge status={i.status} />
                {i.assignee && <Avatar name={i.assignee} size={20} />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { MobileTopbar, Rail } from "@/components/app/rail";
import { getWorkspacePlan, listProjects, workspaceUsage } from "@/server/repo";
import { UsageBanner, type UsageNotice } from "@/components/app/usage-banner";
import { PLAN_LIMITS, usageState } from "@/lib/plans";
import { getCurrentWorkspace, requireCtx } from "@/server/session";
import { isAdmin } from "@/server/admin";

export const dynamic = "force-dynamic";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCtx();
  const projects = (await listProjects(ctx.workspaceId)).map((p) => ({ id: p.id, name: p.name, color: p.color, openCount: p.openCount }));
  const notice = await commentNotice(ctx.workspaceId);
  return (
    <div className="flex min-h-dvh">
      <Rail projects={projects} workspace={await getCurrentWorkspace()} workspaces={ctx.workspaces} isAdmin={await isAdmin(ctx.email)} />
      <div className="min-w-0 flex-1">
        <MobileTopbar />
        {notice && <UsageBanner notice={notice} />}
        {children}
      </div>
    </div>
  );
}

/** Warns a Free workspace before its comments run out, and says so once they have. */
async function commentNotice(workspaceId: string): Promise<UsageNotice | null> {
  const { plan } = await getWorkspacePlan(workspaceId);
  if (plan !== "free") return null;
  const used = (await workspaceUsage(workspaceId)).comments;
  const limit = PLAN_LIMITS.free.comments;
  const state = usageState(used, limit);
  if (state === "ok") return null;
  return {
    key: workspaceId,
    state,
    text:
      state === "full"
        ? `You've used all ${limit} comments on the Free plan. New comments and replies are paused until you upgrade; everything so far is safe.`
        : `Heads up: ${used} of ${limit} free comments used. Upgrade to Pro before you run out.`,
  };
}

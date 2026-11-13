"use client";

import { useEffect, useMemo, useState } from "react";
import type { Issue, Project } from "@/lib/types";
import type { PlanAccess } from "@/lib/plans";
import { Button, LogoMark } from "@/components/ui";
import { ReviewCanvas } from "./review-canvas";

const KEY = "qasync-guest-name";

export function GuestReview({
  token,
  project,
  initialIssues,
  initialPage,
  initialIssueId,
  access,
}: {
  token: string;
  project: Project;
  initialIssues: Issue[];
  initialPage?: string;
  initialIssueId?: string;
  access: PlanAccess;
}) {
  const [name, setName] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setName(localStorage.getItem(KEY));
    } catch {}
    setReady(true);
  }, []);

  const guest = useMemo(() => (name ? { shareToken: token, guestName: name } : undefined), [name, token]);

  if (!ready) return null;

  if (!guest) {
    return (
      <div className="bg-grid flex min-h-dvh items-center justify-center p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = draft.trim();
            if (!n) return;
            try {
              localStorage.setItem(KEY, n);
            } catch {}
            setName(n);
          }}
          className="w-full max-w-sm rounded-2xl border border-line bg-surface p-7 shadow-2"
        >
          <LogoMark className="h-10 w-10" />
          <h1 className="mt-4 text-xl font-semibold tracking-tight">You&apos;re invited to review</h1>
          <p className="mt-1 text-[15px] text-ink-2">{project.name}</p>
          <p className="mt-4 text-[13px] text-ink-3">
            {access.pro
              ? "No account needed. Tell the team who’s commenting, then click anything on the page to leave feedback."
              : "No account needed. Tell the team who you are, then look around the page and read their comments."}
          </p>
          <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Your name" className="input mt-5" aria-label="Your name" />
          <Button className="mt-3 w-full" disabled={!draft.trim()}>
            Start reviewing
          </Button>
        </form>
      </div>
    );
  }

  return <ReviewCanvas project={project} initialIssues={initialIssues} initialPage={initialPage} initialIssueId={initialIssueId} guest={guest} members={[]} access={access} />;
}

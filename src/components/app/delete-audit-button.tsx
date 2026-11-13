"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useConfirm } from "@/components/confirm";
import { cn } from "@/lib/utils";

/** Deletes one audit report after a confirmation. Refreshes the page, or goes to `redirectTo`. */
export function DeleteAuditButton({ id, url, redirectTo, withLabel, className }: { id: string; url: string; redirectTo?: string; withLabel?: boolean; className?: string }) {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const [busy, setBusy] = useState(false);

  async function remove() {
    const yes = await confirmDialog({
      title: "Delete this audit report?",
      message: `The report for ${url} will be permanently deleted. Issues you created from it stay. This can't be undone.`,
      confirmLabel: "Delete report",
    });
    if (!yes) return;
    setBusy(true);
    try {
      await api.deleteAudit(id);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } catch (e) {
      alert((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      title="Delete report"
      aria-label="Delete report"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg text-ink-3 transition hover:bg-danger-soft hover:text-danger disabled:opacity-50",
        withLabel ? "h-10 border border-line bg-surface px-3.5 text-[14px] font-medium shadow-1" : "h-8 w-8",
        className,
      )}
    >
      {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
      {withLabel && "Delete"}
    </button>
  );
}

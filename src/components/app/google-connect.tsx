"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { connectGoogleDrive } from "@/app/actions";
import { Button } from "@/components/ui";
import { IntegrationIcon } from "@/components/integration-icon";

function Submit({ label, compact, variant }: { label: string; compact: boolean; variant: "primary" | "secondary" }) {
  const { pending } = useFormStatus();
  if (compact)
    return (
      <button type="submit" disabled={pending} className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-brand-ink hover:bg-surface-2 disabled:opacity-60">
        {pending && <Loader2 size={12} className="animate-spin" />} {label}
      </button>
    );
  return (
    <Button type="submit" size="sm" variant={variant} loading={pending}>
      {!pending && <IntegrationIcon name="Google Drive" size={14} />} {label}
    </Button>
  );
}

/**
 * "Connect Google Drive": signs in with Google again with the consent screen, which grants Drive
 * (only files QASync creates or that are picked) and comes back to this same page.
 */
export function ConnectDriveButton({ email, label = "Connect Google Drive", compact = false, variant = "primary" }: { email?: string; label?: string; compact?: boolean; variant?: "primary" | "secondary" }) {
  const [next, setNext] = useState("");
  useEffect(() => setNext(window.location.pathname + window.location.search), []);
  return (
    <form action={connectGoogleDrive} className="contents">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="email" value={email ?? ""} />
      <Submit label={label} compact={compact} variant={variant} />
    </form>
  );
}

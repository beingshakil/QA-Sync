"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderOpen } from "lucide-react";
import { Button, buttonClass } from "@/components/ui";
import { IntegrationIcon } from "@/components/integration-icon";
import { DRIVE_FOLDER_NAME, disconnectGoogleDrive, driveStatus, setGoogleConfig, type DriveStatus, type GoogleConfig } from "@/lib/google-drive";
import { ConnectDriveButton } from "@/components/app/google-connect";
import { DriveSetup, SetupDialog, useSetupInfo } from "@/components/app/integration-setup";

/** App layout: tells every screen whether Google Drive (and its file picker) is available. The same for everyone. */
export function GoogleConfigSync({ config }: { config: GoogleConfig }) {
  setGoogleConfig(config);
  return null;
}

/** Settings → Google Drive: connected with Google sign-in; exports and page sheets go to a QASync folder. */
export function GoogleDriveCard({ email }: { email: string }) {
  const [st, setSt] = useState<DriveStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [setup, setSetup] = useState(false);
  const info = useSetupInfo();

  const load = useCallback(() => {
    driveStatus()
      .then(setSt)
      .catch((e) => setErr((e as Error).message));
  }, []);
  useEffect(load, [load]);

  const otherAccount = !!st?.email && st.email.toLowerCase() !== email.toLowerCase();

  return (
    <section className="rounded-2xl border border-line bg-surface shadow-1">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3 px-6 py-5">
        <div className="flex min-w-0 flex-1 basis-72 gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-2">
            <IntegrationIcon name="Google Drive" size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Google Drive</h2>
            <p className="mt-0.5 text-[13px] text-ink-3">
              Issue exports, audit reports and page sheets go to a <span className="font-medium text-ink-2">{DRIVE_FOLDER_NAME}</span> folder in your Drive. QASync can
              open only that folder and the files it makes or you pick.
            </p>
            {st && !st.available && <p className="mt-2 text-[13px] text-ink-3">Needs Google sign-in, which isn&apos;t set up here yet.</p>}
            {st?.connected && (
              <p className="mt-2 text-[13px] text-ink-2">
                Connected as <span className="font-medium text-ink">{st.email || "your Google account"}</span>
                {otherAccount && <span className="text-ink-3"> · not the account you sign in to QASync with</span>}
              </p>
            )}
            {err && (
              <p role="alert" className="mt-2 text-[12.5px] text-danger">
                {err}
              </p>
            )}
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {st?.connected ? (
            <>
              {st.folderUrl && (
                <a href={st.folderUrl} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
                  <FolderOpen size={14} /> Open the {DRIVE_FOLDER_NAME} folder
                </a>
              )}
              <Button
                size="sm"
                variant="ghost"
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  setErr(null);
                  try {
                    await disconnectGoogleDrive();
                    load();
                  } catch (e) {
                    setErr((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Disconnect
              </Button>
            </>
          ) : st?.available ? (
            <ConnectDriveButton email={email} />
          ) : null}
          {st && (info?.canSetup || !st.available) && (
            <Button size="sm" variant={st.available ? "ghost" : "primary"} onClick={() => setSetup(true)}>
              {st.available ? "Google Cloud setup" : "Set up"}
            </Button>
          )}
        </div>
        {setup && (
          <SetupDialog title="Set up Google Drive" icon="Google Drive" onClose={() => (setSetup(false), load())}>
            <DriveSetup email={email} onDone={() => (setSetup(false), load())} />
          </SetupDialog>
        )}
      </div>
    </section>
  );
}

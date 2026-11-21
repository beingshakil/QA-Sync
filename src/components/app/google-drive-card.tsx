"use client";

import { useEffect, useState } from "react";
import { FolderOpen } from "lucide-react";
import { Button, buttonClass } from "@/components/ui";
import { IntegrationIcon } from "@/components/integration-icon";
import {
  DRIVE_FOLDER_NAME,
  connectGoogleDrive,
  disconnectGoogleDrive,
  googleExportReady,
  preloadGoogle,
  savedDriveLink,
  setGoogleAccountHint,
  type DriveLink,
} from "@/lib/google-drive";

/** App layout: tells the Google code which account the person signed in with, so Google offers it first. */
export function GoogleAccountHint({ email }: { email: string }) {
  if (typeof window !== "undefined") setGoogleAccountHint(email); // browser only: a plain module value, set before any click can ask for a token
  return null;
}

/** Settings → Google Drive: connect once, and a QASync folder is created in that Drive for every export. */
export function GoogleDriveCard({ email }: { email: string }) {
  const [link, setLink] = useState<DriveLink | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ready = googleExportReady();

  useEffect(() => {
    setGoogleAccountHint(email);
    preloadGoogle();
    const read = () => setLink(savedDriveLink());
    read();
    window.addEventListener("qasync-drive", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("qasync-drive", read);
      window.removeEventListener("storage", read);
    };
  }, [email]);

  const otherAccount = !!link?.email && link.email.toLowerCase() !== email.toLowerCase();

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
              Issue exports and audit reports are saved to a <span className="font-medium text-ink-2">{DRIVE_FOLDER_NAME}</span> folder in your Drive, created
              automatically. QASync can open only that folder and the files it makes.
            </p>
            {!ready && <p className="mt-2 text-[13px] text-ink-3">Google Drive isn&apos;t set up on this server yet.</p>}
            {ready && link && (
              <p className="mt-2 text-[13px] text-ink-2">
                Connected as <span className="font-medium text-ink">{link.email || "your Google account"}</span>
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
        {ready && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {link ? (
              <>
                <a href={link.folderUrl} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
                  <FolderOpen size={14} /> Open the {DRIVE_FOLDER_NAME} folder
                </a>
                <Button size="sm" variant="ghost" onClick={() => (disconnectGoogleDrive(), setErr(null))}>
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  setErr(null);
                  try {
                    setLink(await connectGoogleDrive());
                  } catch (e) {
                    setErr((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Connect Google Drive
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

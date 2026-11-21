"use server";

import { signIn, signOut } from "@/auth";

/** Only same-site paths: never redirect somewhere else after signing in. */
function safePath(p: FormDataEntryValue | null | undefined) {
  const s = typeof p === "string" ? p : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/app/projects";
}

export async function signInWithGoogle(form: FormData) {
  await signIn("google", { redirectTo: safePath(form.get("next")) });
}

/**
 * "Connect Google Drive": Google sign-in again, showing the consent screen so Google hands out
 * Drive access (and a refresh token) even to someone who signed in before Drive was asked for.
 */
export async function connectGoogleDrive(form: FormData) {
  const hint = form.get("email");
  await signIn("google", { redirectTo: safePath(form.get("next")) }, { prompt: "consent", ...(typeof hint === "string" && hint ? { login_hint: hint } : {}) });
}

/** Local automated testing only (QASYNC_DEV_LOGIN=1, never on Vercel). */
export async function signInDev(form: FormData) {
  await signIn("dev", { email: form.get("email"), name: form.get("name"), redirectTo: safePath(form.get("next")) });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

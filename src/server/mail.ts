import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { absoluteUrl } from "@/lib/site";

/**
 * Outgoing email over SMTP (works with a Gmail account + App Password, no domain needed).
 *   SMTP_USER, SMTP_PASS            required to send
 *   SMTP_HOST, SMTP_PORT            default smtp.gmail.com : 465
 *   MAIL_FROM                       default "QASync <SMTP_USER>"
 * Without SMTP settings, local runs write the message to .data/outbox (for checking) and
 * nothing is sent.
 */
export function mailConfigured() {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendMail(msg: { to: string; subject: string; html: string; text: string }): Promise<{ sent: boolean; reason?: string }> {
  const nodemailer = (await import("nodemailer")).default;
  if (!mailConfigured()) {
    if (process.env.VERCEL) return { sent: false, reason: "Email isn't set up (SMTP_USER / SMTP_PASS)" };
    const t = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "unix" });
    const info = await t.sendMail({ from: "QASync <no-reply@localhost>", ...msg });
    const dir = path.join(process.cwd(), ".data", "outbox");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${Date.now()}-${msg.to.replace(/[^\w.@-]/g, "_")}.eml`), info.message as Buffer);
    await fs.writeFile(path.join(dir, "latest.html"), msg.html);
    return { sent: false, reason: "Email isn't set up; saved to .data/outbox instead" };
  }
  const port = Number(process.env.SMTP_PORT || 465);
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  try {
    await t.sendMail({ from: process.env.MAIL_FROM || `QASync <${process.env.SMTP_USER}>`, ...msg });
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: `Email failed: ${(e as Error).message}` };
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

interface EmailParts {
  title: string;
  pill: { text: string; color: string; bg: string };
  intro: string;
  list?: { mark: string; color: string; items: string[] };
  /** A line just before the list. */
  outro?: string;
  button: { label: string; url: string };
}

/** One card-style layout for every QASync email: logo, card, pill, heading, copy, button, footer. */
function layout({ title, pill, intro, list, outro, button }: EmailParts) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f4f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#10162b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f9;padding:32px 12px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
    <tr><td style="padding:0 4px 18px">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:28px;height:28px;border-radius:7px;background:linear-gradient(135deg,#2b5ebe,#7b2fb0);background-color:#4a46b8;color:#fff;font-weight:700;font-size:15px;text-align:center;line-height:28px">✓</td>
        <td style="padding-left:9px;font-size:17px;font-weight:700;letter-spacing:-0.2px">QA<span style="color:#5b3fc0">Sync</span></td>
      </tr></table>
    </td></tr>
    <tr><td style="background:#ffffff;border:1px solid #e3e6ef;border-radius:14px;padding:32px 30px">
      <div style="display:inline-block;font-size:12px;font-weight:600;color:${pill.color};background:${pill.bg};border-radius:999px;padding:4px 10px">${esc(pill.text)}</div>
      <h1 style="margin:16px 0 0;font-size:22px;line-height:1.3;font-weight:700;letter-spacing:-0.3px">${esc(title)}</h1>
      <p style="margin:14px 0 0;font-size:15px;line-height:1.65;color:#3c445c">${intro}</p>
      ${outro ? `<p style="margin:18px 0 0;font-size:15px;line-height:1.65;color:#3c445c">${outro}</p>` : ""}
      ${
        list
          ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:${outro ? 10 : 22}px 0 0">
        ${list.items.map((p) => `<tr><td style="padding:5px 0;font-size:14.5px;color:#10162b"><span style="color:${list.color};font-weight:700;padding-right:10px">${list.mark}</span>${esc(p)}</td></tr>`).join("")}
      </table>`
          : ""
      }
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 0"><tr>
        <td style="border-radius:10px;background:#10162b"><a href="${button.url}" style="display:inline-block;padding:12px 22px;font-size:14.5px;font-weight:600;color:#ffffff;text-decoration:none">${esc(button.label)}</a></td>
      </tr></table>
      <p style="margin:26px 0 0;font-size:13.5px;line-height:1.6;color:#6b7390">Questions? Just reply to this email.</p>
    </td></tr>
    <tr><td style="padding:18px 6px 0;font-size:12px;line-height:1.6;color:#8a91a8;text-align:center">You're receiving this because you have a QASync account.<br>QASync · Visual feedback that gets fixed</td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}

const PRO_PERKS = [
  "Unlimited projects, comments and page audits",
  "Unlimited teammates and client guests",
  "Inspect, freeze hover, custom device sizes, split view and design overlay",
  "Page-wise QA tracking and AI agents",
];

/** "You're on QASync Pro": sent when an admin upgrades someone. */
export function proUpgradeEmail({ name, workspaces, until }: { name: string; workspaces: string[]; until: string | null }) {
  const first = name.split(" ")[0] || "there";
  const ws = workspaces.length === 1 ? `“${workspaces[0]}”` : "your workspaces";
  const period = until ? `until ${fmtDate(until)}` : "with no end date";
  const url = absoluteUrl("/app/projects");

  const text = `Hi ${first},

Good news: ${ws.replace(/[“”]/g, '"')} is now on QASync Pro, ${period}.

What's included:
${PRO_PERKS.map((p) => `- ${p}`).join("\n")}

Nothing to set up: it's already active. Open QASync: ${url}

If you have any questions, just reply to this email.

The QASync team`;

  const html = layout({
    title: "You're on QASync Pro",
    pill: { text: "Pro plan", color: "#4b3bb8", bg: "#eeebfb" },
    intro: `Hi ${esc(first)}, good news: ${esc(ws)} is now on QASync Pro, ${esc(period)}. It's already active, so there's nothing to set up.`,
    list: { mark: "✓", color: "#16a34a", items: PRO_PERKS },
    button: { label: "Open QASync", url },
  });

  return { subject: "You're on QASync Pro", text, html };
}

/** Sent to a Free workspace's owner when comments are close to the limit, and again when they run out. */
export function usageEmail({ name, workspace, used, limit, full }: { name: string; workspace: string; used: number; limit: number; full: boolean }) {
  const first = name.split(" ")[0] || "there";
  const left = Math.max(0, limit - used);
  const url = absoluteUrl("/pricing");
  const subject = full ? "You've used all your free QASync comments" : `${left} free comment${left === 1 ? "" : "s"} left on QASync`;
  const title = full ? "You've reached the Free comment limit" : "You're close to the Free comment limit";
  const intro = full
    ? `Hi ${esc(first)}, “${esc(workspace)}” has used all ${limit} comments included in the Free plan, so new comments and replies are paused. Everything you've written so far is safe.`
    : `Hi ${esc(first)}, a quick heads-up: “${esc(workspace)}” has used ${used} of the ${limit} comments included in the Free plan. Once they're gone, new comments and replies pause until you upgrade.`;
  const outro = "Pro is $5 a month and removes every limit:";

  const text = `Hi ${first},

${
  full
    ? `"${workspace}" has used all ${limit} comments included in the Free plan, so new comments and replies are paused. Everything you've written so far is safe.`
    : `A quick heads-up: "${workspace}" has used ${used} of the ${limit} comments included in the Free plan. Once they're gone, new comments and replies pause until you upgrade.`
}

${outro}
${PRO_PERKS.map((p) => `- ${p}`).join("\n")}

Upgrade to Pro: ${url}

The QASync team`;

  const html = layout({
    title,
    pill: full ? { text: "Limit reached", color: "#b42318", bg: "#fdecea" } : { text: `${used} of ${limit} used`, color: "#9a5b00", bg: "#fff3dc" },
    intro,
    outro,
    list: { mark: "✓", color: "#16a34a", items: PRO_PERKS },
    button: { label: "Upgrade to Pro", url },
  });
  return { subject, text, html };
}

// QASync extension service worker: account, API calls, screenshots, page activation and badge.
// Content scripts and the side panel never hold the token; every API call goes through here.
import { DEFAULT_SERVER } from "./config.js";

/* ───────── settings ───────── */

async function settings() {
  const s = await chrome.storage.local.get(["server", "token", "user", "workspace", "autoSites"]);
  return { server: (s.server || DEFAULT_SERVER).replace(/\/+$/, ""), token: s.token || null, user: s.user || null, workspace: s.workspace || null, autoSites: s.autoSites || [] };
}

const originPattern = (url) => `${new URL(url).origin}/*`;

/* ───────── API ───────── */

async function api(method, path, body) {
  const { server, token } = await settings();
  if (!token) return { ok: false, status: 401, data: { error: "Connect your QASync account first" } };
  try {
    const res = await fetch(server + path, {
      method,
      headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) await chrome.storage.local.remove(["token", "user", "workspace"]); // revoked
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { error: `Can't reach QASync at ${server}: ${e.message}` } };
  }
}

async function uploadScreenshot(dataUrl, name) {
  const { server, token } = await settings();
  const blob = await (await fetch(dataUrl)).blob();
  const fd = new FormData();
  fd.append("file", new File([blob], name, { type: blob.type || "image/jpeg" }));
  const res = await fetch(`${server}/api/uploads`, { method: "POST", headers: { authorization: `Bearer ${token}` }, body: fd });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/* ───────── activation ───────── */

async function activate(tabId) {
  // Order matters: content.js prepares window.__QASYNC__ and the host listener before the reviewer runs.
  await chrome.scripting.executeScript({ target: { tabId }, files: ["page-errors.js"], world: "MAIN" }).catch(() => {});
  await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js", "reviewer.js"] });
  await chrome.tabs.sendMessage(tabId, { type: "qasync:show" }).catch(() => {});
}

chrome.action.onClicked.addListener(async (tab) => {
  // Opening the side panel must happen first, while the click still counts as a user gesture.
  chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
  const { token } = await settings();
  if (!token || !/^https?:/.test(tab.url || "")) return; // the side panel explains what to do
  try {
    await activate(tab.id);
  } catch (e) {
    console.warn("QASync: couldn't open on this page", e);
  }
});

// Sites the user switched on ("Always on for this site"): open automatically and keep the badge current.
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.status !== "complete" || !tab.url || !/^https?:/.test(tab.url)) return;
  const { autoSites, token, server } = await settings();
  const { connectTab } = await chrome.storage.session.get("connectTab");
  if (connectTab === tabId && tab.url.startsWith(`${server}/app/extension`)) grabToken(tabId);
  if (!token) return;
  const origin = new URL(tab.url).origin;
  if (!autoSites.includes(origin)) return;
  if (!(await chrome.permissions.contains({ origins: [originPattern(tab.url)] }))) return;
  activate(tabId).catch(() => {});
});

/* ───────── connect ───────── */

// The tab opened for connecting lives in session storage: the worker may sleep while you sign in.
async function startConnect() {
  const { server } = await settings();
  const tab = await chrome.tabs.create({ url: `${server}/app/extension?connect=1` });
  await chrome.storage.session.set({ connectTab: tab.id });
}

// Runs inside the QASync page: waits for the token the page leaves after "Connect this browser".
function waitForToken() {
  return new Promise((resolve) => {
    const started = Date.now();
    const look = () => {
      const el = document.getElementById("qasync-extension-token");
      if (el && el.dataset.token) return resolve(el.dataset.token);
      if (Date.now() - started > 10 * 60 * 1000) return resolve(null);
      setTimeout(look, 400);
    };
    look();
  });
}

async function grabToken(tabId) {
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId }, func: waitForToken });
    const token = res && res.result;
    if (!token) return;
    await chrome.storage.local.set({ token });
    const me = await api("GET", "/api/extension/me");
    if (me.ok) await chrome.storage.local.set({ user: me.data.userName, workspace: me.data.workspaceName });
    await chrome.storage.session.remove("connectTab");
    chrome.runtime.sendMessage({ type: "qasync:connected" }).catch(() => {});
    setTimeout(() => chrome.tabs.remove(tabId).catch(() => {}), 1500);
  } catch (e) {
    console.warn("QASync: couldn't read the connection", e);
  }
}

/* ───────── messages from the content script and side panel ───────── */

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  // Always answer, even on errors: a sender waiting on a reply that never comes would hang its UI.
  handle(msg, sender, reply).catch((e) => reply({ ok: false, error: e?.message || String(e), data: { error: e?.message || String(e) } }));
  return true; // async reply
});

async function handle(msg, sender, reply) {
  {
    switch (msg.type) {
      case "state":
        return reply(await settings());
      case "set-server":
        await chrome.storage.local.set({ server: msg.server.replace(/\/+$/, "") });
        await chrome.storage.local.remove(["token", "user", "workspace"]);
        return reply({ ok: true });
      case "connect":
        await startConnect();
        return reply({ ok: true });
      case "disconnect":
        await chrome.storage.local.remove(["token", "user", "workspace"]);
        return reply({ ok: true });
      case "api":
        return reply(await api(msg.method, msg.path, msg.body));
      case "capture": {
        // Chrome allows this after a click on the QASync button on the tab (activeTab). Pages opened
        // automatically ("Always open on this site") can't be captured until that click.
        try {
          const dataUrl = await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: "jpeg", quality: 85 });
          return reply({ ok: true, dataUrl });
        } catch (e) {
          return reply({ ok: false, error: "Click the QASync button on this tab to allow screenshots." });
        }
      }
      case "upload":
        return reply(await uploadScreenshot(msg.dataUrl, msg.name));
      case "badge": {
        const tabId = msg.tabId ?? sender.tab?.id;
        if (tabId != null) {
          await chrome.action.setBadgeBackgroundColor({ tabId, color: "#2f66e0" });
          await chrome.action.setBadgeText({ tabId, text: msg.count ? String(msg.count) : "" });
        }
        return reply({ ok: true });
      }
      case "activate":
        try {
          await activate(msg.tabId);
          return reply({ ok: true });
        } catch (e) {
          return reply({ ok: false, error: e.message });
        }
      case "to-tab": // side panel → page
        return reply(await chrome.tabs.sendMessage(msg.tabId, msg.payload).catch(() => null));
      default:
        return reply({ ok: false, error: "Unknown message" });
    }
  }
}

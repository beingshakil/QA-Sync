// QASync side panel: account, the current page's project and issues, and per-site auto-open.
const app = document.getElementById("app");
const who = document.getElementById("who");
const send = (msg) => new Promise((resolve) => chrome.runtime.sendMessage(msg, (r) => resolve(r || null)));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const PRIORITY_COLOR = { urgent: "#b91c1c", high: "#ef4444", medium: "#f97316", low: "#eab308" };
const STATUS_LABEL = { open: "Open", in_progress: "In progress", in_review: "In review", fixed: "Fixed", verified: "Verified", wont_fix: "Won't fix" };
const colorOf = (i) => (i.status === "fixed" || i.status === "verified" ? "#16a34a" : i.status === "wont_fix" ? "#9ca3af" : PRIORITY_COLOR[i.priority] || "#f97316");

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

async function render() {
  const s = await send({ type: "state" });
  if (!s) return;
  who.innerHTML = s.token ? `${esc(s.user || "Connected")}<br>${esc(s.workspace || "")}` : "";
  if (!s.token) return renderConnect(s);
  const tab = await activeTab();
  const url = tab?.url && /^https?:/.test(tab.url) ? tab.url : null;
  const info = tab ? await send({ type: "to-tab", tabId: tab.id, payload: { type: "qasync:info" } }) : null;

  let html = "";
  if (!url) {
    html += `<div class="card"><h2>This page</h2><p class="muted">Click the QASync button in the toolbar on a website to start reviewing it.</p></div>`;
  } else if (!info) {
    html += `<div class="card stack"><h2>This page</h2><p class="muted">${esc(new URL(url).host)}</p>
      <button class="btn primary" id="start">Review this page</button>
      <p class="muted">If nothing happens, click the QASync button in the toolbar (Chrome only lets extensions open on a page you've clicked it on).</p>
      <p class="err" id="err" hidden></p></div>`;
  } else {
    const issues = info.issues || [];
    const open = issues.filter((i) => ["open", "in_progress", "in_review"].includes(i.status)).length;
    html += `<div class="card stack"><h2>This page</h2>
      ${info.project ? `<div><b>${esc(info.project.name)}</b> <span class="muted">· ${open} open · ${issues.length} total</span></div>` : `<p class="muted">${esc(new URL(url).host)} isn't a QASync project yet. Use “Add this site” on the page toolbar.</p>`}
      <div class="row"><button class="btn small" id="refresh">Refresh</button>${info.project ? `<a class="btn small" href="${esc(s.server)}/app/projects/${encodeURIComponent(info.project.id)}/review" target="_blank" rel="noopener">Open canvas ↗</a>` : ""}</div></div>`;
    if (info.project) {
      html += `<div class="card"><h2>Issues on this page</h2>${
        issues.length
          ? `<ul>${issues
              .map(
                (i) => `<li class="issue" tabindex="0" data-id="${esc(i.id)}"><span class="num" style="background:${colorOf(i)}">${esc(i.number)}</span><div><div class="t">${esc(i.title)}</div><div class="s">${esc(STATUS_LABEL[i.status] || i.status)} · ${esc(i.priority)}${i.reporterName ? ` · ${esc(i.reporterName)}` : ""}</div></div></li>`,
              )
              .join("")}</ul>`
          : `<p class="empty">No comments here yet. Switch to Comment on the page toolbar and click anything.</p>`
      }</div>`;
    }
  }
  if (url) {
    const origin = new URL(url).origin;
    const auto = (s.autoSites || []).includes(origin);
    html += `<div class="card"><label class="switch"><span>Always open on ${esc(new URL(url).host)}<br><span class="muted">Opens QASync and shows the issue count on every visit.</span></span><input type="checkbox" id="auto" ${auto ? "checked" : ""}></label></div>`;
  }
  html += `<div class="card row"><button class="btn small" id="disconnect">Disconnect</button><span class="muted">${esc(s.server)}</span></div>`;
  app.innerHTML = html;

  app.querySelector("#start")?.addEventListener("click", async (e) => {
    e.target.disabled = true;
    const r = await send({ type: "activate", tabId: tab.id });
    if (!r?.ok) {
      const err = app.querySelector("#err");
      err.textContent = "Chrome needs a click on the QASync toolbar button for this page first.";
      err.hidden = false;
      e.target.disabled = false;
    } else setTimeout(render, 800);
  });
  app.querySelector("#refresh")?.addEventListener("click", async () => {
    await send({ type: "to-tab", tabId: tab.id, payload: { type: "qasync:refresh" } });
    render();
  });
  app.querySelectorAll("li.issue").forEach((li) => {
    const go = () => send({ type: "to-tab", tabId: tab.id, payload: { type: "qasync:focus", id: li.dataset.id } });
    li.addEventListener("click", go);
    li.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), go()));
  });
  app.querySelector("#auto")?.addEventListener("change", async (e) => {
    const origin = new URL(url).origin;
    const sites = new Set(s.autoSites || []);
    if (e.target.checked) {
      // Chrome asks the user, for this one site only.
      const granted = await chrome.permissions.request({ origins: [`${origin}/*`] });
      if (!granted) return (e.target.checked = false);
      sites.add(origin);
    } else sites.delete(origin);
    await chrome.storage.local.set({ autoSites: [...sites] });
  });
  app.querySelector("#disconnect")?.addEventListener("click", async () => {
    await send({ type: "disconnect" });
    render();
  });
}

function renderConnect(s) {
  app.innerHTML = `<div class="card stack">
    <h2>Connect your QASync account</h2>
    <p class="muted">The extension comments as you, in the workspace you pick when connecting.</p>
    <label class="muted" for="server">QASync address</label>
    <input type="url" id="server" value="${esc(s.server)}" spellcheck="false">
    <button class="btn primary" id="connect">Connect account</button>
    <p class="err" id="err" hidden></p>
    <p class="muted">A QASync tab opens. Sign in if asked, click “Connect this browser”, and come back here.</p>
  </div>`;
  app.querySelector("#connect").addEventListener("click", async (e) => {
    const err = app.querySelector("#err");
    let server;
    try {
      server = new URL(app.querySelector("#server").value.trim()).origin;
    } catch {
      err.textContent = "Enter the address of your QASync, e.g. https://qasync.example.com";
      err.hidden = false;
      return;
    }
    // The extension may only talk to the QASync address you chose: ask Chrome for that one origin.
    const granted = await chrome.permissions.request({ origins: [`${server}/*`] }).catch(() => false);
    if (!granted && !(await chrome.permissions.contains({ origins: [`${server}/*`] }))) {
      err.textContent = "The extension needs permission to reach your QASync address.";
      err.hidden = false;
      return;
    }
    if (server !== s.server) await send({ type: "set-server", server });
    e.target.disabled = true;
    await send({ type: "connect" });
    e.target.disabled = false;
  });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "qasync:connected") render();
});
chrome.tabs.onActivated.addListener(() => render());
chrome.tabs.onUpdated.addListener((_id, info) => info.status === "complete" && render());
chrome.storage.onChanged.addListener((c) => (c.token || c.server || c.user) && render());
render();

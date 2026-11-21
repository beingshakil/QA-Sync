// QASync extension: the "host" on the real page. It plays the review canvas's role for reviewer.js
// (pins, modes, picks) and adds the toolbar, comment box and issue card in its own shadow DOM.
// All API calls go through the service worker (background.js), which holds the token.
(() => {
  if (window.__qasyncExt) return;
  window.__qasyncExt = true;
  // Read by reviewer.js for the "ready" handshake and the environment it attaches to picks.
  window.__QASYNC__ = { url: location.href, status: 200, extension: true };

  const send = (msg) => new Promise((resolve) => chrome.runtime.sendMessage(msg, (r) => resolve(r || { ok: false, data: { error: chrome.runtime.lastError?.message || "No response" } })));
  const toReviewer = (msg) => window.postMessage({ source: "qasync-host", ...msg }, "*");
  const pageUrl = () => {
    const u = new URL(location.href);
    u.hash = "";
    return u.toString();
  };
  const hostKey = (h) => String(h).toLowerCase().replace(/^www\./, "");
  const deviceFor = (w) => (w < 600 ? "mobile" : w < 1024 ? "tablet" : "desktop");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const PRIORITY_COLOR = { urgent: "#b91c1c", high: "#ef4444", medium: "#f97316", low: "#eab308" };
  const STATUS_LABEL = { open: "Open", in_progress: "In progress", in_review: "In review", fixed: "Fixed", verified: "Verified", wont_fix: "Won't fix" };
  const OPEN = ["open", "in_progress", "in_review"];
  const colorOf = (i) => (i.status === "fixed" || i.status === "verified" ? "#16a34a" : i.status === "wont_fix" ? "#9ca3af" : PRIORITY_COLOR[i.priority] || "#f97316");

  const state = { server: "", project: null, issues: [], mode: "browse", frozen: false, draft: null, card: null, pageErrors: [], visible: false, url: pageUrl() };

  /* ───────── UI ───────── */

  const host = document.createElement("qasync-ext");
  host.setAttribute("data-qasync-ui", "");
  host.style.cssText = "all:initial;position:fixed;inset:auto;z-index:2147483647;";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>
    :host{all:initial}
    *{box-sizing:border-box;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
    .bar{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);display:flex;align-items:center;gap:6px;padding:6px;border-radius:14px;background:#0b0e15;border:1px solid #283044;box-shadow:0 18px 50px -12px rgba(0,0,0,.6);color:#eef1f6;font-size:13px;z-index:2147483647}
    .logo{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,#2f66e0,#16a36a);display:grid;place-items:center;flex:none}
    .proj{display:flex;flex-direction:column;padding:0 6px;max-width:220px;line-height:1.2}
    .proj b{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .proj span{color:#aeb6c6;font-size:11.5px}
    .seg{display:flex;gap:2px;padding:2px;border-radius:10px;background:#121722}
    button{all:unset;cursor:pointer}
    .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;min-width:32px;padding:0 10px;border-radius:8px;color:#aeb6c6;font-size:12.5px;font-weight:500}
    .btn:hover{color:#eef1f6;background:#182036}
    .btn[aria-pressed=true]{background:#eef1f6;color:#0b0e15}
    .btn:focus-visible{outline:2px solid #6f9bff;outline-offset:1px}
    .primary{background:linear-gradient(135deg,#2f66e0,#16a36a);color:#fff}
    .primary:hover{filter:brightness(1.08);color:#fff;background:linear-gradient(135deg,#2f66e0,#16a36a)}
    .primary[disabled]{opacity:.7;cursor:progress}
    .ghost{border:1px solid #283044}
    .sep{width:1px;height:22px;background:#283044;margin:0 2px}
    .msg{color:#f07686;font-size:12px;max-width:260px;padding:0 6px}
    .pop{position:fixed;width:320px;padding:14px;border-radius:14px;background:#0b0e15;border:1px solid #283044;box-shadow:0 18px 50px -12px rgba(0,0,0,.6);color:#eef1f6;font-size:13px;z-index:2147483647}
    .pop h4{margin:0 0 2px;padding-right:30px;font-size:13.5px;font-weight:600;line-height:1.35}
    .pop .sub{color:#7d8699;font-size:11.5px;margin-bottom:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    textarea{all:unset;display:block;width:100%;min-height:84px;padding:9px 10px;border-radius:9px;background:#05070b;border:1px solid #283044;color:#eef1f6;font-size:13.5px;line-height:1.45;white-space:pre-wrap}
    textarea:focus{border-color:#6f9bff}
    select{all:unset;height:30px;padding:0 8px;border-radius:8px;background:#121722;border:1px solid #283044;color:#eef1f6;font-size:12.5px;cursor:pointer}
    label.chk{display:flex;align-items:center;gap:6px;color:#aeb6c6;font-size:12px;cursor:pointer}
    .row{display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap}
    .row .grow{flex:1}
    .err{color:#f07686;font-size:12px;margin-top:8px}
    .note{color:#7d8699;font-size:11.5px;margin-top:6px}
    .chip{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:999px;font-size:11.5px;font-weight:500;background:#121722;color:#aeb6c6}
    .dot{width:7px;height:7px;border-radius:50%}
    .body{margin-top:8px;color:#aeb6c6;line-height:1.45;max-height:120px;overflow:auto;white-space:pre-wrap}
    .x{position:absolute;top:8px;right:8px;width:28px;height:28px;border-radius:7px;display:grid;place-items:center;color:#7d8699}
    .x:hover{background:#182036;color:#eef1f6}
    a.link{color:#8fb3ff;font-size:12.5px;text-decoration:none}
    a.link:hover{text-decoration:underline}
    .spin{width:14px;height:14px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:s .7s linear infinite}
    @keyframes s{to{transform:rotate(360deg)}}
    @media (prefers-reduced-motion:reduce){.spin{animation-duration:2s}}
  </style><div class="bar" role="toolbar" aria-label="QASync"></div><div class="layer"></div>`;
  const bar = root.querySelector(".bar");
  const layer = root.querySelector(".layer");

  const ICON = {
    logo: '<svg width="16" height="16" viewBox="0 0 32 32" fill="none"><path d="M19.4 6.95A8 8 0 1 0 22.9 13" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/><path d="M21 4.6l.6 4.4-4.3 1z" fill="#fff"/><path d="M16.3 17.6l3.4 3.4 7-7" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    browse: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.04 4.74a.5.5 0 0 1 .7-.7l15 6a.5.5 0 0 1-.04.94l-6.04 1.92a2 2 0 0 0-1.3 1.3l-1.92 6.04a.5.5 0 0 1-.94.04z"/></svg>',
    comment: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M12 7v6M9 10h6"/></svg>',
    freeze: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20M12 2v20M20 16l-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4"/></svg>',
    close: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  };

  function renderBar(status) {
    const p = state.project;
    const open = state.issues.filter((i) => OPEN.includes(i.status)).length;
    bar.innerHTML = `
      <div class="logo" aria-hidden="true">${ICON.logo}</div>
      <div class="proj">${p ? `<b>${esc(p.name)}</b><span>${open} open on this page</span>` : `<b>${esc(hostKey(location.hostname))}</b><span>Not a QASync project yet</span>`}</div>
      ${
        p
          ? `<div class="seg">
              <button class="btn" data-act="browse" aria-pressed="${state.mode === "browse"}" title="Browse (B)" aria-label="Browse">${ICON.browse}</button>
              <button class="btn" data-act="comment" aria-pressed="${state.mode === "comment"}" title="Comment (C): click anything on the page" aria-label="Comment">${ICON.comment} Comment</button>
            </div>
            <button class="btn" data-act="freeze" aria-pressed="${state.frozen}" title="Freeze hover states (F)" aria-label="Freeze hover states">${ICON.freeze}</button>`
          : `<button class="btn primary" data-act="add">Add this site</button>`
      }
      ${status ? `<span class="msg" role="status">${esc(status)}</span>` : ""}
      <span class="sep"></span>
      <button class="btn" data-act="close" title="Close QASync on this page" aria-label="Close QASync">${ICON.close}</button>`;
  }

  bar.addEventListener("click", async (e) => {
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "browse" || act === "comment") setMode(act);
    else if (act === "freeze") toReviewer({ type: "freeze", on: !state.frozen });
    else if (act === "close") hide();
    else if (act === "add") addProject(e.target.closest("button"));
  });
  // Keys typed in our inputs must not reach the page (its own shortcuts) — the reviewer already ignores them.
  root.addEventListener("keydown", (e) => e.stopPropagation());

  function setMode(mode) {
    state.mode = mode;
    toReviewer({ type: "mode", mode });
    if (mode === "browse") closeDraft();
    renderBar();
  }

  /* ───────── data ───────── */

  async function loadProject() {
    const r = await send({ type: "api", method: "GET", path: "/api/projects" });
    if (!r.ok) throw new Error(r.data?.error || "Couldn't load your projects");
    const list = Array.isArray(r.data) ? r.data : r.data?.projects || [];
    const here = hostKey(location.hostname);
    return (
      list.find((p) => {
        if (!/^https?:\/\//i.test(p.baseUrl || "")) return false;
        try {
          return hostKey(new URL(p.baseUrl).hostname) === here;
        } catch {
          return false;
        }
      }) || null
    );
  }

  async function loadIssues() {
    if (!state.project) return;
    const r = await send({ type: "api", method: "GET", path: `/api/issues?projectId=${encodeURIComponent(state.project.id)}&pageUrl=${encodeURIComponent(state.url)}` });
    state.issues = r.ok && Array.isArray(r.data) ? r.data.filter((i) => i.status !== "wont_fix") : [];
    sendPins();
    send({ type: "badge", count: state.issues.filter((i) => OPEN.includes(i.status)).length });
    renderBar(r.ok ? "" : r.data?.error);
  }

  function sendPins() {
    const pins = state.issues.map((i) => ({ id: i.id, number: i.number, selector: i.selector, xPct: i.xPct, yPct: i.yPct, status: i.status, color: colorOf(i), textColor: colorOf(i) === PRIORITY_COLOR.low ? "#422006" : "#ffffff" }));
    if (state.draft) pins.push({ id: "__new", number: "+", selector: state.draft.selector, xPct: state.draft.xPct, yPct: state.draft.yPct, status: "open" });
    toReviewer({ type: "pins", pins: state.visible ? pins : [], selectedId: state.draft ? "__new" : state.card });
  }

  async function addProject(btn) {
    if (btn) btn.setAttribute("disabled", "");
    const r = await send({ type: "api", method: "POST", path: "/api/projects", body: { url: `${location.origin}/` } });
    if (!r.ok) return renderBar(r.data?.error || "Couldn't add this site");
    state.project = r.data;
    await loadIssues();
  }

  /* ───────── comment ───────── */

  function place(el, cx, cy) {
    const w = 320, h = el.offsetHeight || 260, m = 12;
    let x = cx + 16, y = cy - 20;
    if (x + w > innerWidth - m) x = Math.max(m, cx - w - 16);
    if (y + h > innerHeight - 90) y = Math.max(m, innerHeight - h - 90);
    el.style.left = `${x}px`;
    el.style.top = `${Math.max(m, y)}px`;
  }

  function openDraft(pick) {
    closeCard();
    state.draft = pick;
    sendPins();
    const el = pick.element || {};
    layer.innerHTML = `<div class="pop" role="dialog" aria-label="New comment">
      <button class="x" data-act="cancel" aria-label="Cancel">${ICON.close}</button>
      <h4>New comment</h4>
      <div class="sub">${esc(el.tag || "element")}${el.text ? ` · “${esc(String(el.text).slice(0, 40))}”` : ""}</div>
      <textarea placeholder="What should change?" aria-label="Comment"></textarea>
      <div class="row">
        <select aria-label="Priority"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select>
        <label class="chk"><input type="checkbox" checked> Screenshot</label>
      </div>
      <div class="row">
        <span class="grow"></span>
        <button class="btn ghost" data-act="cancel">Cancel</button>
        <button class="btn primary" data-act="post">Post</button>
      </div>
      <div class="note">Text fields on the page are blurred in screenshots.</div>
      <div class="err" role="alert" hidden></div>
    </div>`;
    const pop = layer.firstElementChild;
    place(pop, pick.cx, pick.cy);
    pop.querySelector("textarea").focus();
    pop.addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "cancel") closeDraft();
      if (act === "post") postDraft(pop);
    });
    pop.querySelector("textarea").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) postDraft(pop);
      if (e.key === "Escape") closeDraft();
    });
  }

  function closeDraft() {
    if (!state.draft) return;
    state.draft = null;
    layer.innerHTML = "";
    toReviewer({ type: "clear" });
    sendPins();
  }

  async function screenshot() {
    // Hide our UI and blur everything typed into the page before capturing the visible tab.
    host.style.visibility = "hidden";
    const blur = document.createElement("style");
    blur.setAttribute("data-qasync", "");
    blur.textContent =
      'input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=reset]):not([type=range]):not([type=color]):not([type=hidden]),textarea,[contenteditable=""],[contenteditable="true"]{filter:blur(7px)!important}';
    document.documentElement.appendChild(blur);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await sleep(50);
    try {
      return await send({ type: "capture" });
    } finally {
      blur.remove();
      host.style.visibility = "";
    }
  }

  async function postDraft(pop) {
    const text = pop.querySelector("textarea").value.trim();
    const err = pop.querySelector(".err");
    if (!text) {
      err.textContent = "Say what needs to change.";
      err.hidden = false;
      return;
    }
    const btn = pop.querySelector('[data-act="post"]');
    btn.setAttribute("disabled", "");
    btn.innerHTML = '<span class="spin" aria-hidden="true"></span> Posting';
    err.hidden = true;
    const d = state.draft;
    const attachments = [];
    let note = "";
    if (pop.querySelector('input[type="checkbox"]').checked) {
      const shot = await screenshot();
      if (shot.ok && shot.dataUrl) {
        const up = await send({ type: "upload", dataUrl: shot.dataUrl, name: `screenshot-${Date.now()}.jpg` });
        if (up.ok && up.data?.id) attachments.push({ id: up.data.id });
        else note = up.data?.error ? ` without a screenshot: ${up.data.error}` : " without a screenshot";
      } else note = ` without a screenshot: ${shot.error || "capture failed"}`;
    }
    const env = { ...(d.env || {}), url: state.url, consoleErrors: [...(d.env?.consoleErrors || []), ...state.pageErrors].slice(-10) };
    const r = await send({
      type: "api",
      method: "POST",
      path: "/api/issues",
      body: {
        projectId: state.project.id,
        pageUrl: state.url,
        body: text,
        priority: pop.querySelector("select").value,
        attachments,
        selector: d.selector,
        xPct: d.xPct,
        yPct: d.yPct,
        viewportW: d.viewportW || innerWidth,
        device: deviceFor(innerWidth),
        element: d.element,
        env,
      },
    });
    if (!r.ok) {
      btn.removeAttribute("disabled");
      btn.textContent = "Post";
      err.textContent = r.data?.error || "Couldn't post the comment";
      err.hidden = false;
      return;
    }
    state.draft = null;
    layer.innerHTML = "";
    toReviewer({ type: "clear" });
    await loadIssues();
    if (note) renderBar(`Posted${note}`);
  }

  /* ───────── issue card ───────── */

  function openCard(id, cx, cy) {
    const i = state.issues.find((x) => x.id === id);
    if (!i) return;
    closeDraft();
    state.card = id;
    sendPins();
    const link = `${state.server}/app/projects/${encodeURIComponent(state.project.id)}/review?issue=${encodeURIComponent(i.id)}`;
    const actions =
      i.status === "fixed"
        ? `<button class="btn primary" data-status="verified">Verified</button><button class="btn ghost" data-status="open">Reopen</button>`
        : i.status === "verified"
          ? `<button class="btn ghost" data-status="open">Reopen</button>`
          : `<button class="btn ghost" data-status="fixed">Mark fixed</button>`;
    layer.innerHTML = `<div class="pop" role="dialog" aria-label="Issue ${esc(i.number)}">
      <button class="x" data-act="close" aria-label="Close">${ICON.close}</button>
      <h4>#${esc(i.number)} · ${esc(i.title)}</h4>
      <div class="sub"><span class="chip"><span class="dot" style="background:${colorOf(i)}"></span>${esc(STATUS_LABEL[i.status] || i.status)}</span> &nbsp;${esc(i.reporterName || "")}</div>
      ${i.body ? `<div class="body">${esc(i.body)}</div>` : ""}
      <div class="row">${actions}<span class="grow"></span><a class="link" href="${esc(link)}" target="_blank" rel="noopener">Open in QASync ↗</a></div>
      <div class="err" role="alert" hidden></div>
    </div>`;
    const pop = layer.firstElementChild;
    place(pop, cx ?? innerWidth / 2, cy ?? innerHeight / 3);
    pop.addEventListener("click", async (e) => {
      if (e.target.closest('[data-act="close"]')) return closeCard();
      const b = e.target.closest("[data-status]");
      if (!b) return;
      b.setAttribute("disabled", "");
      const r = await send({ type: "api", method: "PATCH", path: `/api/issues/${encodeURIComponent(i.id)}`, body: { status: b.dataset.status } });
      if (!r.ok) {
        b.removeAttribute("disabled");
        const err = pop.querySelector(".err");
        err.textContent = r.data?.error || "Couldn't update the issue";
        err.hidden = false;
        return;
      }
      closeCard();
      await loadIssues();
    });
  }

  function closeCard() {
    if (state.card == null) return;
    state.card = null;
    layer.innerHTML = "";
    sendPins();
  }

  /* ───────── messages ───────── */

  window.addEventListener("message", (e) => {
    const m = e.data;
    if (!m || e.source !== window) return;
    if (m.source === "qasync-page" && m.type === "console") {
      state.pageErrors.push(m.text);
      if (state.pageErrors.length > 20) state.pageErrors.shift();
      return;
    }
    if (m.source !== "qasync" || !state.visible) return;
    switch (m.type) {
      case "ready":
        toReviewer({ type: "mode", mode: state.mode });
        sendPins();
        break;
      case "pick":
        if (state.project) openDraft(m.data);
        break;
      case "pin-click":
        if (m.id !== "__new") openCard(m.id, m.x, m.y);
        break;
      case "navigate":
        location.assign(m.url);
        break;
      case "freeze-changed":
        state.frozen = !!m.on;
        renderBar();
        break;
      case "key":
        if (m.key === "c" && state.project) setMode("comment");
        else if (m.key === "b") setMode("browse");
        else if (m.key === "escape") {
          if (state.draft) closeDraft();
          else if (state.card != null) closeCard();
          else setMode("browse");
        }
        break;
    }
  });

  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg.type === "qasync:show") show().then(() => reply({ ok: true }));
    else if (msg.type === "qasync:info") reply({ project: state.project, issues: state.issues, pageUrl: state.url, visible: state.visible });
    else if (msg.type === "qasync:focus") {
      if (!state.visible) show();
      toReviewer({ type: "focus", id: msg.id });
      openCard(msg.id);
      reply({ ok: true });
    } else if (msg.type === "qasync:refresh") loadIssues().then(() => reply({ ok: true }));
    else return false;
    return true;
  });

  /* ───────── show / hide ───────── */

  async function show() {
    if (!host.isConnected) document.documentElement.appendChild(host);
    host.style.display = "";
    state.visible = true;
    const s = await send({ type: "state" });
    state.server = s.server || "";
    renderBar("Loading…");
    try {
      state.project = await loadProject();
      renderBar();
      await loadIssues();
      toReviewer({ type: "mode", mode: state.mode });
    } catch (e) {
      renderBar(e.message);
    }
  }

  function hide() {
    state.visible = false;
    closeDraft();
    closeCard();
    toReviewer({ type: "mode", mode: "browse" });
    toReviewer({ type: "pins", pins: [] });
    if (state.frozen) toReviewer({ type: "freeze", on: false });
    host.style.display = "none";
  }

  // Single-page apps change the URL without reloading: follow along.
  setInterval(() => {
    const now = pageUrl();
    if (now === state.url) return;
    state.url = now;
    window.__QASYNC__.url = location.href;
    closeDraft();
    closeCard();
    if (state.visible) loadIssues();
  }, 1000);
})();

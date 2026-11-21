/*!
 * QASync reviewer agent: injected into proxied pages (and, later, by the widget and extension).
 * It talks to the host canvas via postMessage only and renders its UI inside a Shadow DOM.
 *
 * host → page:  {source:'qasync-host', type:'mode', mode:'browse'|'comment'|'inspect'}
 *               {source:'qasync-host', type:'pins', pins:[{id,number,selector,xPct,yPct,status,selected}]}
 *               {source:'qasync-host', type:'focus', id}
 *               {source:'qasync-host', type:'freeze', on:boolean}
 *               {source:'qasync-host', type:'clear'}
 * page → host:  ready · pick · inspect · pin-click · navigate · freeze-changed · key
 */
(function () {
  if (window.__qasyncAgent) return;
  window.__qasyncAgent = true;

  var post = function (msg) {
    msg.source = "qasync";
    try { window.parent.postMessage(msg, "*"); } catch (e) {}
  };

  /* ── capture console errors early ── */
  var consoleErrors = [];
  var origError = console.error;
  console.error = function () {
    try { consoleErrors.push(Array.prototype.map.call(arguments, String).join(" ").slice(0, 300)); } catch (e) {}
    if (consoleErrors.length > 20) consoleErrors.shift();
    return origError.apply(console, arguments);
  };
  window.addEventListener("error", function (e) {
    consoleErrors.push(((e && e.message) || "Error") + (e && e.filename ? " @ " + e.filename.split("/").pop() + ":" + e.lineno : ""));
    if (consoleErrors.length > 20) consoleErrors.shift();
  });

  var state = { mode: "browse", pins: [], frozen: false, hoverEl: null, selectedId: null };
  var COLORS = { open: "#e0434f", in_progress: "#f0900c", in_review: "#5f8ad0", fixed: "#1f4c9c", verified: "#16a36a", wont_fix: "#8a92a6" };

  function init() {
    /* ── shadow UI layer ── */
    var host = document.createElement("qasync-layer");
    host.setAttribute("data-qasync", "");
    host.style.cssText = "position:absolute;top:0;left:0;width:0;height:0;z-index:2147483646;pointer-events:none;";
    document.documentElement.appendChild(host);
    var root = host.attachShadow({ mode: "open" });
    root.innerHTML =
      "<style>" +
      ":host{all:initial}" +
      ".hl{position:absolute;pointer-events:none;border:1.5px solid #2b5ebe;background:rgba(43,94,190,.08);border-radius:2px;transition:all 60ms ease-out;display:none;box-sizing:border-box}" +
      ".hl.inspect{border-color:#16a36a;background:rgba(22,163,106,.07)}" +
      ".pad{position:absolute;pointer-events:none;background:rgba(22,163,106,.16);display:none}" +
      ".tag{position:absolute;pointer-events:none;font:500 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;background:#0b1220;color:#fff;padding:4px 6px;border-radius:4px;white-space:nowrap;display:none}" +
      ".tag b{color:#6ee7b7;font-weight:600}" +
      ".pin{position:absolute;pointer-events:auto;width:28px;height:28px;margin:-28px 0 0 -2px;border-radius:14px 14px 14px 2px;color:#fff;font:600 12px/28px ui-sans-serif,system-ui,sans-serif;text-align:center;cursor:pointer;box-shadow:0 4px 12px rgba(14,17,22,.3),0 0 0 2px #fff;transition:transform 120ms;animation:pop 240ms cubic-bezier(.2,.9,.3,1.2) both}" +
      ".pin:hover{transform:scale(1.12)}" +
      ".pin.sel{box-shadow:0 0 0 2px #fff,0 0 0 5px rgba(43,94,190,.45),0 6px 16px rgba(14,17,22,.35);transform:scale(1.15)}" +
      ".pin.lost{opacity:.55;border:1.5px dashed #fff}" +
      ".pin.done{opacity:.8}" +
      ".pulse{position:absolute;pointer-events:none;border:2px solid #2b5ebe;border-radius:4px;animation:pulse 1.2s ease-out 2}" +
      ".frz{position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#0e1116;color:#fff;font:500 12px ui-sans-serif,system-ui;padding:6px 12px;border-radius:999px;display:none;pointer-events:none;box-shadow:0 6px 18px rgba(0,0,0,.3)}" +
      ".ovl{position:absolute;left:0;top:0;pointer-events:none;display:none;max-width:none}" +
      "@keyframes pop{0%{transform:scale(.3);opacity:0}100%{transform:scale(1);opacity:1}}" +
      "@keyframes pulse{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.15)}}" +
      "</style>" +
      '<img class="ovl" alt=""><div class="hl"></div><div class="pad"></div><div class="pad"></div><div class="pad"></div><div class="pad"></div><div class="tag"></div><div class="pins"></div><div class="frz">❄ Page frozen: hover states held · press F to release</div>';

    var hl = root.querySelector(".hl");
    var pads = root.querySelectorAll(".pad");
    var tag = root.querySelector(".tag");
    var pinsLayer = root.querySelector(".pins");
    var frzBadge = root.querySelector(".frz");
    var ovl = root.querySelector(".ovl");

    /* ── design overlay: drawn inside the page so it scrolls with the content ── */
    function setOverlay(o) {
      if (!o || !o.on || !o.src) { ovl.style.display = "none"; return; }
      if (ovl.getAttribute("src") !== o.src) ovl.setAttribute("src", o.src);
      ovl.style.display = "block";
      ovl.style.width = document.documentElement.clientWidth + "px";
      ovl.style.opacity = String(o.opacity == null ? 0.5 : o.opacity);
      ovl.style.mixBlendMode = o.blend ? "difference" : "normal";
      ovl.style.top = (o.offsetY || 0) + "px";
    }
    var lastOverlay = null;
    window.addEventListener("resize", function () { if (lastOverlay) setOverlay(lastOverlay); });

    /* ── report scroll so the host can sync a side-by-side design ── */
    var scrollRaf = 0;
    // While following a sync command, don't echo our own scroll back (prevents ping-pong).
    var ignoreScrollUntil = 0;

    /** The content block near the top of the view, plus how far into it we are. */
    function scrollAnchor() {
      var x = Math.round(window.innerWidth / 2);
      var probes = [96, 170, 250]; // skip past sticky headers
      for (var i = 0; i < probes.length; i++) {
        var ty = probes[i];
        if (ty >= window.innerHeight) break;
        var el = document.elementFromPoint(x, ty);
        if (!el || isOurs(el) || el === document.documentElement || el === document.body) continue;
        while (el.parentElement && el.parentElement !== document.body && el.getBoundingClientRect().height < 60) el = el.parentElement;
        var cs = getComputedStyle(el);
        if (cs.position === "fixed" || cs.position === "sticky") continue;
        var sel = selectorFor(el);
        if (!sel) continue;
        var r = el.getBoundingClientRect();
        return { selector: sel, frac: r.height ? (ty - r.top) / r.height : 0, ty: ty };
      }
      return null;
    }

    function reportScroll() {
      if (performance.now() < ignoreScrollUntil) return;
      cancelAnimationFrame(scrollRaf);
      scrollRaf = requestAnimationFrame(function () {
        var de = document.documentElement;
        post({ type: "scroll", y: window.scrollY, docH: de.scrollHeight, vh: window.innerHeight, vw: de.clientWidth, anchor: scrollAnchor() });
      });
    }
    window.addEventListener("scroll", reportScroll, { passive: true });

    var isOurs = function (el) { return el === host || (el && el.closest && el.closest("qasync-layer")); };

    /* ── selector generation ── */
    function cssEscape(s) { return window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/[^a-zA-Z0-9_-]/g, "\\$&"); }
    function stableClasses(el) {
      return Array.prototype.filter.call(el.classList || [], function (c) {
        return c.length < 30 && !/\d{3,}|^(css|sc|jsx|emotion|svelte)-|__[a-z0-9]{5,}$|^[a-z]{1,2}-[a-zA-Z0-9]{5,}$/.test(c) && c.indexOf(":") === -1;
      }).slice(0, 2);
    }
    function unique(sel) { try { return document.querySelectorAll(sel).length === 1; } catch (e) { return false; } }
    function selectorFor(el) {
      if (!(el instanceof Element)) return null;
      if (el.id && !/\d{4,}/.test(el.id) && unique("#" + cssEscape(el.id))) return "#" + cssEscape(el.id);
      var parts = [];
      var cur = el;
      while (cur && cur.nodeType === 1 && cur !== document.documentElement) {
        var part = cur.tagName.toLowerCase();
        if (cur.id && !/\d{4,}/.test(cur.id)) { parts.unshift("#" + cssEscape(cur.id)); break; }
        var cls = stableClasses(cur);
        if (cls.length) part += "." + cls.map(cssEscape).join(".");
        var parent = cur.parentElement;
        if (parent) {
          var same = Array.prototype.filter.call(parent.children, function (c) { return c.tagName === cur.tagName; });
          if (same.length > 1) part += ":nth-child(" + (Array.prototype.indexOf.call(parent.children, cur) + 1) + ")";
        }
        parts.unshift(part);
        var sel = parts.join(" > ");
        if (unique(sel)) return sel;
        cur = parent;
      }
      var full = parts.join(" > ");
      return unique(full) ? full : null;
    }

    /* ── element info + contrast ── */
    function parseColor(c) {
      var m = c && c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    }
    function lum(c) {
      var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    }
    function effectiveBg(el) {
      var cur = el;
      while (cur && cur.nodeType === 1) {
        var bg = parseColor(getComputedStyle(cur).backgroundColor);
        if (bg && bg.a > 0.5) return bg;
        cur = cur.parentElement;
      }
      return { r: 255, g: 255, b: 255, a: 1 };
    }
    function infoFor(el) {
      var cs = getComputedStyle(el);
      var r = el.getBoundingClientRect();
      var fg = parseColor(cs.color);
      var bg = effectiveBg(el);
      var contrast = null;
      if (fg) {
        var l1 = lum(fg), l2 = lum(bg);
        contrast = Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100;
      }
      var text = (el.innerText || el.value || el.getAttribute("aria-label") || el.getAttribute("alt") || "").replace(/\s+/g, " ").trim().slice(0, 120);
      return {
        tag: el.tagName.toLowerCase(),
        text: text,
        font: cs.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
        size: cs.fontSize,
        weight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        color: cs.color,
        bg: "rgb(" + bg.r + ", " + bg.g + ", " + bg.b + ")",
        contrast: contrast,
        padding: cs.padding || [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].join(" "),
        margin: cs.margin || [cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft].join(" "),
        radius: cs.borderRadius,
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    }
    function envInfo() {
      var ua = navigator.userAgent;
      var browser = /Edg\//.test(ua) ? "Edge " + (ua.match(/Edg\/(\d+)/) || [])[1]
        : /Firefox\//.test(ua) ? "Firefox " + (ua.match(/Firefox\/(\d+)/) || [])[1]
        : /Chrome\//.test(ua) ? "Chrome " + (ua.match(/Chrome\/(\d+)/) || [])[1]
        : /Safari\//.test(ua) ? "Safari" : "Unknown";
      var os = /Windows NT 10/.test(ua) ? "Windows 10/11" : /Mac OS X ([\d_]+)/.test(ua) ? "macOS " + ua.match(/Mac OS X ([\d_]+)/)[1].replace(/_/g, ".")
        : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "Unknown";
      return { ua: ua, browser: browser, os: os, dpr: window.devicePixelRatio || 1, url: (window.__QASYNC__ && window.__QASYNC__.url) || location.href, consoleErrors: consoleErrors.slice(-10), viewport: window.innerWidth + "×" + window.innerHeight };
    }

    /* ── highlight ── */
    function docRect(el) {
      var r = el.getBoundingClientRect();
      return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
    }
    function hideHighlight() {
      hl.style.display = "none"; tag.style.display = "none";
      pads.forEach(function (p) { p.style.display = "none"; });
    }
    function showHighlight(el) {
      var r = docRect(el);
      hl.className = "hl" + (state.mode === "inspect" ? " inspect" : "");
      hl.style.cssText += ";display:block;left:" + r.x + "px;top:" + r.y + "px;width:" + r.w + "px;height:" + r.h + "px";
      var cs = getComputedStyle(el);
      var t = el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (stableClasses(el)[0] ? "." + stableClasses(el)[0] : "");
      var html = "<b>" + t.replace(/</g, "&lt;") + "</b>  " + Math.round(r.w) + "×" + Math.round(r.h);
      if (state.mode === "inspect") {
        html += "  ·  " + cs.fontSize + "/" + (cs.lineHeight === "normal" ? "normal" : Math.round(parseFloat(cs.lineHeight)) + "px") + " " + cs.fontWeight + "  ·  pad " + [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(function (v) { return parseInt(v, 10); }).join(" ");
        // padding visualisation
        var pt = parseFloat(cs.paddingTop), pr = parseFloat(cs.paddingRight), pb = parseFloat(cs.paddingBottom), pl = parseFloat(cs.paddingLeft);
        var boxes = [[r.x, r.y, r.w, pt], [r.x + r.w - pr, r.y, pr, r.h], [r.x, r.y + r.h - pb, r.w, pb], [r.x, r.y, pl, r.h]];
        boxes.forEach(function (b, i) {
          pads[i].style.cssText = "display:" + (b[2] > 0 && b[3] > 0 ? "block" : "none") + ";left:" + b[0] + "px;top:" + b[1] + "px;width:" + b[2] + "px;height:" + b[3] + "px";
        });
      } else {
        pads.forEach(function (p) { p.style.display = "none"; });
      }
      tag.innerHTML = html;
      var ty = r.y - 24 < window.scrollY ? r.y + r.h + 4 : r.y - 24;
      tag.style.cssText = "display:block;left:" + Math.max(window.scrollX + 4, r.x) + "px;top:" + ty + "px";
    }

    /* ── pins ── */
    function locate(pin) {
      var el = null;
      if (pin.selector) { try { el = document.querySelector(pin.selector); } catch (e) {} }
      if (el) {
        var r = docRect(el);
        var pos = { x: r.x + (r.w * pin.xPct) / 100, y: r.y + (r.h * pin.yPct) / 100, lost: false, el: el, hidden: false };
        pos.hidden = isHidden(el, pos);
        return pos;
      }
      var de = document.documentElement;
      return { x: (de.scrollWidth * pin.xPct) / 100, y: (de.scrollHeight * pin.yPct) / 100, lost: true, el: null, hidden: false };
    }

    /**
     * A pin is only drawn where its element can actually be seen. If the element is collapsed or
     * hidden, or something else (an open menu, a modal, a sticky header, a cookie bar) is painted
     * over that spot, the pin is hidden instead of floating on top of the wrong content.
     */
    function isHidden(el, pos) {
      var rect = el.getBoundingClientRect();
      if (rect.width < 1 && rect.height < 1) return true;
      if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return true;
      // Occlusion can only be tested inside the viewport; off-screen pins keep their last state.
      var vx = pos.x - window.scrollX, vy = pos.y - window.scrollY;
      if (vx < 0 || vy < 0 || vx >= window.innerWidth || vy >= window.innerHeight) return false;
      var stack = document.elementsFromPoint ? document.elementsFromPoint(vx, vy) : [document.elementFromPoint(vx, vy)];
      var top = null;
      for (var i = 0; i < stack.length; i++) { if (stack[i] && !isOurs(stack[i])) { top = stack[i]; break; } }
      if (!top) return false;
      // Visible if the topmost thing there is the element, inside it, or one of its own ancestors.
      return !(top === el || el.contains(top) || top.contains(el));
    }
    // Pins are keyed by id and updated in place so the pop-in animation only plays once.
    var pinEls = {};
    function renderPins() {
      var seen = {};
      state.pins.forEach(function (pin) {
        seen[pin.id] = true;
        var pos = locate(pin);
        var d = pinEls[pin.id];
        if (!d) {
          d = document.createElement("div");
          d.addEventListener("click", function (e) {
            e.preventDefault(); e.stopPropagation();
            post({ type: "pin-click", id: d.dataset.id });
          });
          pinsLayer.appendChild(d);
          pinEls[pin.id] = d;
        }
        d.dataset.id = pin.id;
        d.className = "pin" + (pin.id === state.selectedId ? " sel" : "") + (pos.lost ? " lost" : "") + (pin.status === "verified" || pin.status === "fixed" ? " done" : "");
        d.style.left = pos.x + "px";
        d.style.top = pos.y + "px";
        // The pin being written right now always shows; others hide when their element is covered.
        d.style.display = pos.hidden && pin.id !== "__new" && pin.id !== state.selectedId ? "none" : "";
        d.style.background = pin.color || COLORS[pin.status] || "#2b5ebe";
        d.style.color = pin.textColor || "#fff";
        d.textContent = pin.status === "verified" || pin.status === "fixed" ? "✓" : String(pin.number);
        d.title = "#" + pin.number + (pos.lost ? " (element not found on this version of the page)" : "");
      });
      Object.keys(pinEls).forEach(function (id) {
        if (!seen[id]) { pinEls[id].remove(); delete pinEls[id]; }
      });
    }
    var raf = 0;
    function scheduleRender() { cancelAnimationFrame(raf); raf = requestAnimationFrame(renderPins); }
    window.addEventListener("resize", scheduleRender);
    // Occlusion depends on what's in view (sticky headers, open menus), so re-check on scroll and clicks too.
    window.addEventListener("scroll", scheduleRender, { passive: true });
    document.addEventListener("click", function () { setTimeout(scheduleRender, 350); }, true);
    document.addEventListener("transitionend", scheduleRender, true);
    setInterval(renderPins, 800);
    if (window.ResizeObserver) new ResizeObserver(scheduleRender).observe(document.body);

    function focusPin(id) {
      var pin = state.pins.find(function (p) { return p.id === id; });
      state.selectedId = id;
      renderPins();
      if (!pin) return;
      var pos = locate(pin);
      window.scrollTo({ top: Math.max(0, pos.y - window.innerHeight / 3), behavior: "smooth" });
      if (pos.el) {
        var r = docRect(pos.el);
        var p = document.createElement("div");
        p.className = "pulse";
        p.style.cssText = "left:" + (r.x - 3) + "px;top:" + (r.y - 3) + "px;width:" + (r.w + 6) + "px;height:" + (r.h + 6) + "px";
        root.appendChild(p);
        setTimeout(function () { p.remove(); }, 2600);
      }
    }

    /* ── freeze hover / animations ── */
    var freezeStyle = null;
    var blocked = ["mouseover", "mouseout", "mouseenter", "mouseleave", "pointerover", "pointerout", "pointerenter", "pointerleave", "blur", "focusout"];
    function blocker(e) { if (!isOurs(e.target)) e.stopImmediatePropagation(); }
    function setFrozen(on) {
      if (on === state.frozen) return;
      state.frozen = on;
      frzBadge.style.display = on ? "block" : "none";
      if (on) {
        var css = "*,*::before,*::after{animation-play-state:paused!important;transition:none!important;caret-color:transparent!important}\n";
        Array.prototype.forEach.call(document.styleSheets, function (sheet) {
          var rules; try { rules = sheet.cssRules; } catch (e) { return; }
          (function walk(list) {
            Array.prototype.forEach.call(list || [], function (rule) {
              if (rule.cssRules && !rule.selectorText) return walk(rule.cssRules);
              if (rule.selectorText && rule.selectorText.indexOf(":hover") > -1) {
                css += rule.selectorText.replace(/:hover/g, ".qasync-hover") + "{" + rule.style.cssText + "}\n";
              }
              if (rule.selectorText && rule.selectorText.indexOf(":focus") > -1) {
                css += rule.selectorText.replace(/:focus(-visible|-within)?/g, ".qasync-focus") + "{" + rule.style.cssText + "}\n";
              }
            });
          })(rules);
        });
        document.querySelectorAll(":hover").forEach(function (el) { el.classList.add("qasync-hover"); });
        if (document.activeElement && document.activeElement !== document.body) {
          var a = document.activeElement;
          while (a && a !== document.body) { a.classList.add("qasync-focus"); a = a.parentElement; }
        }
        freezeStyle = document.createElement("style");
        freezeStyle.setAttribute("data-qasync", "");
        freezeStyle.textContent = css;
        document.head.appendChild(freezeStyle);
        blocked.forEach(function (t) { window.addEventListener(t, blocker, true); });
      } else {
        if (freezeStyle) freezeStyle.remove();
        document.querySelectorAll(".qasync-hover,.qasync-focus").forEach(function (el) { el.classList.remove("qasync-hover", "qasync-focus"); });
        blocked.forEach(function (t) { window.removeEventListener(t, blocker, true); });
      }
      post({ type: "freeze-changed", on: on });
    }

    /* ── pointer handling ── */
    document.addEventListener("mousemove", function (e) {
      if (state.mode === "browse") return;
      var el = e.target;
      if (!el || isOurs(el) || el === document.documentElement || el === document.body) { hideHighlight(); state.hoverEl = null; return; }
      if (el !== state.hoverEl) { state.hoverEl = el; showHighlight(el); }
    }, true);
    document.addEventListener("mouseleave", hideHighlight);

    function swallow(e) {
      if (state.mode === "browse" || isOurs(e.target)) return false;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      return true;
    }
    ["mousedown", "mouseup", "pointerdown", "pointerup", "submit", "dblclick", "auxclick"].forEach(function (t) {
      document.addEventListener(t, swallow, true);
    });

    document.addEventListener("click", function (e) {
      if (isOurs(e.target)) return;
      if (state.mode === "browse") {
        var a = e.target.closest && e.target.closest("a[href]");
        if (a && !e.defaultPrevented) {
          var href = a.getAttribute("href");
          if (href && href.charAt(0) !== "#" && !/^(mailto|tel|javascript):/i.test(href)) {
            e.preventDefault();
            post({ type: "navigate", url: new URL(href, document.baseURI).toString() });
          }
        }
        return;
      }
      swallow(e);
      var el = e.target;
      if (!el || el === document.documentElement) return;
      var r = el.getBoundingClientRect();
      var xPct = r.width ? Math.round(((e.clientX - r.left) / r.width) * 1000) / 10 : 50;
      var yPct = r.height ? Math.round(((e.clientY - r.top) / r.height) * 1000) / 10 : 50;
      var selector = selectorFor(el);
      if (!selector) {
        var de = document.documentElement;
        xPct = Math.round(((e.clientX + window.scrollX) / de.scrollWidth) * 1000) / 10;
        yPct = Math.round(((e.clientY + window.scrollY) / de.scrollHeight) * 1000) / 10;
      }
      var payload = { selector: selector, xPct: xPct, yPct: yPct, element: infoFor(el), env: envInfo(), viewportW: window.innerWidth, cx: e.clientX, cy: e.clientY };
      post({ type: state.mode === "inspect" ? "inspect" : "pick", data: payload });
      if (state.mode === "comment") {
        // ghost pin where the new issue will land
        state.pins = state.pins.filter(function (p) { return p.id !== "__new"; });
        state.pins.push({ id: "__new", number: "+", selector: selector, xPct: xPct, yPct: yPct, status: "open" });
        state.selectedId = "__new";
        renderPins();
      }
    }, true);

    document.addEventListener("keydown", function (e) {
      var t = e.target;
      if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var k = e.key.toLowerCase();
      if (k === "f") { setFrozen(!state.frozen); e.preventDefault(); return; }
      if (["c", "i", "b", "escape", "j", "k"].indexOf(k) > -1) { post({ type: "key", key: k }); }
    }, true);

    /* ── host messages ── */
    window.addEventListener("message", function (e) {
      var m = e.data;
      if (!m || m.source !== "qasync-host") return;
      if (m.type === "hello") {
        // The host may have attached its listener after our first "ready"; answer the handshake.
        post({ type: "ready", url: (window.__QASYNC__ && window.__QASYNC__.url) || location.href, title: document.title, status: window.__QASYNC__ && window.__QASYNC__.status });
        reportScroll();
      } else if (m.type === "overlay") {
        lastOverlay = m;
        setOverlay(m);
      } else if (m.type === "scroll-to") {
        window.scrollTo({ top: m.y || 0 });
      } else if (m.type === "scroll-sync") {
        // Align the same content block (falls back to the same scroll percentage).
        var top = null;
        if (m.anchor && m.anchor.selector) {
          var target = null;
          try { target = document.querySelector(m.anchor.selector); } catch (e) {}
          if (target) {
            var tr = target.getBoundingClientRect();
            if (tr.height > 0 || tr.width > 0) top = tr.top + window.scrollY + m.anchor.frac * tr.height - m.anchor.ty;
          }
        }
        if (top === null && typeof m.ratio === "number") top = m.ratio * Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        if (top !== null) {
          ignoreScrollUntil = performance.now() + 200;
          window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
        }
      } else if (m.type === "mode") {
        state.mode = m.mode;
        document.documentElement.style.cursor = m.mode === "browse" ? "" : "crosshair";
        if (m.mode === "browse") hideHighlight();
      } else if (m.type === "pins") {
        state.pins = m.pins || [];
        if (m.selectedId !== undefined) state.selectedId = m.selectedId;
        renderPins();
      } else if (m.type === "focus") {
        focusPin(m.id);
      } else if (m.type === "freeze") {
        setFrozen(!!m.on);
      } else if (m.type === "clear") {
        state.pins = state.pins.filter(function (p) { return p.id !== "__new"; });
        renderPins();
      }
    });

    post({ type: "ready", url: (window.__QASYNC__ && window.__QASYNC__.url) || location.href, title: document.title, status: window.__QASYNC__ && window.__QASYNC__.status });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

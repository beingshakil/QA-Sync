"use client";

import Link from "next/link";
import { downloadDriveFile, googlePickerReady, pickDriveImage, preloadGoogle } from "@/lib/google-drive";
import { IntegrationIcon } from "@/components/integration-icon";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownUp,
  Check,
  ChevronDown,
  ArrowLeft,
  Columns2,
  Gauge,
  ImagePlus,
  Layers,
  Lock,
  Link2,
  Loader2,
  MessageSquarePlus,
  Monitor,
  MonitorSmartphone,
  MousePointer2,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  Camera,
  ScanSearch,
  Smartphone,
  Snowflake,
  Tablet,
  Trash2,
  X,
} from "lucide-react";
import { api, type GuestCtx } from "@/lib/api";
import { OPEN_STATUSES, issueColor, issueTextColor, pageState, type Design, type ElementInfo, type EnvInfo, type Issue, type Page, type Project } from "@/lib/types";
import { Button, LogoMark } from "@/components/ui";
import { IssueDetail, SpecTable } from "./issue-detail";
import { CanvasComposer, type ComposerSubmit } from "./canvas-composer";
import { CanvasPanel, DONE, type DeviceFilter, type PanelFilters } from "./canvas-panel";
import { PageTabs } from "./page-tabs";
import { PagesOverview } from "./pages-overview";
import { SharePopover } from "./share-popover";
import { AuditModal, prefetchAudit } from "./audit-modal";
import { cn, pageKey, pageLabel } from "@/lib/utils";
import { useConfirm } from "@/components/confirm";
import { FEATURE_LABEL, usageState, type Feature, type PlanAccess } from "@/lib/plans";
import { DEFAULT_SIZES, DEVICE_PRESETS, FALLBACK_W, resolveSize, type CustomSizes, type DevicePreset, type FrameKey } from "@/lib/devices";

type Mode = "browse" | "comment" | "inspect";
type DeviceKey = FrameKey | "split";
type Zoom = "fit" | "0.5" | "0.75" | "1" | "1.25";
type Tool = "compare" | "overlay" | null;
type Pick = { selector: string | null; xPct: number; yPct: number; element: ElementInfo & { margin?: string; radius?: string }; env: EnvInfo; viewportW: number; cx: number; cy: number };
type Placed = Pick & { frame: FrameKey; x: number; y: number };

const LABEL: Record<FrameKey, string> = { desktop: "Desktop", tablet: "Tablet", mobile: "Mobile" };
const PAD = 20;
const PANEL_DEFAULT = 360;
const PANEL_MIN = 280;
const PANEL_MAX = 720;
/** Keep the panel between its limits and never wider than 60% of the window. */
function clampPanel(w: number) {
  const max = typeof window === "undefined" ? PANEL_MAX : Math.min(PANEL_MAX, Math.round(window.innerWidth * 0.6));
  return Math.round(Math.max(PANEL_MIN, Math.min(max, w)));
}
const LABEL_H = 24;

interface FrameSpec {
  key: FrameKey;
  cssW: number;
  cssH: number;
  scale: number;
  boxW: number;
  boxH: number;
  bare: boolean;
  label: string;
}

function layoutFrames(
  device: DeviceKey,
  zoom: Zoom,
  paneW: number,
  paneH: number,
  responsiveDesktop: boolean,
  sizes: Record<FrameKey, DevicePreset>,
): FrameSpec[] {
  const z = zoom === "fit" ? null : parseFloat(zoom);
  // "Desktop · Fit to pane" fills the pane at its real width. Next to a design (compare), render a
  // true 1440 layout scaled down instead, so it matches the design's layout.
  if (device === "desktop" && z === null && responsiveDesktop && sizes.desktop.w === 0) {
    return [{ key: "desktop", cssW: paneW, cssH: paneH, scale: 1, boxW: paneW, boxH: paneH, bare: true, label: "Desktop" }];
  }
  // Space taken around frames: stage padding, the gap between frames, the gradient ring (1.5px each side) and the label.
  const GAP = 24;
  const RING = 3;
  const availH = Math.max(200, paneH - PAD * 2 - LABEL_H - RING - 8);
  const dim = (k: FrameKey) => {
    const p = sizes[k];
    return { w: p.w || FALLBACK_W[k], h: p.h, label: p.w ? p.label : LABEL[k] };
  };
  const spec = (k: FrameKey, scale: number, w: number, h: number, label: string): FrameSpec => {
    const cssH = h || availH / scale; // a real device height, or fill the pane
    return { key: k, cssW: w, cssH, scale, boxW: w * scale, boxH: cssH * scale, bare: false, label };
  };
  if (device === "split") {
    const m = dim("mobile");
    const dk = dim("desktop");
    const sM = z ?? Math.min(1, ((paneW - PAD * 2 - GAP) * 0.3) / m.w, m.h ? availH / m.h : 1);
    const sD = z ?? Math.max(0.15, Math.min(1, (paneW - m.w * sM - PAD * 2 - GAP - RING * 2 - 4) / dk.w, dk.h ? availH / dk.h : 1));
    return [spec("desktop", sD, dk.w, dk.h, dk.label), spec("mobile", sM, m.w, m.h, m.label)];
  }
  const x = dim(device);
  const sc = z ?? Math.min(1, (paneW - PAD * 2 - RING - 4) / x.w, x.h ? availH / x.h : 1);
  return [spec(device, sc, x.w, x.h, x.label)];
}

const PRIO = { urgent: 0, high: 1, medium: 2, low: 3 };

export function ReviewCanvas({
  project,
  initialIssues,
  initialIssueId,
  initialPage,
  members,
  me,
  guest,
  access,
}: {
  project: Project;
  initialIssues: Issue[];
  initialIssueId?: string;
  initialPage?: string;
  members: string[];
  /** The signed-in member's name (for reply permissions). Guests use their guest name. */
  me?: string;
  guest?: GuestCtx;
  /** The workspace's plan. Free: comment pins only (members), view only (guests). Omitted = everything. */
  access?: PlanAccess;
}) {
  const frameEls = useRef<Partial<Record<FrameKey, HTMLIFrameElement | null>>>({});
  const stageRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const designScrollRef = useRef<HTMLDivElement>(null);
  const designFileRef = useRef<HTMLInputElement>(null);
  const pendingTool = useRef<Tool>(null);

  const [pageUrl, setPageUrl] = useState(initialPage ?? initialIssues.find((i) => i.id === initialIssueId)?.pageUrl ?? project.baseUrl);
  const [urlInput, setUrlInput] = useState(pageUrl);
  const [reloadKey, setReloadKey] = useState(0);
  // Screenshot mode: frames show a server-captured image of the page (for sites that won't load live).
  const [shot, setShot] = useState(false);
  // No design yet and Google Drive is set up: ask where the design comes from.
  const [designChoice, setDesignChoice] = useState(false);
  // The live preview didn't come up in time (usually the site refuses to be framed): offer a screenshot.
  const [stuck, setStuck] = useState(false);
  const [ready, setReady] = useState<Set<FrameKey>>(new Set());
  const [mode, setMode] = useState<Mode>(guest && access && !access.pro ? "browse" : "comment");
  const [frozen, setFrozen] = useState(false);
  const [device, setDevice] = useState<DeviceKey>("desktop");
  const [zoom, setZoom] = useState<Zoom>("fit");
  const [tool, setTool] = useState<Tool>(null);
  const [opacity, setOpacity] = useState(0.5);
  const [blend, setBlend] = useState(false);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [designBusy, setDesignBusy] = useState(false);
  const [designErr, setDesignErr] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [selectedId, setSelectedId] = useState<string | null>(initialIssueId ?? null);
  /** Highlighted comment (card + pin) without opening the detail panel. */
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Placed | null>(null);
  const [inspect, setInspect] = useState<Placed | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [filters, setFiltersState] = useState<PanelFilters>({ q: "", sort: "newest", device: "all", showResolved: false, scope: "page" });
  const [panel, setPanel] = useState(true);
  /** Comment panel width (px), adjustable by dragging its left edge. */
  const [panelW, setPanelW] = useState(PANEL_DEFAULT);
  /** Split view: scrolling one frame scrolls the other to the same content. */
  const [syncScroll, setSyncScroll] = useState(true);
  /** Chosen device size per frame (preset id or "custom"), plus custom dimensions. */
  const [sizeIds, setSizeIds] = useState<Record<FrameKey, string>>(DEFAULT_SIZES);
  const [customSizes, setCustomSizes] = useState<CustomSizes>({});
  const [sizeMenu, setSizeMenu] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [pane, setPane] = useState({ w: 1000, h: 700 });
  const [stage, setStage] = useState({ w: 1000, h: 700 });
  const [shareOpen, setShareOpen] = useState(false);
  const [shareToken, setShareToken] = useState<string | undefined>(guest?.shareToken);
  useEffect(() => {
    if (guest) return;
    api.share(project.id).then((s) => setShareToken(s.token)).catch(() => {});
  }, [guest, project.id]);
  const confirmDialog = useConfirm();

  /* ───────── plan: Free gets comment pins and desktop/tablet/mobile views; inspect, freeze, custom sizes, split view, design tools and page QA are Pro ───────── */
  const pro = access?.pro ?? true;
  const viewOnly = !!guest && !pro;
  const commentLimit = access?.comments.limit ?? null;
  const [commentsUsed, setCommentsUsed] = useState(access?.comments.used ?? 0);
  const commentState = commentLimit === null ? "ok" : usageState(commentsUsed, commentLimit);
  const outOfComments = commentState === "full";
  const [upsell, setUpsell] = useState<Feature | "comments" | null>(null);

  const setFilters = useCallback((f: Partial<PanelFilters>) => setFiltersState((cur) => ({ ...cur, ...f })), []);

  /* ───────── view preferences survive a refresh (per project, per browser) ───────── */
  const prefsKey = `qasync-canvas:${project.id}`;
  const prefsLoaded = useRef(false);
  useLayoutEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(prefsKey) ?? "null") as {
        mode?: Mode; device?: DeviceKey; zoom?: Zoom; panel?: boolean; panelW?: number; syncScroll?: boolean; sizeIds?: Partial<Record<FrameKey, string>>; customSizes?: CustomSizes; filters?: Partial<PanelFilters>;
      } | null;
      if (saved) {
        if (saved.mode && ["browse", "comment", "inspect"].includes(saved.mode)) setMode(saved.mode);
        if (saved.device && ["desktop", "tablet", "mobile", "split"].includes(saved.device)) setDevice(saved.device);
        if (saved.zoom && ["fit", "0.5", "0.75", "1", "1.25"].includes(saved.zoom)) setZoom(saved.zoom);
        if (typeof saved.panel === "boolean") setPanel(saved.panel);
        if (typeof saved.panelW === "number") setPanelW(clampPanel(saved.panelW));
        if (typeof saved.syncScroll === "boolean") setSyncScroll(saved.syncScroll);
        if (saved.sizeIds) setSizeIds((cur) => ({ ...cur, ...saved.sizeIds }));
        if (saved.customSizes) setCustomSizes(saved.customSizes);
        if (saved.filters) setFiltersState((cur) => ({ ...cur, ...saved.filters, q: "" }));
      }
    } catch {
      /* storage unavailable: use defaults */
    }
    // On a phone the panel covers the whole page, so always open on the page itself.
    if (window.matchMedia("(max-width: 767px)").matches && !initialIssueId) setPanel(false);
    prefsLoaded.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once on load
  }, [prefsKey]);
  useEffect(() => {
    if (!prefsLoaded.current) return;
    try {
      const { sort, device: deviceFilter, showResolved, scope } = filters;
      localStorage.setItem(prefsKey, JSON.stringify({ mode, device, zoom, panel, panelW, syncScroll, sizeIds, customSizes, filters: { sort, device: deviceFilter, showResolved, scope } }));
    } catch {
      /* ignore */
    }
  }, [prefsKey, mode, device, zoom, panel, panelW, syncScroll, sizeIds, customSizes, filters]);

  // Saved view preferences may name Pro tools; on Free, fall back to what the plan includes.
  useEffect(() => {
    if (pro) return;
    if (mode === "inspect" || (viewOnly && mode === "comment")) setMode(viewOnly ? "browse" : "comment");
    if (device === "split") setDevice("desktop");
    if (tool) setTool(null);
    // Custom and alternative device sizes are Pro; Free uses the default size for each device.
    if ((Object.keys(DEFAULT_SIZES) as FrameKey[]).some((k) => sizeIds[k] !== DEFAULT_SIZES[k])) setSizeIds(DEFAULT_SIZES);
  }, [pro, viewOnly, mode, device, tool, sizeIds]);

  // Drag the panel's left edge. A full-screen shield keeps the iframes from swallowing the pointer.
  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = panelW;
    let moved = false;
    const move = (ev: PointerEvent) => {
      // Only raise the shield once the pointer really moves, so a double-click still reaches the handle.
      if (!moved && Math.abs(ev.clientX - startX) > 2) {
        moved = true;
        setResizing(true);
      }
      if (moved) setPanelW(clampPanel(startW + (startX - ev.clientX)));
    };
    const up = () => {
      setResizing(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  // Short hint when the mode changes (not on load), shown at the bottom so it never covers the site.
  const [hint, setHint] = useState<string | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashHint = (msg: string) => {
    setHint(msg);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(null), 2000);
  };
  const lastMode = useRef<Mode | null>(null);
  const hintReady = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => (hintReady.current = true), 800);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (lastMode.current === null || !hintReady.current) {
      lastMode.current = mode;
      return;
    }
    if (lastMode.current === mode) return;
    lastMode.current = mode;
    setHint(mode === "comment" ? "Comment mode · click any element" : mode === "inspect" ? "Inspect mode · hover to read specs, click to capture" : "Browse mode · links work normally");
    const t = setTimeout(() => setHint(null), 2200);
    return () => clearTimeout(t);
  }, [mode]);
  // Guests have no session cookie: their share token lets the proxy load this project's site.
  const proxySrc = `/api/proxy?url=${encodeURIComponent(pageUrl)}&r=${reloadKey}${shot ? "&shot=1" : ""}${guest ? `&s=${encodeURIComponent(guest.shareToken)}` : ""}`;
  const primary: FrameKey = device === "split" ? "desktop" : device;
  const sizes = useMemo(
    () => ({
      desktop: resolveSize("desktop", sizeIds.desktop, customSizes),
      tablet: resolveSize("tablet", sizeIds.tablet, customSizes),
      mobile: resolveSize("mobile", sizeIds.mobile, customSizes),
    }),
    [sizeIds, customSizes],
  );
  const frames = useMemo(() => layoutFrames(device, zoom, pane.w, pane.h, tool !== "compare", sizes), [device, zoom, pane.w, pane.h, tool, sizes]);
  const loading = frames.some((f) => !ready.has(f.key));
  // Switching between the full-pane frame and a scaled frame remounts the iframe: wait for it again.
  const frameSig = frames.map((f) => f.key + (f.bare ? ":bare" : "")).join("|");

  // Live-preview watchdog: if the main frame hasn't reported "ready" within 15 s, the site most
  // likely refused to be framed (or broke): offer screenshot mode, and log it for the admin Errors list.
  // A frame can also come up and then leave (some sites navigate themselves away when framed): every
  // frame load sends a "hello", and a load that gets no "ready" back within 4 s isn't our page.
  const readyAt = useRef<Partial<Record<FrameKey, number>>>({});
  const onFrameLoad = (k: FrameKey) => {
    const at = Date.now();
    sendTo(k, { type: "hello" });
    window.setTimeout(() => {
      if ((readyAt.current[k] ?? 0) < at && k === primaryRef.current) setStuck(true);
    }, 4000);
  };
  const primaryRef = useRef(primary);
  primaryRef.current = primary;
  const primaryReady = ready.has(primary);
  useEffect(() => {
    if (shot || primaryReady) {
      setStuck(false);
      return;
    }
    const t = window.setTimeout(() => setStuck(true), 15000);
    return () => window.clearTimeout(t);
  }, [proxySrc, frameSig, shot, primaryReady]);
  useEffect(() => {
    if (!stuck || guest) return;
    void fetch("/api/errors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "preview", message: "The live preview didn't load, or the site left the frame (it may refuse to be framed)", url: pageUrl }),
    }).catch(() => {});
  }, [stuck, guest, pageUrl]);
  const lastSig = useRef(frameSig);
  useEffect(() => {
    if (lastSig.current !== frameSig) {
      lastSig.current = frameSig;
      setReady(new Set());
    }
  }, [frameSig]);

  /* ───────── data ───────── */
  const reloadIssues = useCallback(async () => {
    try {
      setIssues(await api.issues(guest ? { shareToken: guest.shareToken } : { projectId: project.id }));
    } catch {
      /* keep current */
    }
  }, [guest, project.id]);

  useEffect(() => {
    const t = setInterval(reloadIssues, 4000);
    return () => clearInterval(t);
  }, [reloadIssues]);

  const reloadDesigns = useCallback(async () => {
    try {
      setDesigns(await api.designs(project.id, pageUrl, guest));
    } catch {
      setDesigns([]);
    }
  }, [project.id, pageUrl, guest]);

  useEffect(() => {
    reloadDesigns();
  }, [reloadDesigns]);

  useEffect(() => {
    const u = new URL(window.location.href);
    if (pageKey(pageUrl) === pageKey(project.baseUrl)) u.searchParams.delete("page");
    else u.searchParams.set("page", pageUrl);
    if (selectedId) u.searchParams.set("issue", selectedId);
    else u.searchParams.delete("issue");
    const next = u.pathname + (u.search ? u.search : "");
    if (next !== window.location.pathname + window.location.search) window.history.replaceState(null, "", next);
  }, [pageUrl, selectedId, project.baseUrl]);

  const designFor = useCallback((k: FrameKey) => designs.find((d) => d.device === k), [designs]);

  /* ───────── pages: every URL reviewed is tracked with its QA state ───────── */
  const [pages, setPages] = useState<Page[]>([]);
  const [showPages, setShowPages] = useState(false);
  const reloadPages = useCallback(async () => {
    try {
      setPages(await api.pages(project.id, guest));
    } catch {
      /* keep */
    }
  }, [project.id, guest]);
  useEffect(() => {
    reloadPages();
    const t = setInterval(reloadPages, 6000);
    return () => clearInterval(t);
  }, [reloadPages]);

  // Record a visit (with the page's real title) once the page has loaded.
  const visited = useRef<string | null>(null);
  const registerVisit = useCallback(
    async (title?: string) => {
      const k = pageKey(pageUrl);
      if (visited.current === k) return;
      visited.current = k;
      try {
        setPages(await api.addPage(project.id, pageUrl, { title, visited: true }, guest));
      } catch {
        visited.current = null;
      }
    },
    [pageUrl, project.id, guest],
  );

  // Issue counts and state are derived from live issues so tabs update the moment something changes.
  const livePages = useMemo(() => {
    const stats = new Map<string, { total: number; open: number; resolved: number }>();
    for (const i of issues) {
      const k = pageKey(i.pageUrl);
      const s = stats.get(k) ?? { total: 0, open: 0, resolved: 0 };
      s.total++;
      if (OPEN_STATUSES.includes(i.status)) s.open++;
      else if (i.status !== "wont_fix") s.resolved++;
      stats.set(k, s);
    }
    const list: Page[] = pages.map((p) => {
      const s = stats.get(p.key) ?? { total: 0, open: 0, resolved: 0 };
      return { ...p, ...s, state: pageState(p.qaStatus, s.total, s.open) };
    });
    const cur = pageKey(pageUrl);
    if (!list.some((p) => p.key === cur)) {
      const s = stats.get(cur) ?? { total: 0, open: 0, resolved: 0 };
      list.push({
        id: "__current", projectId: project.id, url: pageUrl, key: cur, title: null, qaStatus: "pending", qaBy: null, qaAt: null,
        createdAt: new Date().toISOString(), lastVisitedAt: null, ...s, state: pageState("pending", s.total, s.open),
      });
    }
    return list;
  }, [pages, issues, pageUrl, project.id]);

  /* ───────── filtering ───────── */
  const q = filters.q.trim().toLowerCase();
  const matchQ = useCallback(
    (i: Issue) => !q || i.title.toLowerCase().includes(q) || i.body.toLowerCase().includes(q) || `#${i.number}` === q || String(i.number) === q,
    [q],
  );
  const matchRes = useCallback((i: Issue) => filters.showResolved || !["verified", "wont_fix"].includes(i.status), [filters.showResolved]);
  const matchDev = useCallback((i: Issue) => filters.device === "all" || i.device === filters.device, [filters.device]);

  const pageIssues = useMemo(() => issues.filter((i) => pageKey(i.pageUrl) === pageKey(pageUrl)), [issues, pageUrl]);
  const scopeBase = filters.scope === "page" ? pageIssues : issues;

  const list = useMemo(() => {
    const xs = scopeBase.filter((i) => matchQ(i) && matchRes(i) && matchDev(i));
    const by = filters.sort;
    return xs.sort((a, b) =>
      by === "oldest" ? a.createdAt.localeCompare(b.createdAt)
      : by === "priority" ? PRIO[a.priority] - PRIO[b.priority] || b.createdAt.localeCompare(a.createdAt)
      : by === "number" ? a.number - b.number
      : b.createdAt.localeCompare(a.createdAt),
    );
  }, [scopeBase, matchQ, matchRes, matchDev, filters.sort]);

  const deviceCounts = useMemo(() => {
    const base = scopeBase.filter((i) => matchQ(i) && matchRes(i));
    const c: Record<DeviceFilter, number> = { all: base.length, desktop: 0, tablet: 0, mobile: 0 };
    for (const i of base) if (i.device in c) c[i.device as DeviceFilter]++;
    return c;
  }, [scopeBase, matchQ, matchRes]);

  const pinIssues = useMemo(() => pageIssues.filter((i) => matchQ(i) && matchRes(i) && matchDev(i)), [pageIssues, matchQ, matchRes, matchDev]);

  /* ───────── messaging ───────── */
  const post = (f: HTMLIFrameElement | null | undefined, msg: Record<string, unknown>) =>
    f?.contentWindow?.postMessage({ source: "qasync-host", ...msg }, "*");
  const sendAll = useCallback((msg: Record<string, unknown>) => Object.values(frameEls.current).forEach((f) => post(f, msg)), []);
  const sendTo = useCallback((k: FrameKey, msg: Record<string, unknown>) => post(frameEls.current[k], msg), []);

  const pinsMsg = useMemo(() => {
    const pins: Record<string, unknown>[] = pinIssues.map((i) => ({ id: i.id, number: i.number, selector: i.selector, xPct: i.xPct, yPct: i.yPct, status: i.status, color: issueColor(i), textColor: issueTextColor(i) }));
    if (draft) pins.push({ id: "__new", number: "+", selector: draft.selector, xPct: draft.xPct, yPct: draft.yPct, status: "open" });
    return { type: "pins", pins, selectedId: draft ? "__new" : selectedId ?? focusedId };
  }, [pinIssues, draft, selectedId, focusedId]);

  const overlayMsg = useCallback(
    (k: FrameKey) => {
      const d = designFor(k);
      return { type: "overlay", on: tool === "overlay" && !!d, src: d ? window.location.origin + d.url : null, opacity, blend };
    },
    [designFor, tool, opacity, blend],
  );

  useEffect(() => sendAll(pinsMsg), [pinsMsg, sendAll]);
  useEffect(() => sendAll({ type: "mode", mode }), [mode, sendAll]);
  useEffect(() => frames.forEach((f) => sendTo(f.key, overlayMsg(f.key))), [frames, overlayMsg, sendTo]);

  // Latest values for the (single) message listener.
  const latest = useRef({ mode, pinsMsg, overlayMsg, selectedId, focusedId, primary, frames, registerVisit, device, syncScroll, outOfComments });
  latest.current = { mode, pinsMsg, overlayMsg, selectedId, focusedId, primary, frames, registerVisit, device, syncScroll, outOfComments };

  const placeFromFrame = useCallback((k: FrameKey, p: Pick): Placed => {
    const f = frameEls.current[k];
    const st = stageRef.current;
    if (!f || !st) return { ...p, frame: k, x: 40, y: 40 };
    const r = f.getBoundingClientRect();
    const sr = st.getBoundingClientRect();
    const s = r.width / (f.offsetWidth || r.width);
    return { ...p, frame: k, x: r.left - sr.left + p.cx * s, y: r.top - sr.top + p.cy * s };
  }, []);

  const changeMode = useCallback(
    (m: Mode) => {
      if (m === "inspect" && !pro) return setUpsell("inspect");
      if (m === "comment" && viewOnly) return setUpsell("guests");
      setMode(m);
      if (m !== "inspect") setInspect(null);
    },
    [pro, viewOnly],
  );
  const toggleFreeze = useCallback(() => (pro ? sendAll({ type: "freeze", on: !frozen }) : setUpsell("freeze")), [pro, sendAll, frozen]);

  const resetFrames = useCallback(() => {
    setReady(new Set());
    setDraft(null);
  }, []);

  const navigate = useCallback(
    (u: string) => {
      let rel = u;
      try {
        const url = new URL(u, window.location.origin);
        rel = url.origin === window.location.origin ? url.pathname + url.search : url.toString();
      } catch {
        /* keep */
      }
      resetFrames();
      setSelectedId(null);
      setPageUrl(rel);
      setUrlInput(rel);
    },
    [resetFrames],
  );

  const selectIssue = useCallback(
    (id: string | null, focus = true) => {
      setDraft(null);
      setInspect(null);
      setSelectedId(id);
      setPanel(true);
      if (!id) return;
      const issue = issues.find((i) => i.id === id);
      if (issue && pageKey(issue.pageUrl) !== pageKey(pageUrl)) {
        navigate(issue.pageUrl);
        setSelectedId(id);
        return;
      }
      if (focus) sendAll({ type: "focus", id });
    },
    [issues, pageUrl, navigate, sendAll],
  );

  const locateIssue = useCallback(
    (id: string) => {
      setDraft(null);
      setInspect(null);
      setFocusedId(id);
      setPanel(true);
      const issue = issues.find((i) => i.id === id);
      if (issue && pageKey(issue.pageUrl) !== pageKey(pageUrl)) {
        navigate(issue.pageUrl);
        setFocusedId(id);
        return;
      }
      sendAll({ type: "focus", id });
    },
    [issues, pageUrl, navigate, sendAll],
  );

  const stepIssue = useCallback(
    (dir: 1 | -1) => {
      if (!list.length) return;
      const cur = selectedId ?? focusedId;
      const idx = list.findIndex((i) => i.id === cur);
      const next = list[(idx + dir + list.length) % list.length].id;
      if (selectedId) selectIssue(next);
      else locateIssue(next);
    },
    [list, selectedId, focusedId, selectIssue, locateIssue],
  );

  const cancelDraft = useCallback(() => {
    setDraft(null);
    sendAll({ type: "clear" });
  }, [sendAll]);

  const handleKey = useCallback(
    (k: string) => {
      if (k === "c") changeMode("comment");
      else if (k === "i") changeMode("inspect");
      else if (k === "b") changeMode("browse");
      else if (k === "f") toggleFreeze();
      else if (k === "j") stepIssue(1);
      else if (k === "k") stepIssue(-1);
      else if (k === "escape") {
        if (draft) cancelDraft();
        else if (selectedId) setSelectedId(null);
        else if (focusedId) setFocusedId(null);
        else setInspect(null);
      }
    },
    [changeMode, toggleFreeze, stepIssue, draft, selectedId, focusedId, cancelDraft],
  );
  const keyRef = useRef(handleKey);
  keyRef.current = handleKey;
  const selectRef = useRef(selectIssue);
  selectRef.current = selectIssue;
  const locateRef = useRef(locateIssue);
  locateRef.current = locateIssue;
  const navRef = useRef(navigate);
  navRef.current = navigate;

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const k = (Object.entries(frameEls.current) as [FrameKey, HTMLIFrameElement | null][]).find(([, f]) => f?.contentWindow === e.source)?.[0];
      if (!k) return;
      const m = e.data as { source?: string; type: string; [x: string]: unknown };
      if (m?.source !== "qasync") return;
      const L = latest.current;
      switch (m.type) {
        case "ready":
          readyAt.current[k] = Date.now();
          setReady((prev) => (prev.has(k) ? prev : new Set(prev).add(k)));
          sendTo(k, { type: "mode", mode: L.mode });
          sendTo(k, L.pinsMsg);
          sendTo(k, L.overlayMsg(k));
          if (L.selectedId || L.focusedId) setTimeout(() => sendTo(k, { type: "focus", id: L.selectedId ?? L.focusedId }), 300);
          if (k === L.primary) L.registerVisit(typeof m.title === "string" ? m.title : undefined);
          break;
        case "pick":
          setInspect(null);
          setSelectedId(null);
          if (L.outOfComments) {
            sendTo(k, { type: "clear" });
            setUpsell("comments");
            break;
          }
          setDraft(placeFromFrame(k, m.data as Pick));
          break;
        case "inspect":
          setSelectedId(null);
          setInspect(placeFromFrame(k, m.data as Pick));
          setPanel(true);
          break;
        case "pin-click":
          if (m.id !== "__new") {
            if (L.selectedId) selectRef.current(m.id as string, false);
            else locateRef.current(m.id as string);
          }
          break;
        case "navigate":
          navRef.current(m.url as string);
          break;
        case "freeze-changed":
          setFrozen(!!m.on);
          break;
        case "key":
          keyRef.current(m.key as string);
          break;
        case "scroll": {
          // split view: bring the other frame to the same content
          if (L.device === "split" && L.syncScroll) {
            const other: FrameKey = k === "desktop" ? "mobile" : "desktop";
            const docH = m.docH as number;
            const vh = (m.vh as number) || 0;
            sendTo(other, { type: "scroll-sync", anchor: m.anchor ?? null, ratio: docH > vh ? (m.y as number) / (docH - vh) : 0 });
          }
          // keep the side-by-side design in step with the live page
          const el = designScrollRef.current;
          if (el && k === L.primary && typeof m.vw === "number" && m.vw > 0) {
            el.scrollTop = ((m.y as number) * el.clientWidth) / (m.vw as number);
          }
          break;
        }
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [placeFromFrame, sendTo]);

  /* handshake: frames may announce "ready" before we listen, so keep asking the ones that haven't answered */
  useEffect(() => {
    if (!loading) return;
    const hello = () => frames.forEach((f) => !ready.has(f.key) && sendTo(f.key, { type: "hello" }));
    hello();
    const t = setInterval(hello, 400);
    const giveUp = setTimeout(() => setReady(new Set(frames.map((f) => f.key))), 15000);
    return () => {
      clearInterval(t);
      clearTimeout(giveUp);
    };
  }, [loading, frames, ready, sendTo]);

  /* host-page keyboard shortcuts */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (["c", "i", "b", "f", "j", "k", "escape"].includes(k)) {
        e.preventDefault();
        keyRef.current(k);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* sizes */
  useEffect(() => {
    const obs: ResizeObserver[] = [];
    const watch = (el: HTMLElement | null, set: (s: { w: number; h: number }) => void) => {
      if (!el) return;
      const ro = new ResizeObserver(([e]) => set({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
      ro.observe(el);
      obs.push(ro);
    };
    watch(paneRef.current, setPane);
    watch(stageRef.current, setStage);
    return () => obs.forEach((o) => o.disconnect());
  }, [tool]);

  /* ───────── actions ───────── */
  function chooseDevice(d: DeviceKey) {
    if (d === device) return;
    // Free has desktop, tablet and mobile at their default sizes; split view is Pro.
    if (!pro && d === "split") return setUpsell("devices");
    if (d === "split" && tool === "compare") setTool(null);
    resetFrames();
    setDevice(d);
  }

  /** Pick a new design image for this page and device; the current tool stays open. */
  function replaceDesign(t: Exclude<Tool, null>) {
    pendingTool.current = t;
    designFileRef.current?.click();
  }

  function chooseTool(t: Exclude<Tool, null>) {
    if (!pro) return setUpsell("overlay");
    setDesignErr(null);
    if (tool === t) return setTool(null);
    if (!designFor(primary)) {
      if (guest) return setDesignErr("No design reference has been added for this page yet.");
      pendingTool.current = t;
      // With Google Drive set up, offer both sources; otherwise go straight to the file dialog.
      if (googlePickerReady()) setDesignChoice(true);
      else designFileRef.current?.click();
      return;
    }
    if (t === "compare" && device === "split") chooseDevice("desktop");
    setTool(t);
  }

  async function uploadDesign(file: File) {
    setDesignBusy(true);
    setDesignErr(null);
    try {
      const up = await api.upload(file, file.name);
      await api.addDesign({ projectId: project.id, pageUrl, device: primary, uploadId: up.id });
      await reloadDesigns();
      const t = pendingTool.current ?? tool ?? "overlay";
      pendingTool.current = null;
      if (t === "compare" && device === "split") chooseDevice("desktop");
      setTool(t);
    } catch (e) {
      setDesignErr((e as Error).message);
    } finally {
      setDesignBusy(false);
    }
  }

  /** Pick a design image in Google Drive (only that file is shared with QASync) and use it like an upload. */
  async function designFromDrive() {
    setDesignErr(null);
    try {
      const doc = await pickDriveImage();
      if (!doc) return;
      setDesignBusy(true);
      await uploadDesign(await downloadDriveFile(doc));
    } catch (e) {
      setDesignErr((e as Error).message);
      setDesignBusy(false);
    }
  }

  async function removeDesign() {
    const d = designFor(primary);
    if (!d) return;
    const yes = await confirmDialog({
      title: "Remove this design?",
      message: `The ${LABEL[primary].toLowerCase()} design image for this page will be removed. Comments are not affected.`,
      confirmLabel: "Remove design",
    });
    if (!yes) return;
    await api.deleteDesign(d.id);
    await reloadDesigns();
    setTool(null);
  }

  async function submitDraft(b: ComposerSubmit) {
    if (!draft) return;
    const created = await api.createIssue(
      {
        projectId: project.id,
        pageUrl,
        body: b.text,
        priority: b.priority,
        assignee: b.assignee,
        attachments: b.attachments.map((a) => ({ id: a.id })),
        selector: draft.selector,
        xPct: draft.xPct,
        yPct: draft.yPct,
        viewportW: draft.viewportW,
        device: draft.frame,
        element: draft.element,
        env: draft.env,
      },
      guest,
    );
    setIssues((xs) => [created, ...xs]);
    setCommentsUsed((n) => n + 1);
    setDraft(null);
    setFocusedId(created.id);
    setPanel(true);
  }

  /** Change one issue from its card menu. */
  async function patchIssue(i: Issue, patch: { status?: Issue["status"]; priority?: Issue["priority"]; assignee?: string | null }) {
    const u = await api.updateIssue(i.id, patch, guest);
    setIssues((xs) => xs.map((x) => (x.id === u.id ? { ...x, ...u } : x)));
  }

  /** Apply one change to several issues (members only). */
  async function bulkUpdate(ids: string[], patch: { status?: Issue["status"]; priority?: Issue["priority"]; assignee?: string | null }) {
    const results = await Promise.allSettled(ids.map((id) => api.updateIssue(id, patch)));
    const updated = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    setIssues((xs) => xs.map((x) => ({ ...x, ...(updated.find((u) => u.id === x.id) ?? {}) })));
    const failed = results.length - updated.length;
    if (failed) alert(`${failed} of ${results.length} couldn't be updated.`);
  }

  async function bulkDelete(ids: string[]): Promise<boolean> {
    const n = ids.length;
    const yes = await confirmDialog({
      title: `Delete ${n} comment${n === 1 ? "" : "s"}?`,
      message: `The selected comment${n === 1 ? "" : "s"} and all of their replies will be permanently deleted. This can't be undone.`,
      confirmLabel: `Delete ${n}`,
    });
    if (!yes) return false;
    const results = await Promise.allSettled(ids.map((id) => api.deleteIssue(id)));
    const gone = ids.filter((_, k) => results[k].status === "fulfilled");
    setIssues((xs) => xs.filter((x) => !gone.includes(x.id)));
    if (selectedId && gone.includes(selectedId)) setSelectedId(null);
    if (gone.length < n) alert(`${n - gone.length} couldn't be deleted.`);
    return true;
  }

  /** Members can edit or delete any comment; guests only the ones they wrote. */
  function canEditIssue(i: Issue) {
    if (!guest) return true;
    return i.reporterType === "guest" && i.reporterName === guest.guestName;
  }

  async function editIssueText(i: Issue, text: string) {
    const u = await api.updateIssue(i.id, { body: text, retitle: true }, guest);
    setIssues((xs) => xs.map((x) => (x.id === u.id ? { ...x, ...u } : x)));
  }

  async function deleteIssueAsk(i: Issue) {
    const yes = await confirmDialog({
      title: `Delete comment #${i.number}?`,
      message: (
        <>
          “{i.title}” and its {i.commentCount ? `${i.commentCount} repl${i.commentCount === 1 ? "y" : "ies"}` : "thread"} will be permanently deleted. This can&apos;t be undone.
        </>
      ),
      confirmLabel: "Delete comment",
    });
    if (!yes) return;
    try {
      await api.deleteIssue(i.id, guest);
      setIssues((xs) => xs.filter((x) => x.id !== i.id));
      if (selectedId === i.id) setSelectedId(null);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function toggleDone(i: Issue) {
    const status = DONE.includes(i.status) ? "open" : "fixed";
    setIssues((xs) => xs.map((x) => (x.id === i.id ? { ...x, status } : x)));
    try {
      const u = await api.updateIssue(i.id, { status }, guest);
      setIssues((xs) => xs.map((x) => (x.id === u.id ? { ...x, ...u } : x)));
    } catch (e) {
      alert((e as Error).message);
      reloadIssues();
    }
  }



  const primaryDesign = designFor(primary);
  const doneCount = issues.filter((i) => DONE.includes(i.status)).length;

  return (
    <div className="flex h-dvh flex-col bg-paper">
      {/* ───────── toolbar ───────── */}
      <div className="flex h-14 shrink-0 items-center gap-1.5 border-b border-line bg-surface px-2 sm:gap-2 sm:px-3">
        {guest ? (
          <span className="flex items-center gap-2 pr-1 font-semibold">
            <LogoMark /> <span className="hidden max-w-[160px] truncate lg:inline">{project.name}</span>
          </span>
        ) : (
          <Link href={`/app/projects/${project.id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink" title="Back to project">
            <ArrowLeft size={16} />
            <span className="hidden max-w-[160px] truncate font-medium text-ink 2xl:inline">{project.name}</span>
          </Link>
        )}

        <form
          className="flex min-w-0 max-w-[520px] flex-1 items-center gap-1 rounded-lg border border-line bg-paper px-2 sm:min-w-40 xl:min-w-55"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(urlInput);
          }}
        >
          {loading ? <Loader2 size={14} className="shrink-0 animate-spin text-ink-3" /> : <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--st-verified)]" />}
          <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className="h-8 min-w-0 flex-1 bg-transparent font-mono text-[12px] text-ink-2 outline-none" aria-label="Page URL" />
          <button type="button" onClick={() => { resetFrames(); setReloadKey((k) => k + 1); }} className="rounded-md p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink" title="Reload the page" aria-label="Reload the page">
            <RefreshCw size={13} />
          </button>
          <button
            type="button"
            onClick={() => {
              resetFrames();
              setStuck(false);
              setShot((v) => !v);
            }}
            aria-pressed={shot}
            className={cn("rounded-md p-1.5 transition", shot ? "bg-blue-soft text-blue" : "text-ink-3 hover:bg-surface-2 hover:text-ink")}
            title={shot ? "Screenshot mode is on: showing a captured image. Click for the live page." : "Screenshot mode: show a captured image instead of the live page (for sites that won't load here)"}
            aria-label="Screenshot mode"
          >
            <Camera size={13} />
          </button>
        </form>

        {/* devices + zoom */}
        <div className="ml-auto hidden items-center gap-1 rounded-xl border border-line bg-paper p-1 md:flex">
          <DevBtn active={device === "desktop"} onClick={() => chooseDevice("desktop")} title="Desktop"><Monitor size={16} /></DevBtn>
          <DevBtn active={device === "tablet"} onClick={() => chooseDevice("tablet")} title="Tablet · 768"><Tablet size={16} /></DevBtn>
          <DevBtn active={device === "mobile"} onClick={() => chooseDevice("mobile")} title="Mobile · 390"><Smartphone size={16} /></DevBtn>
          <DevBtn active={device === "split"} locked={!pro} onClick={() => chooseDevice("split")} title="Split view: desktop + mobile"><MonitorSmartphone size={16} /></DevBtn>
          {pro && <SizeMenu
            open={sizeMenu}
            setOpen={setSizeMenu}
            keys={device === "split" ? ["desktop", "mobile"] : [device as FrameKey]}
            sizes={sizes}
            sizeIds={sizeIds}
            customSizes={customSizes}
            onPick={(k, id) => setSizeIds((cur) => ({ ...cur, [k]: id }))}
            onCustom={(k, w, h) => {
              setCustomSizes((cur) => ({ ...cur, [k]: { w, h } }));
              setSizeIds((cur) => ({ ...cur, [k]: "custom" }));
            }}
          />}
          <select
            value={zoom}
            onChange={(e) => setZoom(e.target.value as Zoom)}
            className="ml-1 hidden h-8 rounded-lg border border-line bg-surface pl-2.5 pr-1 text-[13px] text-ink outline-none lg:block"
            aria-label="Zoom"
          >
            <option value="fit">Fit to pane</option>
            <option value="0.5">50%</option>
            <option value="0.75">75%</option>
            <option value="1">100%</option>
            <option value="1.25">125%</option>
          </select>
          {device === "split" && (
            <button
              onClick={() => {
                const next = !syncScroll;
                setSyncScroll(next);
                flashHint(next ? "Scroll sync on · desktop and mobile move together" : "Scroll sync off");
              }}
              aria-pressed={syncScroll}
              title={syncScroll ? "Scroll sync is on: scrolling one view scrolls the other" : "Scroll sync is off"}
              className={cn(
                "ml-1 flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-medium transition",
                syncScroll ? "border-blue bg-blue-soft text-blue" : "border-line bg-surface text-ink-3 hover:text-ink",
              )}
            >
              <ArrowDownUp size={14} />
              Sync scroll
            </button>
          )}
        </div>

        {/* design tools */}
        <div className="hidden items-center gap-1 rounded-xl border border-line bg-paper p-1 lg:flex">
          <DevBtn active={tool === "compare"} locked={!pro} onClick={() => chooseTool("compare")} title="Compare: design beside the live page"><Columns2 size={16} /></DevBtn>
          <DevBtn active={tool === "overlay"} locked={!pro} onClick={() => chooseTool("overlay")} title="Overlay the design on the page"><Layers size={16} /></DevBtn>
        </div>

        {/* modes */}
        <div className="flex shrink-0 items-center rounded-xl border border-line bg-paper p-1">
          <ModeBtn active={mode === "browse"} onClick={() => changeMode("browse")} icon={<MousePointer2 size={15} />} label="Browse" k="B" />
          <ModeBtn active={mode === "comment"} locked={viewOnly} onClick={() => changeMode("comment")} icon={<MessageSquarePlus size={15} />} label="Comment" k="C" />
          <ModeBtn active={mode === "inspect"} locked={!pro} onClick={() => changeMode("inspect")} icon={<ScanSearch size={15} />} label="Inspect" k="I" />
        </div>
        <button
          onClick={toggleFreeze}
          title={pro ? "Freeze hover states (F)" : "Freeze hover states · Pro"}
          className={cn("relative hidden rounded-lg border p-2 lg:block", frozen ? "border-blue bg-blue-soft text-blue" : "border-line bg-paper text-ink-3 hover:text-ink")}
        >
          <Snowflake size={15} />
          {!pro && <LockDot />}
        </button>
        {!guest && (
          <button
            onClick={() => setAuditOpen(true)}
            onPointerEnter={() => prefetchAudit(project.id, pageUrl)}
            onFocus={() => prefetchAudit(project.id, pageUrl)}
            title="SEO audit report for this page"
            aria-label="SEO audit report for this page"
            className={cn("hidden rounded-lg border p-2 sm:block", auditOpen ? "border-blue bg-blue-soft text-blue" : "border-line bg-paper text-ink-3 hover:text-ink")}
          >
            <Gauge size={15} />
          </button>
        )}

        {!guest && (
          <>

          </>
        )}
        <div className="relative shrink-0">
          <Button size="sm" onClick={() => setShareOpen((o) => !o)} className="h-9 max-sm:px-2.5" aria-expanded={shareOpen}>
            <Link2 size={14} />
            <span className="hidden sm:inline">Share</span>
          </Button>
          {shareOpen && (
            <SharePopover
              projectId={project.id}
              pageUrl={pageUrl}
              pageName={pageLabel({ url: pageUrl })}
              selectedIssue={(() => {
                const i = issues.find((x) => x.id === selectedId);
                return i ? { id: i.id, number: i.number } : null;
              })()}
              guestToken={guest?.shareToken}
              presetToken={shareToken}
              onClose={() => setShareOpen(false)}
            />
          )}
        </div>
        <button onClick={() => setPanel((p) => !p)} className="shrink-0 rounded-lg p-2 text-ink-3 hover:text-ink" title="Toggle panel" aria-label="Toggle comments panel" aria-pressed={panel}>
          {panel ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}
        </button>
        <input
          ref={designFileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadDesign(f);
            else pendingTool.current = null;
            e.target.value = "";
          }}
        />
      </div>

      {/* ───────── page tabs: which URLs are being QA'd, and their state ───────── */}
      {pro && <PageTabs
        pages={livePages}
        currentKey={pageKey(pageUrl)}
        onSelect={(p) => p.key !== pageKey(pageUrl) && navigate(p.url)}
        canAdd={!guest}
        onOverview={() => setShowPages(true)}
        onAdd={async (url) => {
          const before = new Set(pages.map((p) => p.key));
          const next = await api.addPage(project.id, url);
          setPages(next);
          const added = next.find((p) => !before.has(p.key));
          if (added) navigate(added.url);
        }}
        onSignOff={async (p, done) => {
          if (p.id === "__current") return;
          try {
            setPages(await api.setPageQa(p.id, done ? "done" : "pending", guest));
          } catch (e) {
            alert((e as Error).message);
          }
        }}
      />}

      {!guest && commentLimit !== null && commentState !== "ok" && (
        <div
          role="status"
          className={cn(
            "flex min-h-9 shrink-0 flex-wrap items-center justify-center gap-x-2 border-b px-3 py-1.5 text-center text-[12.5px]",
            outOfComments ? "border-danger/25 bg-danger-soft text-ink" : "border-[var(--st-progress)]/25 bg-[color-mix(in_srgb,var(--st-progress)_10%,transparent)] text-ink-2",
          )}
        >
          <span>
            {outOfComments
              ? `You've used all ${commentLimit} comments on the Free plan. New comments and replies are paused.`
              : `Heads up: ${Math.max(0, commentLimit - commentsUsed)} of ${commentLimit} free comments left.`}
          </span>
          <a href="/pricing" target="_blank" rel="noreferrer" className="font-semibold text-brand-ink hover:underline">
            Upgrade to Pro
          </a>
        </div>
      )}
      {viewOnly && (
        <div role="status" className="flex h-9 shrink-0 items-center justify-center border-b border-line bg-surface-2 px-3 text-[12.5px] text-ink-2">
          View only: you can browse the page and read comments, but commenting is turned off for this review.
        </div>
      )}

      {resizing && <div className="fixed inset-0 z-[60] cursor-col-resize select-none" />}

      {showPages && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 pt-[6vh] backdrop-blur-sm" onClick={() => setShowPages(false)}>
          <div className="w-full max-w-5xl rounded-2xl border border-line bg-paper p-5 shadow-2" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Pages · {project.name}</h2>
                <p className="text-[13px] text-ink-3">Every page in this review, with its issues and QA sign-off.</p>
              </div>
              <button onClick={() => setShowPages(false)} className="rounded-md px-2 py-1 text-sm text-ink-3 hover:text-ink">
                Close
              </button>
            </div>
            <PagesOverview
              projectId={project.id}
              initial={livePages.filter((p) => p.id !== "__current")}
              guest={guest}
              currentKey={pageKey(pageUrl)}
              onOpen={(p) => {
                setShowPages(false);
                if (p.key !== pageKey(pageUrl)) navigate(p.url);
              }}
            />
          </div>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1">
        {/* ───────── stage ───────── */}
        <div ref={stageRef} className="relative flex min-w-0 flex-1">
          {designChoice && (
            <div role="dialog" aria-label="Add a design" className="animate-pop absolute left-1/2 top-4 z-30 w-[min(460px,calc(100%-32px))] -translate-x-1/2 rounded-xl border border-line bg-surface p-4 text-[13px] shadow-2">
              <div className="flex items-start gap-3">
                <ImagePlus size={16} className="mt-0.5 shrink-0 text-blue" />
                <p className="min-w-0 flex-1 text-ink-2">
                  <span className="font-medium text-ink">Add the {LABEL[primary].toLowerCase()} design for this page.</span> Use a PNG exported at the page&apos;s width.
                </p>
              </div>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button size="sm" onClick={() => (setDesignChoice(false), designFileRef.current?.click())}>
                  Upload image
                </Button>
                <Button size="sm" variant="secondary" onClick={() => (setDesignChoice(false), designFromDrive())}>
                  <IntegrationIcon name="Google Drive" size={14} /> From Google Drive
                </Button>
                <Button size="sm" variant="ghost" onClick={() => ((pendingTool.current = null), setDesignChoice(false))}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {stuck && !shot && (
            <div role="alert" className="animate-pop absolute left-1/2 top-4 z-30 flex w-[min(560px,calc(100%-32px))] -translate-x-1/2 flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-[13px] shadow-2">
              <Camera size={16} className="shrink-0 text-blue" />
              <p className="min-w-0 flex-1 text-ink-2">
                <span className="font-medium text-ink">This page didn&apos;t load in the live preview.</span> Some sites refuse to be shown inside other apps.
              </p>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    resetFrames();
                    setStuck(false);
                    setShot(true);
                  }}
                >
                  View as a screenshot
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setStuck(false)}>
                  Keep waiting
                </Button>
              </div>
            </div>
          )}
          {tool === "compare" && (
            <div className="flex w-1/2 min-w-0 flex-col border-r border-line-strong bg-surface-2">
              <div className="flex h-9 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 text-[12px]">
                <span className="font-mono uppercase tracking-widest text-ink-3">Design</span>
                <span className="text-ink-2">{LABEL[primary]}</span>
                <span className="ml-auto text-ink-3">scrolls with the page</span>
                {!guest && primaryDesign && (
                  <>
                    <button onClick={() => replaceDesign("compare")} title="Replace design image" aria-label="Replace design image" className="rounded p-1 text-ink-3 hover:text-ink">
                      {designBusy ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
                    </button>
                    <button onClick={removeDesign} title="Remove design" className="rounded p-1 text-ink-3 hover:text-danger">
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
              <div ref={designScrollRef} className="min-h-0 flex-1 overflow-y-auto">
                {primaryDesign ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={primaryDesign.url} alt={`${LABEL[primary]} design`} className="block w-full" />
                ) : (
                  <DesignDrop onPick={() => designFileRef.current?.click()} onDrive={googlePickerReady() ? designFromDrive : undefined} guest={!!guest} device={LABEL[primary]} />
                )}
              </div>
            </div>
          )}

          <div ref={paneRef} className={cn("relative min-w-0 flex-1", frames[0]?.bare ? "overflow-hidden" : "stage-wash overflow-auto")}>
            {frames[0]?.bare ? (
              <iframe
                key={`desktop-${proxySrc}`}
                ref={(el) => {
                  frameEls.current = { desktop: el };
                }}
                src={proxySrc}
                title="Page under review"
                sandbox="allow-scripts allow-forms allow-popups"
                className="absolute inset-0 h-full w-full border-0 bg-white"
                onLoad={() => onFrameLoad("desktop")}
              />
            ) : (
              <div className="mx-auto flex w-max items-start gap-6 p-5">
                {frames.map((f) => (
                  <div key={f.key}>
                    <div className="device-ring">
                    <div className="relative overflow-hidden rounded-[12px] bg-white" style={{ width: f.boxW, height: f.boxH }}>
                      <iframe
                        key={`${f.key}-${proxySrc}`}
                        ref={(el) => {
                          if (el) frameEls.current[f.key] = el;
                          else delete frameEls.current[f.key];
                        }}
                        src={proxySrc}
                        title={`${LABEL[f.key]} view`}
                        sandbox="allow-scripts allow-forms allow-popups"
                        className="absolute left-0 top-0 origin-top-left border-0 bg-white"
                        style={{ width: f.cssW, height: f.cssH, transform: `scale(${f.scale})` }}
                        onLoad={() => onFrameLoad(f.key)}
                      />
                    </div>
                    </div>
                    <div className="mt-2 text-center font-mono text-[11px] text-ink-3">
                      {f.label} <span className="text-ink-2">{f.cssW} × {Math.round(f.cssH)}</span> · {Math.round(f.scale * 100)}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {frames[0]?.bare && (
            <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-ink/70 px-2.5 py-0.5 font-mono text-[11px] text-paper">
              Desktop {pane.w} × {pane.h}
            </div>
          )}

          {hint && (
            <div
              className="pointer-events-none absolute bottom-9 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink/80 px-3 py-1 text-[12px] text-paper shadow-1"
              style={{ left: tool === "compare" ? "75%" : "50%" }}
              role="status"
            >
              {hint}
            </div>
          )}

          {upsell && <Upsell what={upsell} guest={!!guest} limit={commentLimit} onClose={() => setUpsell(null)} />}

          {/* overlay controls */}
          {tool === "overlay" && (
            <div className="absolute bottom-10 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2 text-[12.5px] shadow-2">
              {primaryDesign ? (
                <>
                  <Layers size={14} className="text-blue" />
                  <span className="text-ink-2">Opacity</span>
                  <input type="range" min={0} max={100} value={Math.round(opacity * 100)} onChange={(e) => setOpacity(+e.target.value / 100)} className="w-28 accent-[var(--blue)]" aria-label="Overlay opacity" />
                  <span className="w-9 font-mono text-ink-3">{Math.round(opacity * 100)}%</span>
                  <label className="flex cursor-pointer items-center gap-1.5 text-ink-2">
                    <input type="checkbox" checked={blend} onChange={(e) => setBlend(e.target.checked)} className="accent-[var(--blue)]" />
                    Difference
                  </label>
                  {!guest && (
                    <>
                      <button onClick={() => replaceDesign("overlay")} className="rounded p-1 text-ink-3 hover:text-ink" title="Replace design image" aria-label="Replace design image">
                        {designBusy ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
                      </button>
                      <button onClick={removeDesign} className="rounded p-1 text-ink-3 hover:text-danger" title="Remove design">
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                  <button onClick={() => setTool(null)} className="text-ink-3 hover:text-ink">Close</button>
                </>
              ) : (
                <span className="text-ink-2">No {LABEL[primary].toLowerCase()} design for this page yet.</span>
              )}
            </div>
          )}

          {designErr && (
            <div className="absolute left-1/2 top-14 z-20 -translate-x-1/2 rounded-lg bg-danger-soft px-3 py-1.5 text-[12.5px] text-danger shadow-1" role="alert">
              {designErr} <button className="ml-2 underline" onClick={() => setDesignErr(null)}>OK</button>
            </div>
          )}

          {/* inline comment box at the pin */}
          {draft && (
            <CanvasComposer
              key={`${draft.frame}-${draft.selector}-${draft.cx}-${draft.cy}`}
              x={draft.x}
              y={draft.y}
              bounds={stage}
              element={draft.element}
              members={guest ? [] : members}
              guest={guest}
              onCancel={cancelDraft}
              onSubmit={submitDraft}
            />
          )}
        </div>

        {/* ───────── side panel ───────── */}
        {panel && (
          <aside
            style={{ ["--panel-w" as string]: `${panelW}px` }}
            className="relative flex w-[var(--panel-w)] shrink-0 flex-col border-l border-line bg-surface max-md:absolute max-md:inset-0 max-md:z-20 max-md:w-full max-md:border-l-0"
          >
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize comments panel"
              aria-valuenow={panelW}
              aria-valuemin={PANEL_MIN}
              aria-valuemax={PANEL_MAX}
              tabIndex={0}
              title="Drag to resize · double-click to reset"
              onPointerDown={startResize}
              onDoubleClick={() => setPanelW(PANEL_DEFAULT)}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") setPanelW((w) => clampPanel(w + 24));
                if (e.key === "ArrowRight") setPanelW((w) => clampPanel(w - 24));
              }}
              className={cn(
                "group/rz absolute inset-y-0 -left-1.5 z-20 w-3 cursor-col-resize outline-none max-md:hidden",
                "after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:bg-transparent after:transition-colors",
                "hover:after:bg-blue focus-visible:after:bg-blue",
                resizing && "after:bg-blue",
              )}
            >
              <span className="absolute left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-line-strong opacity-0 transition group-hover/rz:opacity-100" />
            </div>
            {selectedId ? (
              <IssueDetail
                key={selectedId}
                issueId={selectedId}
                guest={guest}
                members={members}
                me={me}
                onClose={() => setSelectedId(null)}
                onLocate={(i) => sendAll({ type: "focus", id: i.id })}
                onChange={(u) => setIssues((xs) => xs.map((x) => (x.id === u.id ? { ...x, ...u } : x)))}
                onDeleted={(id) => {
                  setIssues((xs) => xs.filter((x) => x.id !== id));
                  setSelectedId(null);
                }}
              />
            ) : inspect ? (
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-line p-4">
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-widest text-ink-3">Inspect · {LABEL[inspect.frame]}</div>
                    <div className="mt-0.5 font-medium">
                      &lt;{inspect.element.tag}&gt; {inspect.element.text && <span className="font-normal text-ink-3">“{inspect.element.text.slice(0, 32)}”</span>}
                    </div>
                  </div>
                  <button onClick={() => setInspect(null)} className="text-sm text-ink-3 hover:text-ink">Close</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <SpecTable el={inspect.element} />
                  {inspect.selector && <div className="mt-4 break-all rounded-lg bg-surface-2 p-2.5 font-mono text-[11.5px] text-blue">{inspect.selector}</div>}
                </div>
                <div className="border-t border-line p-3">
                  <Button className="w-full" onClick={() => { setDraft(inspect); setInspect(null); }}>
                    <MessageSquarePlus size={15} /> Comment on this element
                  </Button>
                </div>
              </div>
            ) : (
              <CanvasPanel
                list={list}
                scopeCount={scopeBase.length}
                doneCount={doneCount}
                totalCount={issues.length}
                deviceCounts={deviceCounts}
                filters={filters}
                setFilters={setFilters}
                onSelect={(id) => locateIssue(id)}
                onOpen={(id) => selectIssue(id)}
                focusedId={focusedId}
                onPatch={patchIssue}
                statusOptions={guest ? ["open", "fixed", "verified"] : ["open", "in_progress", "in_review", "fixed", "verified", "wont_fix"]}
                members={members}
                canMeta={!guest}
                linkFor={(i) =>
                  `${window.location.origin}${guest ? `/r/${guest.shareToken}` : `/app/projects/${project.id}/review`}?page=${encodeURIComponent(i.pageUrl)}&issue=${i.id}`
                }
                onToggleDone={toggleDone}
                canEdit={canEditIssue}
                onEdit={editIssueText}
                onDelete={deleteIssueAsk}
                bulk={guest ? undefined : { members, onUpdate: bulkUpdate, onDelete: bulkDelete }}
                showPageName={(i) => pageKey(i.pageUrl) !== pageKey(pageUrl)}
              />
            )}
          </aside>
        )}
      </div>
      {auditOpen && !guest && <AuditModal project={project} pageUrl={pageUrl} onClose={() => setAuditOpen(false)} />}
    </div>
  );
}

function DevBtn({ active, locked, onClick, title, children }: { active: boolean; locked?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={locked ? `${title} · Pro` : title}
      aria-pressed={active}
      className={cn(
        "relative flex h-8 w-9 items-center justify-center rounded-lg transition max-md:h-11 max-md:w-11",
        active ? "bg-blue text-white shadow-1" : locked ? "text-ink-3/60 hover:bg-surface-2 hover:text-ink-2" : "text-ink-3 hover:bg-surface-2 hover:text-ink",
      )}
    >
      {children}
      {locked && <LockDot />}
    </button>
  );
}

function ModeBtn({ active, locked, onClick, icon, label, k }: { active: boolean; locked?: boolean; onClick: () => void; icon: React.ReactNode; label: string; k: string }) {
  return (
    <button
      onClick={onClick}
      title={locked ? `${label} · not on this plan` : `${label} (${k})`}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "relative flex h-8 w-9 items-center justify-center rounded-lg transition max-md:h-11 max-md:w-11",
        active ? "bg-ink text-paper shadow-1" : locked ? "text-ink-3/60 hover:bg-surface-2 hover:text-ink-2" : "text-ink-3 hover:bg-surface-2 hover:text-ink",
      )}
    >
      {icon}
      {locked && <LockDot />}
    </button>
  );
}

/** Small lock on a toolbar button whose tool isn't in the workspace's plan. */
function LockDot() {
  return (
    <span className="pointer-events-none absolute -right-1 -top-1 flex h-[15px] w-[15px] items-center justify-center rounded-full border border-line bg-surface text-ink-2 shadow-1">
      <Lock size={8} strokeWidth={2.6} />
    </span>
  );
}

/** Shown when someone reaches for a Pro tool, or runs out of free comments. */
function Upsell({ what, guest, limit, onClose }: { what: Feature | "comments"; guest: boolean; limit: number | null; onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  const title = guest
    ? what === "guests" || what === "comments"
      ? "This review is view-only"
      : "Not available on this review"
    : what === "comments"
      ? `You've used all ${limit} free comments`
      : `${FEATURE_LABEL[what]} is a Pro tool`;
  const body = guest
    ? "You can browse the page and read every comment. Commenting is turned off for guests on this review."
    : what === "comments"
      ? "New comments and replies are paused on the Free plan. Everything you've written is safe. Pro is $5 a month with unlimited comments."
      : "Free includes comment pins. Pro is $5 a month and unlocks every review tool, with unlimited projects, comments and audits.";
  return (
    <div className="animate-pop absolute bottom-10 left-1/2 z-30 w-[min(400px,calc(100%-32px))] -translate-x-1/2 rounded-2xl border border-line bg-surface p-4 shadow-2" role="dialog" aria-label={title}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
          <Lock size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-ink">{title}</div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{body}</p>
          {!guest && (
            <div className="mt-3 flex items-center gap-2">
              <a href="/pricing" target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-lg bg-ink px-3 text-[12.5px] font-medium text-paper hover:opacity-90">
                Upgrade to Pro
              </a>
              <button onClick={onClose} className="h-8 rounded-lg px-3 text-[12.5px] text-ink-3 hover:bg-surface-2 hover:text-ink">
                Not now
              </button>
            </div>
          )}
        </div>
        <button onClick={onClose} className="rounded p-1 text-ink-3 hover:text-ink" aria-label="Close">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

function DesignDrop({ onPick, onDrive, guest, device }: { onPick: () => void; onDrive?: () => void; guest: boolean; device: string }) {
  useEffect(() => {
    if (onDrive) preloadGoogle(true);
  }, [onDrive]);
  return (
    <div className="flex h-full min-h-[300px] items-center justify-center p-8 text-center">
      <div>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-soft text-blue">
          <ImagePlus size={20} />
        </div>
        <p className="mt-3 font-medium">No {device.toLowerCase()} design for this page</p>
        <p className="mt-1 max-w-xs text-sm text-ink-3">Export the frame from Figma as a PNG at the same width as the page, then upload it here.</p>
        {!guest && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button size="sm" onClick={onPick}>
              Upload design image
            </Button>
            {onDrive && (
              <Button size="sm" variant="secondary" onClick={onDrive}>
                <IntegrationIcon name="Google Drive" size={14} /> From Google Drive
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Device size picker: presets with real width × height, plus a custom size. */
function SizeMenu({
  open,
  setOpen,
  keys,
  sizes,
  sizeIds,
  customSizes,
  onPick,
  onCustom,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  keys: FrameKey[];
  sizes: Record<FrameKey, DevicePreset>;
  sizeIds: Record<FrameKey, string>;
  customSizes: CustomSizes;
  onPick: (k: FrameKey, id: string) => void;
  onCustom: (k: FrameKey, w: number, h: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [open, setOpen]);

  const summary = keys.map((k) => (sizes[k].w ? sizes[k].label : LABEL[k])).join(" + ");
  return (
    // Only on wide screens: below xl the toolbar has no room for it, and the device buttons cover the common sizes.
    <div ref={ref} className="relative hidden xl:block">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        title="Choose device size"
        className="flex h-8 max-w-[220px] items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-[12.5px] text-ink hover:border-line-strong"
      >
        <span className="truncate">{summary}</span>
        <ChevronDown size={13} className={cn("shrink-0 text-ink-3 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className={cn("animate-pop absolute left-0 top-10 z-40 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-2", keys.length > 1 ? "grid w-[480px] grid-cols-2 divide-x divide-line" : "w-[250px]")}>
          {keys.map((k) => (
            <SizeColumn key={k} frame={k} active={sizeIds[k]} custom={customSizes[k]} onPick={(id) => onPick(k, id)} onCustom={(w, h) => onCustom(k, w, h)} />
          ))}
        </div>
      )}
    </div>
  );
}

function SizeColumn({ frame, active, custom, onPick, onCustom }: { frame: FrameKey; active: string; custom?: { w: number; h: number }; onPick: (id: string) => void; onCustom: (w: number, h: number) => void }) {
  const [w, setW] = useState(String(custom?.w ?? FALLBACK_W[frame]));
  const [h, setH] = useState(String(custom?.h ?? (frame === "mobile" ? 800 : frame === "tablet" ? 1024 : 900)));
  const valid = +w >= 240 && +w <= 3840 && +h >= 320 && +h <= 2400;
  return (
    <div className="px-1 py-1">
      <div className="px-2 pb-1 pt-0.5 text-[11.5px] font-medium text-ink-3">{LABEL[frame]}</div>
      {DEVICE_PRESETS[frame].map((p) => (
        <button key={p.id} onClick={() => onPick(p.id)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] hover:bg-surface-2">
          <span className="min-w-0 flex-1 truncate text-ink">{p.label}</span>
          {p.w > 0 && <span className="font-mono text-[11px] text-ink-3">{p.w}×{p.h}</span>}
          {active === p.id && <Check size={13} className="shrink-0 text-blue" />}
        </button>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onCustom(Math.round(+w), Math.round(+h));
        }}
        className={cn("mt-1 flex items-center gap-1 rounded-md px-2 py-1.5", active === "custom" && "bg-blue-soft")}
      >
        <span className="text-[12.5px] text-ink">Custom</span>
        <input value={w} onChange={(e) => setW(e.target.value.replace(/\D/g, ""))} aria-label={`${LABEL[frame]} custom width`} className="ml-auto h-7 w-14 rounded border border-line bg-paper px-1.5 text-center font-mono text-[11.5px]" />
        <span className="text-[11px] text-ink-3">×</span>
        <input value={h} onChange={(e) => setH(e.target.value.replace(/\D/g, ""))} aria-label={`${LABEL[frame]} custom height`} className="h-7 w-14 rounded border border-line bg-paper px-1.5 text-center font-mono text-[11.5px]" />
        <button disabled={!valid} className="rounded bg-blue px-2 py-1 text-[11.5px] font-medium text-white disabled:opacity-40" title="Apply custom size">
          Set
        </button>
      </form>
    </div>
  );
}

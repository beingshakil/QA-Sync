"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AtSign, FileText, Loader2, Mic, Paperclip, Send, Square, Tag, X } from "lucide-react";
import { api, type GuestCtx } from "@/lib/api";
import { PRIORITIES, type Attachment, type ElementInfo, type Priority } from "@/lib/types";
import { Avatar, PriorityIcon } from "@/components/ui";
import { cn } from "@/lib/utils";

const MAX_VOICE_SECONDS = 300;
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,application/pdf";

export interface ComposerSubmit {
  text: string;
  priority?: Priority;
  assignee?: string | null;
  attachments: Attachment[];
}

interface Props {
  x: number;
  y: number;
  bounds: { w: number; h: number };
  element: ElementInfo;
  members: string[];
  guest?: GuestCtx;
  onCancel: () => void;
  onSubmit: (b: ComposerSubmit) => Promise<void>;
}

/* Minimal typing for the Web Speech API (not in TS's DOM lib everywhere). */
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
};

export function CanvasComposer({ x, y, bounds, element, members, guest, onCancel, onSubmit }: Props) {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<Priority | "">("");
  const [assignee, setAssignee] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(0);
  const [menu, setMenu] = useState<"tag" | "mention" | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [pos, setPos] = useState({ left: x + 18, top: y - 12 });

  const boxRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const speechRef = useRef<Recognition | null>(null);
  const baseTextRef = useRef("");

  useEffect(() => taRef.current?.focus(), []);

  /* keep the box inside the stage; flip left/up when needed */
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let left = x + 18;
    if (left + w > bounds.w - 8) left = Math.max(8, x - w - 18);
    let top = y - 12;
    if (top + h > bounds.h - 8) top = Math.max(8, bounds.h - h - 8);
    setPos({ left, top: Math.max(8, top) });
  }, [x, y, bounds.w, bounds.h, attachments.length, recording, menu, err]);

  /* stop any recording if the box closes */
  useEffect(() => () => stopRecording(true), []);

  async function addFiles(files: FileList | File[]) {
    setErr(null);
    for (const f of Array.from(files).slice(0, 10 - attachments.length)) {
      setUploading((n) => n + 1);
      try {
        const a = await api.upload(f, f.name || "pasted-image.png", guest);
        setAttachments((xs) => [...xs, a]);
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  async function startRecording() {
    setErr(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErr("Voice notes need a browser with microphone access.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setErr("Microphone access was blocked. Allow it in the address bar to record.");
      return;
    }
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      if ((rec as MediaRecorder & { __discard?: boolean }).__discard || !chunks.length) return;
      const type = (rec.mimeType || "audio/webm").split(";")[0];
      const blob = new Blob(chunks, { type });
      const ext = type.includes("ogg") ? "ogg" : type.includes("mp4") ? "m4a" : "webm";
      await addFiles([new File([blob], `voice-note.${ext}`, { type })]);
    };
    rec.start();
    recRef.current = rec;

    // Live transcript where the browser supports it (Chrome, Edge, Safari).
    const W = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const SR = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (SR) {
      const sr = new SR();
      sr.continuous = true;
      sr.interimResults = true;
      sr.lang = navigator.language || "en-US";
      baseTextRef.current = text ? text.trimEnd() + " " : "";
      sr.onresult = (e) => {
        let t = "";
        for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
        setText(baseTextRef.current + t.trim());
      };
      sr.onerror = () => {};
      try {
        sr.start();
        speechRef.current = sr;
      } catch {
        /* transcript is optional */
      }
    }
    setSeconds(0);
    setRecording(true);
  }

  function stopRecording(discard = false) {
    const rec = recRef.current;
    if (rec && rec.state !== "inactive") {
      (rec as MediaRecorder & { __discard?: boolean }).__discard = discard;
      rec.stop();
    }
    recRef.current = null;
    try {
      speechRef.current?.stop();
    } catch {}
    speechRef.current = null;
    setRecording(false);
  }

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_VOICE_SECONDS) stopRecording();
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [recording]);

  function insertMention(name: string) {
    const ta = taRef.current;
    const at = ta?.selectionStart ?? text.length;
    // replace a trailing "@" the user just typed
    const before = text.slice(0, at).replace(/@$/, "");
    const next = `${before}@${name} ${text.slice(at)}`;
    setText(next);
    if (!guest && !assignee) setAssignee(name);
    setMenu(null);
    requestAnimationFrame(() => ta?.focus());
  }

  async function submit() {
    if (recording) stopRecording();
    if (uploading) {
      setErr("Wait for the upload to finish.");
      return;
    }
    if (!text.trim() && !attachments.length) return;
    setBusy(true);
    setErr(null);
    try {
      await onSubmit({ text: text.trim(), priority: priority || undefined, assignee, attachments });
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  const canSend = (text.trim() || attachments.length) && !busy && !uploading;
  const mm = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div
      ref={boxRef}
      className="animate-pop absolute z-30 w-[340px] max-w-[calc(100%-16px)] rounded-2xl border border-line-strong bg-surface p-2 shadow-2"
      style={{ left: pos.left, top: pos.top }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          if (menu) setMenu(null);
          else onCancel();
        }
      }}
    >
      <div className="flex items-center gap-1.5 px-1.5 pb-1.5 font-mono text-[10.5px] text-ink-3">
        <span className="rounded bg-surface-2 px-1">&lt;{element.tag}&gt;</span>
        <span className="truncate">{element.text ? `“${element.text.slice(0, 34)}”` : `${element.width}×${element.height}`}</span>
        <span className="ml-auto shrink-0">specs captured ✓</span>
      </div>

      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (members.length && e.target.value.endsWith("@")) setMenu("mention");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        onPaste={(e) => {
          const files = Array.from(e.clipboardData.files);
          if (files.length) {
            e.preventDefault();
            addFiles(files);
          }
        }}
        rows={3}
        placeholder="Type here…"
        className="block w-full resize-none rounded-xl border border-blue/60 bg-paper px-3 py-2.5 text-[14px] leading-relaxed outline-none focus:border-blue"
      />

      {/* chips: priority, assignee, attachments */}
      {(priority || assignee || attachments.length > 0 || uploading > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5 px-0.5">
          {priority && (
            <Chip onRemove={() => setPriority("")}>
              <PriorityIcon priority={priority} label />
            </Chip>
          )}
          {assignee && (
            <Chip onRemove={() => setAssignee(null)}>
              <Avatar name={assignee} size={14} /> {assignee}
            </Chip>
          )}
          {attachments.map((a) => (
            <Chip key={a.id} onRemove={() => setAttachments((xs) => xs.filter((x) => x.id !== a.id))}>
              {a.mime.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt="" className="h-4 w-4 rounded object-cover" />
              ) : a.mime.startsWith("audio/") ? (
                <Mic size={12} />
              ) : (
                <FileText size={12} />
              )}
              <span className="max-w-[110px] truncate">{a.mime.startsWith("audio/") ? "Voice note" : a.name}</span>
            </Chip>
          ))}
          {uploading > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-1 text-[11.5px] text-ink-3">
              <Loader2 size={12} className="animate-spin" /> Uploading…
            </span>
          )}
        </div>
      )}

      {recording && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-accent-soft px-2.5 py-1.5 text-[12.5px] text-accent-ink">
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
          Recording {mm} <span className="text-ink-3">/ 5:00 · transcript appears above</span>
          <button onClick={() => stopRecording(true)} className="ml-auto text-[11.5px] text-ink-3 hover:text-ink">
            Discard
          </button>
        </div>
      )}

      {err && <p className="mt-2 px-1 text-[12.5px] text-accent-ink">{err}</p>}

      {/* toolbar */}
      <div className="relative mt-2 flex items-center gap-1.5">
        <ToolBtn
          title={recording ? "Stop recording" : "Record a voice note"}
          onClick={() => (recording ? stopRecording() : startRecording())}
          active={recording}
        >
          {recording ? <Square size={14} className="fill-current" /> : <Mic size={16} />}
        </ToolBtn>
        <ToolBtn title="Attach image or PDF" onClick={() => fileRef.current?.click()}>
          <Paperclip size={16} />
        </ToolBtn>
        <ToolBtn title="Set priority" onClick={() => setMenu(menu === "tag" ? null : "tag")} active={menu === "tag" || !!priority}>
          <Tag size={16} />
        </ToolBtn>
        {members.length > 0 && (
          <ToolBtn title="Mention a teammate" onClick={() => setMenu(menu === "mention" ? null : "mention")} active={menu === "mention"}>
            <AtSign size={16} />
          </ToolBtn>
        )}
        <span className="flex-1" />
        <ToolBtn title="Cancel (Esc)" onClick={() => { stopRecording(true); onCancel(); }}>
          <X size={16} />
        </ToolBtn>
        <button
          title="Send (Enter)"
          disabled={!canSend}
          onClick={submit}
          className="flex h-9 w-10 items-center justify-center rounded-lg bg-blue text-white transition hover:brightness-110 disabled:opacity-40"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>

        {menu && (
          <div className="absolute bottom-11 left-0 z-10 w-56 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-2">
            {menu === "tag" ? (
              <>
                <div className="px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-widest text-ink-3">Priority</div>
                <MenuItem onClick={() => { setPriority(""); setMenu(null); }} active={!priority}>
                  Auto-detect
                </MenuItem>
                {PRIORITIES.map((p) => (
                  <MenuItem key={p} onClick={() => { setPriority(p); setMenu(null); }} active={priority === p}>
                    <PriorityIcon priority={p} label />
                  </MenuItem>
                ))}
              </>
            ) : (
              <>
                <div className="px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-widest text-ink-3">Mention & assign</div>
                {members.map((m) => (
                  <MenuItem key={m} onClick={() => insertMention(m)}>
                    <Avatar name={m} size={18} /> {m}
                  </MenuItem>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function ToolBtn({ children, title, onClick, active }: { children: React.ReactNode; title: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg border transition",
        active ? "border-blue/50 bg-blue-soft text-blue" : "border-line bg-surface-2 text-ink-2 hover:border-line-strong hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-2 py-0.5 pl-2 pr-1 text-[11.5px] text-ink-2">
      {children}
      <button onClick={onRemove} className="rounded p-0.5 text-ink-3 hover:text-ink" title="Remove">
        <X size={11} />
      </button>
    </span>
  );
}

function MenuItem({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-surface-2", active && "font-medium text-ink")}>
      {children}
    </button>
  );
}

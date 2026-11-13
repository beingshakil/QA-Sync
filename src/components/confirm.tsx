"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";

export interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const Ctx = createContext<ConfirmFn | null>(null);

/** In-app confirmation dialog, used instead of window.confirm(). */
export function useConfirm(): ConfirmFn {
  const fn = useContext(Ctx);
  // Fallback keeps components usable outside the provider (e.g. in isolation).
  return fn ?? (async (o) => window.confirm(o.title));
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const okRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((opts) => new Promise<boolean>((resolve) => setState({ ...opts, resolve })), []);

  const close = useCallback(
    (v: boolean) => {
      state?.resolve(v);
      setState(null);
    },
    [state],
  );

  useEffect(() => {
    if (!state) return;
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [state, close]);

  return (
    <Ctx.Provider value={confirm}>
      {children}
      {state && (
        <div className="animate-fade fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm" onMouseDown={() => close(false)} role="presentation">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="animate-pop w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-2"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex gap-3">
              {state.danger !== false && (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
                  <AlertTriangle size={18} />
                </span>
              )}
              <div className="min-w-0">
                <h2 id="confirm-title" className="text-[16px] font-semibold leading-snug">
                  {state.title}
                </h2>
                {state.message && <div className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{state.message}</div>}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => close(false)}>
                {state.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                ref={okRef}
                onClick={() => close(true)}
                variant={state.danger !== false ? "danger-solid" : "primary"}
              >
                {state.confirmLabel ?? "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

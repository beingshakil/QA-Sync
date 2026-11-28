"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type Lenis from "lenis";
import "lenis/dist/lenis.css";

/**
 * Site-wide motion helpers for the marketing pages:
 *  - [data-reveal]: fades/rises into view once when scrolled to (optional --d delay in ms)
 *  - [data-spotlight]: a soft glow follows the cursor (sets --mx / --my)
 *  - smooth wheel scrolling (Lenis)
 * Respects prefers-reduced-motion (CSS shows everything immediately).
 */
export function MotionLayer() {
  const path = usePathname();

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-visible)"));
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [path]);

  // Smooth, eased wheel scrolling (Lenis keeps native scroll, so sticky sections and
  // scroll listeners still work). Off for reduced motion; touch keeps native momentum.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let lenis: Lenis | null = null;
    let cancelled = false;
    import("lenis").then(({ default: L }) => {
      if (cancelled) return;
      lenis = new L({
        autoRaf: true,
        lerp: 0.09,
        wheelMultiplier: 0.95,
        anchors: { offset: -72 }, // clear the sticky 64px header
        allowNestedScroll: true, // menus and other inner scrollers scroll natively
        stopInertiaOnNavigate: true,
      });
    });
    return () => {
      cancelled = true;
      lenis?.destroy();
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>("[data-spotlight]");
      if (!el) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("pointermove", onMove);
    };
  }, []);

  return null;
}

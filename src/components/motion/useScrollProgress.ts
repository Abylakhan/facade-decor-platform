"use client";
import { useEffect, useState, type RefObject } from "react";

/**
 * 0..1 progress of an element through the viewport.
 * - "pin": 0 when the element's top reaches the viewport top, 1 when its bottom reaches the viewport bottom
 *   (for tall sections with a sticky child).
 * - "pass": 0 when the top enters from below, 1 when the bottom leaves at the top.
 * Reduced motion → always 1 (final state).
 */
export function useScrollProgress(ref: RefObject<HTMLElement | null>, mode: "pin" | "pass" = "pass") {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setP(1);
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const v = mode === "pin" ? -r.top / Math.max(1, r.height - vh) : (vh - r.top) / (vh + r.height);
      setP(Math.min(1, Math.max(0, v)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ref, mode]);
  return p;
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Maps p from [a, b] to [0, 1] with ease-out. */
export const seg = (p: number, a: number, b: number) => {
  const t = clamp01((p - a) / (b - a));
  return 1 - Math.pow(1 - t, 3);
};

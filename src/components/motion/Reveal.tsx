"use client";
/**
 * Scroll-reveal primitives. Elements start in a resting "out" state via CSS
 * (.rv) and switch to "in" once visible. With reduced motion everything is
 * shown immediately (handled in CSS).
 */
import { createElement, useEffect, useRef, type CSSProperties, type ReactNode } from "react";

type Kind = "up" | "fade" | "mask" | "scale" | "line";

function useInView<T extends HTMLElement>(once = true) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.dataset.in = "1";
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.in = "1";
            if (once) io.unobserve(e.target);
          } else if (!once) delete (e.target as HTMLElement).dataset.in;
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);
  return ref;
}

export function Reveal({
  children,
  kind = "up",
  delay = 0,
  as = "div",
  className = "",
  style,
}: {
  children: ReactNode;
  kind?: Kind;
  delay?: number;
  as?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useInView<HTMLElement>();
  return createElement(as, { ref, className: `rv rv-${kind} ${className}`, style: { ...style, "--rv-delay": `${delay}ms` } }, children);
}

/** Splits a headline into words that rise in sequence. */
export function RevealWords({ text, className = "", as = "h2", step = 45 }: { text: string; className?: string; as?: string; step?: number }) {
  const ref = useInView<HTMLElement>();
  const words = text.split(" ");
  return createElement(
    as,
    { ref, className: `rv-words ${className}`, "aria-label": text },
    words.flatMap((w, i) => [
      <span key={i} className="rv-w" aria-hidden="true">
        <span style={{ transitionDelay: `${i * step}ms` }}>{w}</span>
      </span>,
      i < words.length - 1 ? " " : null,
    ]),
  );
}

/** Subtle vertical parallax for large images (transform only, rAF-throttled). */
export function Parallax({ children, strength = 60, className = "" }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const p = (r.top + r.height / 2 - window.innerHeight / 2) / (window.innerHeight + r.height);
      (el.firstElementChild as HTMLElement | null)?.style.setProperty("transform", `translate3d(0, ${(-p * strength).toFixed(1)}px, 0) scale(1.08)`);
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
  }, [strength]);
  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

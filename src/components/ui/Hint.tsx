"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "./icons";

/** Small "i" button that explains a parameter in plain words. Click/tap or focus + Enter. */
export function Hint({ children, label = "?" }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-5 w-5 items-center justify-center text-ink-4 hover:text-bronze"
      >
        <Icon name="info" size={15} />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute top-6 left-1/2 z-40 w-64 -translate-x-1/2 border border-line bg-surface p-3 text-xs leading-relaxed font-normal text-ink-2 shadow-[var(--shadow-lift)] normal-case tracking-normal"
        >
          {children}
        </span>
      )}
    </span>
  );
}

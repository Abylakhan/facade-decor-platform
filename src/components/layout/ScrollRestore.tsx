"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const strip = (p: string) => p.replace(/^\/(ru|kk|en)(?=\/|$)/, "");

/** After a language switch, returns the reader to the same place on the page. */
export function ScrollRestore() {
  const pathname = usePathname() ?? "";
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("fd.restoreScroll");
      if (!raw) return;
      const { path, y } = JSON.parse(raw) as { path: string; y: number };
      sessionStorage.removeItem("fd.restoreScroll");
      if (path === strip(pathname)) requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior }));
    } catch {
      /* ignore */
    }
  }, [pathname]);
  return null;
}

export function rememberScroll(pathname: string) {
  try {
    sessionStorage.setItem("fd.restoreScroll", JSON.stringify({ path: strip(pathname), y: window.scrollY }));
  } catch {
    /* ignore */
  }
}

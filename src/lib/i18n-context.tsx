"use client";
import { createContext, useContext, useEffect } from "react";
import type { Locale } from "@/domain/types";
import type { Dict } from "@/i18n";

const Ctx = createContext<{ locale: Locale; dict: Dict } | null>(null);

export function I18nProvider({ locale, dict, children }: { locale: Locale; dict: Dict; children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      localStorage.setItem("fd.locale", locale);
    } catch {
      /* ignore */
    }
  }, [locale]);
  return <Ctx.Provider value={{ locale, dict }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n outside I18nProvider");
  return v;
}

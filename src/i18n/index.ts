/**
 * Single localisation system. Add a language by creating a dictionary typed as
 * `Dict`, adding it to `dictionaries` and to `LOCALES` in domain/types.ts.
 */
import type { LocalizedText, Locale } from "@/domain/types";
import { LOCALES } from "@/domain/types";
import { kk } from "./kk";
import { ru, type Dict } from "./ru";

export type { Dict };
export const dictionaries: Record<Locale, Dict> = { ru, kk };
export const DEFAULT_LOCALE: Locale = "ru";

export function isLocale(v: string): v is Locale {
  return (LOCALES as string[]).includes(v);
}

export function getDict(locale: Locale): Dict {
  return dictionaries[locale];
}

/** Replaces {placeholders} with values. */
export function format(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in params ? String(params[k]) : `{${k}}`));
}

/** Picks the localized text, falling back to Russian. */
export function lt(text: LocalizedText, locale: Locale): string {
  return text[locale] || text.ru;
}

/**
 * Number/date formatting is deterministic and identical on server and client:
 * Kazakhstan uses the same conventions as ru-RU (space grouping, comma decimals),
 * and browsers often lack kk-KZ data, which would cause hydration mismatches.
 */
const nf = new Map<number, Intl.NumberFormat>();
function numberFormat(digits: number) {
  let f = nf.get(digits);
  if (!f) {
    f = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: digits });
    nf.set(digits, f);
  }
  return f;
}

export function fmtNumber(n: number, _locale: Locale, digits = 2): string {
  return numberFormat(digits).format(n).replace(/\u00a0|\u202f/g, " ");
}

export function fmtMoney(n: number, locale: Locale): string {
  return `${fmtNumber(Math.round(n), locale, 0)} ₸`;
}

const pad = (x: number) => String(x).padStart(2, "0");
export function fmtDate(iso: string, _locale: Locale, withTime = true): string {
  const d = new Date(iso);
  const date = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  return withTime ? `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}` : date;
}

"use client";
import type { CalcMessage } from "@/domain/types";
import { fmtNumber, format } from "@/i18n";
import { useI18n } from "./i18n-context";

/** Turns calculation messages (code + params) into localized text. */
export function useCalcMessage() {
  const { locale, dict } = useI18n();
  return (m: CalcMessage) => {
    const tpl = (dict.calc.msg as Record<string, string>)[m.code] ?? m.code;
    const p: Record<string, string | number> = { ...(m.params ?? {}) };
    for (const [k, v] of Object.entries(p)) if (typeof v === "number") p[k] = fmtNumber(v, locale);
    if (typeof p.side === "string" && p.side in dict.sides) p.side = dict.sides[p.side as keyof typeof dict.sides];
    if (typeof p.field === "string" && p.field in dict.fields) p.field = dict.fields[p.field as keyof typeof dict.fields];
    if (typeof p.kind === "string" && p.kind in dict.placement) p.kind = dict.placement[p.kind as keyof typeof dict.placement];
    return format(tpl, p);
  };
}

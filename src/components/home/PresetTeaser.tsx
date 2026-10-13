"use client";
import Link from "next/link";
import { useMemo } from "react";
import { presets } from "@/data/presets";
import { useI18n } from "@/lib/i18n-context";
import { lt } from "@/i18n";
import { BeforeAfter } from "./BeforeAfter";

export function PresetTeaser() {
  const { locale, dict } = useI18n();
  const preset = presets[1]!;
  const variant = useMemo(() => preset.build(), [preset]);
  const [before, after] = locale === "kk" ? ["Дейін", "Кейін"] : ["До", "После"];
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
      <BeforeAfter variant={variant} labels={{ before, after, slider: dict.home.beforeAfter }} />
      <div>
        <p className="eyebrow">{dict.home.beforeAfter} · DEMO</p>
        <h3 className="display-3 mt-3">{lt(preset.title, locale)}</h3>
        <p className="mt-3 text-ink-3">{lt(preset.summary, locale)}</p>
        <Link href={`/${locale}/portfolio/${preset.slug}/`} className="link mt-5 inline-block text-sm">
          {dict.common.details} →
        </Link>
      </div>
    </div>
  );
}

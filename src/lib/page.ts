import type { Metadata } from "next";
import type { Locale } from "@/domain/types";
import { getDict } from "@/i18n";

export type LocaleParams = { params: Promise<{ locale: string }> };

export async function pageLocale(params: Promise<{ locale: string }>) {
  const { locale } = await params;
  const l = locale as Locale;
  return { locale: l, dict: getDict(l) };
}

/** Title, description, canonical and hreflang alternates for a localized path like "/catalog/". */
export function meta(locale: Locale, path: string, title: string, description?: string): Metadata {
  const d = getDict(locale);
  return {
    title,
    description: description ?? d.meta.description,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: { ru: `/ru${path}`, kk: `/kk${path}`, "x-default": `/ru${path}` },
    },
    openGraph: { title, description: description ?? d.meta.description, locale: locale === "kk" ? "kk_KZ" : "ru_RU", type: "website" },
  };
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { PresetDetail } from "@/components/home/PresetViews";
import { presets } from "@/data/presets";
import { lt } from "@/i18n";
import { meta, pageLocale } from "@/lib/page";

type P = { params: Promise<{ locale: string; slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return presets.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const { locale } = await pageLocale(params);
  const p = presets.find((x) => x.slug === slug);
  return p ? meta(locale, `/portfolio/${slug}/`, lt(p.title, locale), lt(p.summary, locale)) : {};
}

export default async function PresetPage({ params }: P) {
  const { slug } = await params;
  const { locale, dict } = await pageLocale(params);
  const p = presets.find((x) => x.slug === slug);
  if (!p) notFound();
  return (
    <main>
      <PageHeader
        crumbsLabel={dict.common.breadcrumbs}
        crumbs={[{ href: `/${locale}/`, label: dict.nav.home }, { href: `/${locale}/portfolio/`, label: dict.nav.portfolio }, { label: lt(p.title, locale) }]}
        eyebrow={`DEMO · ${dict.building[p.buildingType]}`}
        title={lt(p.title, locale)}
      />
      <section className="container-x">
        <PresetDetail slug={slug} />
      </section>
    </main>
  );
}

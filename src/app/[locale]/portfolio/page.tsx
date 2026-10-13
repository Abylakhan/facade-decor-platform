import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { PresetGrid } from "@/components/home/PresetViews";
import { meta, pageLocale, type LocaleParams } from "@/lib/page";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale, dict } = await pageLocale(params);
  return meta(locale, "/portfolio/", dict.portfolio.title, dict.portfolio.lead);
}

export default async function PortfolioPage({ params }: LocaleParams) {
  const { locale, dict } = await pageLocale(params);
  return (
    <main>
      <PageHeader crumbsLabel={dict.common.breadcrumbs} crumbs={[{ href: `/${locale}/`, label: dict.nav.home }, { label: dict.nav.portfolio }]} eyebrow="DEMO" title={dict.portfolio.title} lead={dict.portfolio.lead} />
      <section className="container-x">
        <PresetGrid />
      </section>
    </main>
  );
}

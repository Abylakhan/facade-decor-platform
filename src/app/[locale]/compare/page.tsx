import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { CompareTable } from "@/components/catalog/SavedLists";
import { meta, pageLocale, type LocaleParams } from "@/lib/page";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale, dict } = await pageLocale(params);
  return { ...meta(locale, "/compare/", dict.pages.compareTitle), robots: { index: false } };
}

export default async function Page({ params }: LocaleParams) {
  const { locale, dict } = await pageLocale(params);
  return (
    <main>
      <PageHeader crumbsLabel={dict.common.breadcrumbs} crumbs={[{ href: `/${locale}/`, label: dict.nav.home }, { label: dict.nav.compare }]} title={dict.pages.compareTitle} />
      <section className="container-x">
        <CompareTable />
      </section>
    </main>
  );
}

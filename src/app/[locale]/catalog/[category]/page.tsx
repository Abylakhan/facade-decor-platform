import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/feedback";
import { providers } from "@/integration/server";
import { lt } from "@/i18n";
import { meta, pageLocale } from "@/lib/page";

type P = { params: Promise<{ locale: string; category: string }> };

export const dynamicParams = false;
export async function generateStaticParams() {
  const cats = await providers().catalog.listCategories();
  return cats.map((c) => ({ category: c.slug }));
}

async function load(params: P["params"]) {
  const { category } = await params;
  const { locale, dict } = await pageLocale(params);
  const cat = (await providers().catalog.listCategories()).find((c) => c.slug === category);
  return { locale, dict, cat };
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale, cat } = await load(params);
  if (!cat) return {};
  return meta(locale, `/catalog/${cat.slug}/`, lt(cat.name, locale), lt(cat.description, locale));
}

export default async function CategoryPage({ params }: P) {
  const { locale, dict, cat } = await load(params);
  if (!cat) notFound();
  return (
    <main>
      <PageHeader
        crumbsLabel={dict.common.breadcrumbs}
        crumbs={[{ href: `/${locale}/`, label: dict.nav.home }, { href: `/${locale}/catalog/`, label: dict.nav.catalog }, { label: lt(cat.name, locale) }]}
        eyebrow={dict.catalog.category}
        title={lt(cat.name, locale)}
        lead={lt(cat.description, locale)}
      />
      <section className="container-x">
        <Suspense fallback={<Skeleton className="h-96" />}>
          <CatalogBrowser fixedCategory={cat.id} />
        </Suspense>
      </section>
    </main>
  );
}

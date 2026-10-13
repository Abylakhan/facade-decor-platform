import { Suspense } from "react";
import type { Metadata } from "next";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/feedback";
import { meta, pageLocale, type LocaleParams } from "@/lib/page";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale, dict } = await pageLocale(params);
  return meta(locale, "/catalog/", dict.catalog.title);
}

function CatalogSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="aspect-[4/5]" />
      ))}
    </div>
  );
}

export default async function CatalogPage({ params }: LocaleParams) {
  const { locale, dict } = await pageLocale(params);
  return (
    <main>
      <PageHeader
        crumbsLabel={dict.common.breadcrumbs}
        crumbs={[{ href: `/${locale}/`, label: dict.nav.home }, { label: dict.nav.catalog }]}
        eyebrow={dict.common.demoData}
        title={dict.catalog.title}
        lead={dict.catalog.lead}
      />
      <section className="container-x">
        <Suspense fallback={<CatalogSkeleton />}>
          <CatalogBrowser />
        </Suspense>
      </section>
    </main>
  );
}

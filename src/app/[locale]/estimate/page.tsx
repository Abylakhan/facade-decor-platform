import { Suspense } from "react";
import type { Metadata } from "next";
import { EstimateDocument } from "@/components/estimate/EstimateDocument";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Skeleton } from "@/components/ui/feedback";
import { meta, pageLocale, type LocaleParams } from "@/lib/page";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale, dict } = await pageLocale(params);
  return { ...meta(locale, "/estimate/", dict.estimate.title), robots: { index: false } };
}

export default async function EstimatePage({ params }: LocaleParams) {
  const { locale, dict } = await pageLocale(params);
  return (
    <main className="pb-10">
      <div className="container-x no-print pt-8 pb-6">
        <Breadcrumbs label={dict.common.breadcrumbs} items={[{ href: `/${locale}/`, label: dict.nav.home }, { href: `/${locale}/projects/`, label: dict.nav.projects }, { label: dict.estimate.title }]} />
      </div>
      <Suspense fallback={<Skeleton className="container-x h-96" />}>
        <EstimateDocument />
      </Suspense>
    </main>
  );
}

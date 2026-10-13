import { Suspense } from "react";
import type { Metadata } from "next";
import { CalculatorSwitch } from "@/components/calculator/CalculatorSwitch";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/feedback";
import { meta, pageLocale, type LocaleParams } from "@/lib/page";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale, dict } = await pageLocale(params);
  return meta(locale, "/calculator/", dict.calculator.title);
}

export default async function CalculatorPage({ params }: LocaleParams) {
  const { locale, dict } = await pageLocale(params);
  return (
    <main>
      <PageHeader
        crumbsLabel={dict.common.breadcrumbs}
        crumbs={[{ href: `/${locale}/`, label: dict.nav.home }, { label: dict.nav.calculator }]}
        eyebrow={dict.common.demoShort}
        title={dict.calculator.title}
      />
      <section className="container-x">
        <Suspense fallback={<Skeleton className="h-96" />}>
          <CalculatorSwitch />
        </Suspense>
      </section>
    </main>
  );
}

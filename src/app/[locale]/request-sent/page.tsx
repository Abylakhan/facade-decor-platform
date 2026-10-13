import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { LeadResult } from "@/components/forms/LeadResult";
import { pageLocale, type LocaleParams } from "@/lib/page";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { dict } = await pageLocale(params);
  return { title: dict.pages.sentTitle, robots: { index: false } };
}

export default async function SentPage({ params }: LocaleParams) {
  const { locale, dict } = await pageLocale(params);
  return (
    <main>
      <PageHeader crumbsLabel={dict.common.breadcrumbs} crumbs={[{ href: `/${locale}/`, label: dict.nav.home }, { label: dict.pages.sentTitle }]} title={dict.pages.sentTitle} />
      <section className="container-x">
        <LeadResult />
      </section>
    </main>
  );
}

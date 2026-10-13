import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { DesignSystem } from "@/components/layout/DesignSystem";
import { pageLocale, type LocaleParams } from "@/lib/page";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { dict } = await pageLocale(params);
  return { title: dict.ui.designSystem, robots: { index: false } };
}

export default async function UiPage({ params }: LocaleParams) {
  const { locale, dict } = await pageLocale(params);
  return (
    <main>
      <PageHeader crumbsLabel={dict.common.breadcrumbs} crumbs={[{ href: `/${locale}/`, label: dict.nav.home }, { label: dict.ui.designSystem }]} title={dict.ui.designSystem} />
      <section className="container-x">
        <DesignSystem />
      </section>
    </main>
  );
}

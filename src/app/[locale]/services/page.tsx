import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { LeadModalButton } from "@/components/forms/LeadModalButton";
import { buttonClass } from "@/components/ui/Button";
import { services } from "@/data/content";
import { lt } from "@/i18n";
import { meta, pageLocale, type LocaleParams } from "@/lib/page";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale, dict } = await pageLocale(params);
  return meta(locale, "/services/", dict.pages.servicesTitle);
}

export default async function ServicesPage({ params }: LocaleParams) {
  const { locale, dict } = await pageLocale(params);
  return (
    <main>
      <PageHeader crumbsLabel={dict.common.breadcrumbs} crumbs={[{ href: `/${locale}/`, label: dict.nav.home }, { label: dict.nav.services }]} title={dict.pages.servicesTitle} lead={dict.packageHint.installation} />
      <section className="container-x grid gap-px bg-line md:grid-cols-3">
        {services.map((s, i) => (
          <article key={i} className="flex flex-col gap-4 bg-paper p-6">
            <span className="font-display text-5xl text-bronze">0{i + 1}</span>
            <h2 className="display-3">{lt(s.title, locale)}</h2>
            <p className="text-sm leading-relaxed text-ink-3">{lt(s.text, locale)}</p>
            <ol className="mt-auto space-y-1.5 border-t border-line pt-4 text-sm">
              {s.steps.map((st, j) => (
                <li key={j} className="flex gap-3">
                  <span className="dim w-5">{j + 1}</span>
                  {lt(st, locale)}
                </li>
              ))}
            </ol>
          </article>
        ))}
      </section>
      <section className="container-x mt-16 flex flex-wrap gap-3">
        <Link href={`/${locale}/calculator/`} className={buttonClass("primary", "lg")}>
          {dict.common.openCalculator}
        </Link>
        <LeadModalButton label={dict.common.consult} title={dict.lead.consultTitle} variant="secondary" size="lg" />
      </section>
    </main>
  );
}

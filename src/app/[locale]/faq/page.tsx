import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Icon } from "@/components/ui/icons";
import { faq } from "@/data/content";
import { lt } from "@/i18n";
import { meta, pageLocale, type LocaleParams } from "@/lib/page";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale, dict } = await pageLocale(params);
  return meta(locale, "/faq/", dict.pages.faqTitle);
}

export default async function FaqPage({ params }: LocaleParams) {
  const { locale, dict } = await pageLocale(params);
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: lt(f.q, locale), acceptedAnswer: { "@type": "Answer", text: lt(f.a, locale) } })),
  };
  return (
    <main>
      <PageHeader crumbsLabel={dict.common.breadcrumbs} crumbs={[{ href: `/${locale}/`, label: dict.nav.home }, { label: dict.nav.faq }]} title={dict.pages.faqTitle} />
      <section className="container-x max-w-3xl divide-y divide-line border-y border-line">
        {faq.map((f) => (
          <details key={f.q.ru} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg">
              {lt(f.q, locale)}
              <Icon name="plus" className="shrink-0 transition-transform group-open:rotate-45" />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-ink-3">{lt(f.a, locale)}</p>
          </details>
        ))}
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </main>
  );
}

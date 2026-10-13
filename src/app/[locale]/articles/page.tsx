import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { articles } from "@/data/content";
import { format, lt } from "@/i18n";
import { meta, pageLocale, type LocaleParams } from "@/lib/page";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale, dict } = await pageLocale(params);
  return meta(locale, "/articles/", dict.pages.articlesTitle);
}

export default async function ArticlesPage({ params }: LocaleParams) {
  const { locale, dict } = await pageLocale(params);
  return (
    <main>
      <PageHeader crumbsLabel={dict.common.breadcrumbs} crumbs={[{ href: `/${locale}/`, label: dict.nav.home }, { label: dict.nav.articles }]} title={dict.pages.articlesTitle} lead={dict.pages.draftNotice} />
      <section className="container-x">
        <ul className="divide-y divide-line border-y border-line">
          {articles.map((a, i) => (
            <li key={a.slug}>
              <Link href={`/${locale}/articles/${a.slug}/`} className="group grid gap-4 py-8 md:grid-cols-[80px_1fr_auto] md:items-baseline">
                <span className="dim">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="block font-display text-3xl group-hover:text-bronze">{lt(a.title, locale)}</span>
                  <span className="mt-2 block max-w-2xl text-sm text-ink-3">{lt(a.excerpt, locale)}</span>
                </span>
                <span className="text-xs text-ink-4">{format(dict.pages.readingTime, { min: a.minutes })}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

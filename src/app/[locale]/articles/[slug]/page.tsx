import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { TextBlocks } from "@/components/layout/TextPage";
import { Alert } from "@/components/ui/feedback";
import { articles } from "@/data/content";
import { format, lt } from "@/i18n";
import { meta, pageLocale } from "@/lib/page";

type P = { params: Promise<{ locale: string; slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const { locale } = await pageLocale(params);
  const a = articles.find((x) => x.slug === slug);
  return a ? meta(locale, `/articles/${slug}/`, lt(a.title, locale), lt(a.excerpt, locale)) : {};
}

export default async function ArticlePage({ params }: P) {
  const { slug } = await params;
  const { locale, dict } = await pageLocale(params);
  const a = articles.find((x) => x.slug === slug);
  if (!a) notFound();
  return (
    <main>
      <PageHeader
        crumbsLabel={dict.common.breadcrumbs}
        crumbs={[{ href: `/${locale}/`, label: dict.nav.home }, { href: `/${locale}/articles/`, label: dict.nav.articles }, { label: lt(a.title, locale) }]}
        eyebrow={format(dict.pages.readingTime, { min: a.minutes })}
        title={lt(a.title, locale)}
        lead={lt(a.excerpt, locale)}
      />
      <article className="container-x space-y-8">
        <Alert tone="info">{dict.pages.draftNotice}</Alert>
        <TextBlocks blocks={a.body.map((b) => ({ h: b.h ? lt(b.h, locale) : undefined, p: lt(b.p, locale) }))} />
      </article>
    </main>
  );
}

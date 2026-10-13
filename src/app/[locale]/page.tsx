import Link from "next/link";
import type { Metadata } from "next";
import { HeroIntro } from "@/components/home/HeroIntro";
import { PresetTeaser } from "@/components/home/PresetTeaser";
import { buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { providers } from "@/integration/server";
import { lt } from "@/i18n";
import { faq } from "@/data/content";
import { meta, pageLocale, type LocaleParams } from "@/lib/page";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale, dict } = await pageLocale(params);
  return { ...meta(locale, "/", `${dict.meta.siteName} — ${dict.meta.tagline}`), title: { absolute: `${dict.meta.siteName} — ${dict.meta.tagline}` } };
}

export default async function Home({ params }: LocaleParams) {
  const { locale, dict } = await pageLocale(params);
  const { catalog } = providers();
  const [categories, products] = await Promise.all([catalog.listCategories(), catalog.listProducts()]);
  const L = (p: string) => `/${locale}${p}`;
  const pillarLinks = ["/catalog/", "/configurator/", "/calculator/"];
  const pillarIcons = ["layers", "cube", "calc"] as const;

  return (
    <main>
      <HeroIntro />

      <section className="container-x grid gap-10 py-24 lg:grid-cols-[1fr_2fr]">
        <div>
          <p className="eyebrow">01 · Platform</p>
          <h2 className="display-2 mt-4">{dict.home.pillarsTitle}</h2>
        </div>
        <div className="grid gap-px bg-line sm:grid-cols-3">
          {dict.home.pillars.map((p, i) => (
            <Link key={p.title} href={L(pillarLinks[i]!)} className="group flex flex-col gap-4 bg-paper p-6 transition-colors hover:bg-white">
              <Icon name={pillarIcons[i]!} size={26} className="text-bronze" />
              <h3 className="font-display text-2xl">{p.title}</h3>
              <p className="text-sm leading-relaxed text-ink-3">{p.text}</p>
              <span className="mt-auto text-sm text-ink-2 group-hover:text-bronze">{dict.common.learnMore} →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-white py-24">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow">02 · Catalog</p>
              <h2 className="display-2 mt-4">{dict.home.categoriesTitle}</h2>
            </div>
            <Link href={L("/catalog/")} className={buttonClass("secondary")}>
              {dict.nav.catalog} →
            </Link>
          </div>
          <ul className="mt-12 grid grid-cols-2 gap-px bg-line sm:grid-cols-3 lg:grid-cols-4">
            {categories
              .filter((c) => c.id !== "accessories")
              .map((c, i) => {
                const count = products.filter((p) => p.categoryId === c.id).length;
                return (
                  <li key={c.id} className="bg-white">
                    <Link href={L(`/catalog/${c.slug}/`)} className="group flex h-full flex-col justify-between gap-6 p-5 transition-colors hover:bg-paper">
                      <span className="dim">{String(i + 1).padStart(2, "0")}</span>
                      <span>
                        <span className="block font-display text-[22px] leading-tight group-hover:text-bronze">{lt(c.name, locale)}</span>
                        <span className="mt-1 block text-xs text-ink-4">{dict.catalog.categoryCount.replace("{count}", String(count))}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      </section>

      <section className="container-x py-24">
        <p className="eyebrow">03 · Process</p>
        <h2 className="display-2 mt-4">{dict.home.howTitle}</h2>
        <ol className="mt-12 grid gap-8 md:grid-cols-4">
          {dict.home.how.map((s, i) => (
            <li key={s.title} className="border-t border-ink pt-5">
              <span className="font-display text-5xl text-bronze">{i + 1}</span>
              <h3 className="mt-3 text-lg font-medium">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-3">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="paper-grid border-y border-line py-24">
        <div className="container-x">
          <p className="eyebrow">04 · {dict.home.portfolioTitle}</p>
          <h2 className="display-2 mt-4 mb-12">{dict.home.portfolioTitle}</h2>
          <PresetTeaser />
        </div>
      </section>

      <section className="container-x grid gap-10 py-24 lg:grid-cols-[1fr_2fr]">
        <div>
          <p className="eyebrow">05 · FAQ</p>
          <h2 className="display-2 mt-4">{dict.nav.faq}</h2>
        </div>
        <div className="divide-y divide-line border-y border-line">
          {faq.slice(0, 4).map((f) => (
            <details key={f.q.ru} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg">
                {lt(f.q, locale)}
                <Icon name="plus" className="shrink-0 transition-transform group-open:rotate-45" />
              </summary>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-3">{lt(f.a, locale)}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="bg-ink py-24 text-white">
        <div className="container-x flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="display-2 !text-white">{dict.home.ctaTitle}</h2>
            <p className="mt-4 max-w-xl text-white/70">{dict.home.ctaText}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={L("/configurator/")} className={buttonClass("bronze", "lg")}>
              {dict.nav.configurator}
            </Link>
            <Link href={L("/calculator/")} className={buttonClass("light", "lg")}>
              {dict.calculator.quick}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

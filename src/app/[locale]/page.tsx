import Link from "next/link";
import type { Metadata } from "next";
import { HeroDrawing } from "@/components/home/HeroDrawing";
import { CategoryIndex, DetailsShowcase } from "@/components/home/HomeSections";
import { PresetTeaser } from "@/components/home/PresetTeaser";
import { Reveal, RevealWords } from "@/components/motion/Reveal";
import { buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { providers } from "@/integration/server";
import { lt } from "@/i18n";
import { faq } from "@/data/content";
import { meta, pageLocale, type LocaleParams } from "@/lib/page";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale, dict } = await pageLocale(params);
  return { ...meta(locale, "/", `${dict.meta.siteName} — ${dict.meta.tagline}`), title: { absolute: `${dict.meta.siteName} — ${dict.home.heroTitle}` } };
}

export default async function Home({ params }: LocaleParams) {
  const { locale, dict } = await pageLocale(params);
  const { catalog } = providers();
  const [categories, products] = await Promise.all([catalog.listCategories(), catalog.listProducts()]);
  const counts = Object.fromEntries(categories.map((c) => [c.id, products.filter((p) => p.categoryId === c.id).length]));
  const L = (p: string) => `/${locale}${p}`;
  const pillarLinks = ["/catalog/", "/configurator/", "/calculator/"];
  const pillarIcons = ["layers", "cube", "calc"] as const;

  return (
    <main>
      <HeroDrawing />

      <DetailsShowcase />

      {/* manifesto + tools */}
      <section className="container-x py-24 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <Reveal kind="fade">
              <p className="eyebrow">01 · Platform</p>
            </Reveal>
            <RevealWords text={dict.home.pillarsTitle} className="display-2 mt-5" />
          </div>
          <ol className="divide-y divide-line border-y border-line">
            {dict.home.pillars.map((p, i) => (
              <Reveal as="li" key={p.title} kind="up" delay={i * 90}>
                <Link href={L(pillarLinks[i]!)} className="group grid grid-cols-[40px_1fr_auto] items-start gap-5 py-7">
                  <Icon name={pillarIcons[i]!} size={24} className="mt-1 text-bronze" />
                  <span>
                    <span className="block font-display text-[28px] leading-tight">{p.title}</span>
                    <span className="mt-2 block max-w-lg text-sm leading-relaxed text-ink-3">{p.text}</span>
                  </span>
                  <Icon name="arrow" className="mt-2 transition-transform duration-500 group-hover:translate-x-1.5" />
                </Link>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-line bg-white py-24 sm:py-32">
        <div className="container-x">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div>
              <Reveal kind="fade">
                <p className="eyebrow">02 · Catalog</p>
              </Reveal>
              <RevealWords text={dict.home.categoriesTitle} className="display-2 mt-5" />
            </div>
            <Link href={L("/catalog/")} className={buttonClass("secondary")}>
              {dict.nav.catalog} →
            </Link>
          </div>
          <CategoryIndex categories={categories.filter((c) => c.id !== "accessories")} counts={counts} />
        </div>
      </section>

      <section className="container-x py-24 sm:py-32">
        <Reveal kind="fade">
          <p className="eyebrow">03 · Process</p>
        </Reveal>
        <RevealWords text={dict.home.howTitle} className="display-2 mt-5" />
        <ol className="mt-14 grid gap-10 md:grid-cols-4">
          {dict.home.how.map((s, i) => (
            <Reveal as="li" key={s.title} kind="up" delay={i * 110} className="relative pt-6">
              <Reveal kind="line" delay={i * 110 + 150} className="absolute top-0 left-0 h-px w-full bg-ink">
                <span />
              </Reveal>
              <span className="font-display text-6xl font-light text-bronze">{i + 1}</span>
              <h3 className="mt-4 text-lg font-medium">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-3">{s.text}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="paper-grid border-y border-line bg-paper py-24 sm:py-32">
        <div className="container-x">
          <Reveal kind="fade">
            <p className="eyebrow">04 · {dict.home.beforeAfter}</p>
          </Reveal>
          <RevealWords text={dict.home.portfolioTitle} className="display-2 mt-5 mb-12" />
          <Reveal kind="up">
            <PresetTeaser />
          </Reveal>
        </div>
      </section>

      <section className="container-x grid gap-10 py-24 sm:py-32 lg:grid-cols-[1fr_2fr]">
        <div>
          <Reveal kind="fade">
            <p className="eyebrow">05 · FAQ</p>
          </Reveal>
          <RevealWords text={dict.nav.faq} className="display-2 mt-5" />
        </div>
        <div className="divide-y divide-line border-y border-line">
          {faq.slice(0, 4).map((f, i) => (
            <Reveal key={f.q.ru} kind="up" delay={i * 70}>
              <details className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg">
                  {lt(f.q, locale)}
                  <Icon name="plus" className="shrink-0 transition-transform duration-300 group-open:rotate-45" />
                </summary>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-3">{lt(f.a, locale)}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-ink py-28 text-white sm:py-36">
        <div className="blueprint-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="container-x relative flex flex-col items-start gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <RevealWords text={dict.home.ctaTitle} className="display-2 max-w-2xl !text-white" />
            <Reveal kind="fade" delay={200}>
              <p className="mt-5 max-w-xl text-white/65">{dict.home.ctaText}</p>
            </Reveal>
          </div>
          <Reveal kind="up" delay={250} className="flex flex-wrap gap-3">
            <Link href={L("/configurator/")} className={buttonClass("bronze", "lg")}>
              {dict.home.ctaCreate}
            </Link>
            <Link href={L("/calculator/")} className={buttonClass("light", "lg")}>
              {dict.home.ctaCalc}
            </Link>
          </Reveal>
        </div>
      </section>
    </main>
  );
}

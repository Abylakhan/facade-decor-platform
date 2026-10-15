"use client";
import Link from "next/link";
import { useState } from "react";
import type { Category, Product } from "@/domain/types";
import { lt } from "@/i18n";
import { useI18n } from "@/lib/i18n-context";
import { useCatalog } from "@/lib/catalog-context";
import { productImage } from "@/lib/renders";
import { Reveal, RevealWords } from "@/components/motion/Reveal";
import { Price } from "@/components/catalog/Price";
import { Icon } from "@/components/ui/icons";

/** Dark presentation block: large studio renders of signature products. */
export function DetailsShowcase() {
  const { locale, dict } = useI18n();
  const { product } = useCatalog();
  const items = ["p-k300", "p-w180k", "p-bl", "p-c300", "p-b1"].map(product).filter((p): p is Product => !!p);
  const [hero, ...rest] = items;
  if (!hero) return null;
  const card = (p: Product, big: boolean, delay: number) => (
    <Reveal key={p.id} kind="up" delay={delay} className={big ? "lg:row-span-2" : ""}>
      <Link href={`/${locale}/product/${p.slug}/`} className="group flex h-full flex-col">
        <div className={`relative overflow-hidden bg-[#d6cfc3] ${big ? "aspect-[4/5] lg:aspect-auto lg:min-h-[460px] lg:flex-1" : "aspect-[4/3]"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={productImage(p)} alt={lt(p.name, locale)} loading="lazy" className={`zoom-img h-full w-full ${big ? "absolute inset-0 object-contain" : "object-cover"}`} />
          <span className="absolute top-3 left-3 bg-black/60 px-2 py-1 text-[10px] tracking-[0.18em] text-white uppercase">3D · DEMO</span>
        </div>
        <div className="mt-4 flex items-baseline justify-between gap-4">
          <div>
            <p className="text-[11px] tracking-[0.18em] text-sand uppercase">{p.sku}</p>
            <p className="mt-1 font-display text-2xl text-white">{lt(p.name, locale)}</p>
          </div>
          <Price product={p} className="shrink-0 text-sm text-white/70" />
        </div>
      </Link>
    </Reveal>
  );
  return (
    <section className="bg-deep py-24 text-white sm:py-32">
      <div className="container-x">
        <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
          <div>
            <Reveal kind="line" className="mb-6 h-px w-16 bg-bronze-2">
              <span />
            </Reveal>
            <RevealWords text={dict.home.detailsTitle} className="display-2 !text-white" />
            <Reveal kind="fade" delay={200}>
              <p className="mt-4 max-w-md text-white/60">{dict.home.detailsText}</p>
            </Reveal>
          </div>
          <Link href={`/${locale}/catalog/`} className="u-line text-sm text-white/80 hover:text-white">
            {dict.nav.catalog} →
          </Link>
        </div>
        <div className="grid gap-x-8 gap-y-12 lg:grid-cols-[1.3fr_1fr_1fr] lg:grid-rows-[auto_auto]">
          {card(hero, true, 0)}
          {rest.map((p, i) => card(p, false, 120 * (i + 1)))}
        </div>
      </div>
    </section>
  );
}

/** Editorial category index with a floating preview render on hover. */
export function CategoryIndex({ categories, counts }: { categories: Category[]; counts: Record<string, number> }) {
  const { locale, dict } = useI18n();
  const { products } = useCatalog();
  const [hover, setHover] = useState<string | null>(null);
  const preview = (c: string) => products.find((p) => p.categoryId === c);
  const hovered = hover ? preview(hover) : undefined;
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <ul className="border-t border-line" onMouseLeave={() => setHover(null)}>
        {categories.map((c, i) => (
          <Reveal as="li" key={c.id} kind="fade" delay={Math.min(i, 8) * 40}>
            <Link
              href={`/${locale}/catalog/${c.slug}/`}
              onMouseEnter={() => setHover(c.id)}
              onFocus={() => setHover(c.id)}
              className="group grid grid-cols-[48px_1fr_auto] items-baseline gap-4 border-b border-line py-5 transition-colors hover:bg-surface/60 sm:py-6"
            >
              <span className="dim">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-display text-[26px] leading-tight transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-2 sm:text-[34px]">
                {lt(c.name, locale)}
              </span>
              <span className="flex items-center gap-3 text-xs text-ink-4">
                {dict.catalog.categoryCount.replace("{count}", String(counts[c.id] ?? 0))}
                <Icon name="arrow" size={16} className="-translate-x-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
              </span>
            </Link>
          </Reveal>
        ))}
      </ul>
      <div className="hidden lg:block">
        <div className="sticky top-28 aspect-[4/5] overflow-hidden bg-[#d6cfc3]">
          {products
            .filter((p) => categories.some((c) => preview(c.id)?.id === p.id))
            .map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                src={productImage(p)}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-[var(--ease-out-expo)]"
                style={{ opacity: hovered?.id === p.id ? 1 : 0, transform: hovered?.id === p.id ? "scale(1)" : "scale(1.06)" }}
              />
            ))}
          {!hovered && (
            <div className="paper-grid absolute inset-0 flex items-center justify-center bg-paper text-center">
              <p className="max-w-[14rem] font-display text-2xl text-ink-3">{dict.home.categoriesTitle}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

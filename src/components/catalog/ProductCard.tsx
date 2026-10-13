"use client";
import Link from "next/link";
import type { Product } from "@/domain/types";
import { lt } from "@/i18n";
import { useI18n } from "@/lib/i18n-context";
import { ProductDrawing } from "@/components/drawings/ProductDrawing";
import { Badge } from "@/components/ui/feedback";
import { Price } from "./Price";
import { FavCompareButtons } from "./ProductActions";

export function ProductCard({ product, onQuickView }: { product: Product; onQuickView?: (p: Product) => void }) {
  const { locale, dict } = useI18n();
  const href = `/${locale}/product/${product.slug}/`;
  return (
    <article className="group relative flex flex-col border border-line bg-white transition-shadow duration-[var(--duration-base)] hover:shadow-[var(--shadow-soft)]">
      <div className="paper-grid relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-paper p-6">
        <ProductDrawing product={product} className="h-full w-full transition-transform duration-[var(--duration-slow)] ease-[var(--ease-arch)] group-hover:scale-[1.04]" />
        <div className="absolute top-3 left-3 flex gap-1.5">
          {product.source === "demo" && <Badge tone="demo">DEMO</Badge>}
          <Badge tone={product.availability === "in-stock" ? "ok" : "neutral"}>{dict.availability[product.availability]}</Badge>
        </div>
        <div className="absolute top-3 right-3 z-10 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <FavCompareButtons product={product} compact />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="dim">{product.sku}</p>
        <h3 className="text-[15px] leading-snug font-medium">
          <Link href={href} className="after:absolute after:inset-0 after:content-['']">
            {lt(product.name, locale)}
          </Link>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <Price product={product} className="text-[15px]" />
          {onQuickView && (
            <button type="button" onClick={() => onQuickView(product)} className="relative z-10 text-xs text-ink-3 underline-offset-4 hover:text-ink hover:underline">
              {dict.common.quickView}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

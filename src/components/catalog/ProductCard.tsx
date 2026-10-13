"use client";
import Link from "next/link";
import type { Product } from "@/domain/types";
import { lt } from "@/i18n";
import { useI18n } from "@/lib/i18n-context";
import { ProductDrawing } from "@/components/drawings/ProductDrawing";
import { productImage } from "@/lib/renders";
import { Badge } from "@/components/ui/feedback";
import { Price } from "./Price";
import { FavCompareButtons } from "./ProductActions";

export function ProductCard({ product, onQuickView }: { product: Product; onQuickView?: (p: Product) => void }) {
  const { locale, dict } = useI18n();
  const href = `/${locale}/product/${product.slug}/`;
  return (
    <article className="group relative flex flex-col bg-white transition-[box-shadow,transform] duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#d6cfc3]">
        {/* studio render (3D visualisation from the product data) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={productImage(product)} alt={lt(product.name, locale)} loading="lazy" className="zoom-img absolute inset-0 h-full w-full object-cover" />
        {/* technical drawing fades in on hover */}
        <div className="paper-grid absolute inset-0 flex items-center justify-center bg-paper/95 p-6 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          <ProductDrawing product={product} className="h-full w-full" />
        </div>
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

"use client";
import Link from "next/link";
import type { MouseEvent } from "react";
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
  // subtle depth: the card tilts towards the cursor (mouse only)
  const tilt = (e: MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--rx", `${((e.clientY - r.top) / r.height - 0.5) * -4}deg`);
    e.currentTarget.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 5}deg`);
  };
  const untilt = (e: MouseEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty("--rx", "0deg");
    e.currentTarget.style.setProperty("--ry", "0deg");
  };
  return (
    <article
      onMouseMove={tilt}
      onMouseLeave={untilt}
      style={{ transform: "perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))" }}
      className="group relative flex flex-col border border-line bg-surface transition-[box-shadow,transform,border-color] duration-500 ease-[var(--ease-out-expo)] hover:border-line-strong hover:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)]"
    >
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

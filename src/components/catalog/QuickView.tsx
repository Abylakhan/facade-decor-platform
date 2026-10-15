"use client";
import Link from "next/link";
import type { Product } from "@/domain/types";
import { lt } from "@/i18n";
import { useI18n } from "@/lib/i18n-context";
import { Modal } from "@/components/ui/Modal";
import { ProductDrawing } from "@/components/drawings/ProductDrawing";
import { Badge } from "@/components/ui/feedback";
import { Price } from "./Price";
import { AddToProjectButton, FavCompareButtons } from "./ProductActions";
import { ProductSpecs } from "./ProductSpecs";

export function QuickView({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { locale, dict } = useI18n();
  if (!product) return null;
  return (
    <Modal open onClose={onClose} title={lt(product.name, locale)} wide closeLabel={dict.nav.close}>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="paper-grid flex aspect-square items-center justify-center border border-line bg-surface p-6">
          <ProductDrawing product={product} className="h-full w-full" title={dict.product.drawing} />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            {product.source === "demo" && <Badge tone="demo">DEMO</Badge>}
            <Badge>{dict.availability[product.availability]}</Badge>
          </div>
          <p className="text-sm text-ink-3">{lt(product.description, locale)}</p>
          <Price product={product} className="text-2xl" />
          <div className="flex flex-wrap items-start gap-2">
            <AddToProjectButton product={product} />
            <FavCompareButtons product={product} />
          </div>
          <ProductSpecs product={product} />
          <Link href={`/${locale}/product/${product.slug}/`} className="link text-sm">
            {dict.common.details} →
          </Link>
        </div>
      </div>
    </Modal>
  );
}

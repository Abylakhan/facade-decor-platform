"use client";
import type { Product } from "@/domain/types";
import { fmtMoney } from "@/i18n";
import { useI18n } from "@/lib/i18n-context";
import { useCatalog } from "@/lib/catalog-context";

export function Price({ product, className = "" }: { product: Product; className?: string }) {
  const { locale, dict } = useI18n();
  const { price } = useCatalog();
  const v = price(product.id);
  if (v === null) return <span className={`text-ink-3 ${className}`}>{dict.common.priceOnRequest}</span>;
  return (
    <span className={`num ${className}`}>
      {fmtMoney(v, locale)}
      <span className="ml-1 text-xs text-ink-4">/ {dict.units[product.saleUnit]}</span>
    </span>
  );
}

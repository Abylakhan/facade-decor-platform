"use client";
import Link from "next/link";
import type { Product } from "@/domain/types";
import { fmtNumber, lt } from "@/i18n";
import { useI18n } from "@/lib/i18n-context";
import { useCatalog } from "@/lib/catalog-context";
import { useCompare, useFavorites } from "@/lib/stores";
import { EmptyState } from "@/components/ui/feedback";
import { buttonClass } from "@/components/ui/Button";
import { ProductCard } from "./ProductCard";
import { Price } from "./Price";
import { AddToProjectButton } from "./ProductActions";
import { ProductDrawing } from "@/components/drawings/ProductDrawing";

export function FavoritesList() {
  const { locale, dict } = useI18n();
  const { product } = useCatalog();
  const { list } = useFavorites();
  const items = list.map(product).filter((p): p is Product => !!p);
  if (!items.length)
    return (
      <EmptyState
        icon="heart"
        title={dict.pages.favoritesEmpty}
        action={
          <Link href={`/${locale}/catalog/`} className={buttonClass("secondary")}>
            {dict.nav.catalog}
          </Link>
        }
      />
    );
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export function CompareTable() {
  const { locale, dict } = useI18n();
  const { product } = useCatalog();
  const { list, toggle } = useCompare();
  const items = list.map(product).filter((p): p is Product => !!p);
  if (!items.length)
    return (
      <EmptyState
        icon="compare"
        title={dict.pages.compareEmpty}
        action={
          <Link href={`/${locale}/catalog/`} className={buttonClass("secondary")}>
            {dict.nav.catalog}
          </Link>
        }
      />
    );
  const dimKeys = ["length", "width", "height", "depth", "diameter"] as const;
  const rows: [string, (p: Product) => React.ReactNode][] = [
    [dict.product.sku, (p) => p.sku],
    [dict.calc.unitPrice, (p) => <Price product={p} />],
    [dict.product.material, (p) => dict.materials[p.material]],
    ...dimKeys.map((k) => [dict.dims[k], (p: Product) => (p.dimensions[k] ? `${fmtNumber(p.dimensions[k]!, locale)} ${dict.units.mm}` : "—")] as [string, (p: Product) => React.ReactNode]),
    [dict.product.saleUnit, (p) => dict.units[p.saleUnit]],
    [dict.product.usableLength, (p) => (p.linear ? `${fmtNumber(p.linear.usableLength, locale)} ${dict.units.m}` : "—")],
    [dict.product.waste, (p) => (p.wastePercent !== undefined ? `${fmtNumber(p.wastePercent * 100, locale)} %` : "—")],
    [dict.catalog.availability, (p) => dict.availability[p.availability]],
    [dict.product.placements, (p) => p.placements.map((x) => dict.placement[x]).join(", ")],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="table-base min-w-[720px]">
        <thead>
          <tr>
            <th className="w-44" />
            {items.map((p) => (
              <th key={p.id} className="!normal-case !tracking-normal">
                <div className="paper-grid mb-2 aspect-[4/3] border border-line bg-surface p-2">
                  <ProductDrawing product={p} className="h-full w-full" />
                </div>
                <Link href={`/${locale}/product/${p.slug}/`} className="link text-sm font-medium text-ink">
                  {lt(p.name, locale)}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, f]) => (
            <tr key={label}>
              <th scope="row" className="!text-[12px] !normal-case !tracking-normal">
                {label}
              </th>
              {items.map((p) => (
                <td key={p.id} className="num">
                  {f(p)}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td />
            {items.map((p) => (
              <td key={p.id} className="space-y-2">
                <AddToProjectButton product={p} size="sm" />
                <button type="button" onClick={() => toggle(p.id)} className="block text-xs text-ink-3 hover:text-danger">
                  {dict.common.uncompare}
                </button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

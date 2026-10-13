"use client";
import Link from "next/link";
import type { Product } from "@/domain/types";
import { fmtNumber, lt } from "@/i18n";
import { useI18n } from "@/lib/i18n-context";
import { useCatalog } from "@/lib/catalog-context";

/** Only the fields that apply to this product type are shown. */
export function ProductSpecs({ product }: { product: Product }) {
  const { locale, dict } = useI18n();
  const { categories, product: find } = useCatalog();
  const d = dict.product;
  const cat = categories.find((c) => c.id === product.categoryId);
  const rows: [string, React.ReactNode][] = [
    [d.sku, product.sku],
    [d.category, cat ? lt(cat.name, locale) : product.categoryId],
    [d.material, dict.materials[product.material]],
    ...(Object.entries(product.dimensions) as [keyof typeof dict.dims, number][]).map(
      ([k, v]) => [dict.dims[k], `${fmtNumber(v, locale)} ${dict.units.mm}`] as [string, React.ReactNode],
    ),
    [d.saleUnit, dict.units[product.saleUnit]],
  ];
  if (product.minOrder) rows.push([d.minOrder, `${product.minOrder} ${dict.units[product.saleUnit]}`]);
  if (product.linear) {
    rows.push([d.stockLength, `${fmtNumber(product.linear.nominalLength, locale)} ${dict.units.m}`]);
    rows.push([d.usableLength, `${fmtNumber(product.linear.usableLength, locale)} ${dict.units.m}`]);
    rows.push([d.cutAllowance, `${product.linear.cutAllowance} ${dict.units.mm}`]);
  }
  if (product.wastePercent !== undefined) rows.push([d.waste, `${fmtNumber(product.wastePercent * 100, locale)} %`]);
  if (product.reservePercent !== undefined) rows.push([d.reserve, `${fmtNumber(product.reservePercent * 100, locale)} %`]);
  if (product.piece?.moduleHeight) rows.push([d.module, `${product.piece.moduleHeight} ${dict.units.mm}`]);
  if (product.piece?.minHeight || product.piece?.maxHeight)
    rows.push([d.heightRange, `${fmtNumber((product.piece.minHeight ?? 0) / 1000, locale)}–${fmtNumber((product.piece.maxHeight ?? 0) / 1000, locale)} ${dict.units.m}`]);
  if (product.piece?.minRatio) rows.push([d.ratio, `${product.piece.minRatio}–${product.piece.maxRatio}`]);
  if (product.piece?.sectionLength) rows.push([d.section, `${fmtNumber(product.piece.sectionLength, locale)} ${dict.units.m}`]);
  if (product.area) rows.push([d.consumption, `${fmtNumber(product.area.consumptionPerM2, locale)} ${dict.units.kg}/${dict.units.m2}`]);
  rows.push([d.placements, product.placements.map((p) => dict.placement[p]).join(", ")]);
  if (product.kitIncludes?.length)
    rows.push([
      d.kit,
      product.kitIncludes.map((k) => {
        const p = find(k.productId);
        return p ? (
          <Link key={k.productId} href={`/${locale}/product/${p.slug}/`} className="link">
            {p.sku}
          </Link>
        ) : null;
      }),
    ]);
  if (product.consumables?.length)
    rows.push([
      d.consumables,
      product.consumables
        .map((c) => `${find(c.productId)?.sku ?? c.productId}: ${fmtNumber(c.rate, locale)} / ${c.per === "m" ? dict.units.m : dict.units.piece}`)
        .join("; "),
    ]);

  return (
    <dl className="divide-y divide-line border-y border-line text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-4 py-2.5">
          <dt className="text-ink-3">{k}</dt>
          <dd className="num">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

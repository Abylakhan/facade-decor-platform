"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Product } from "@/domain/types";
import { format, lt } from "@/i18n";
import { useI18n } from "@/lib/i18n-context";
import { useCatalog } from "@/lib/catalog-context";
import { ProductDrawing } from "@/components/drawings/ProductDrawing";
import { productImage } from "@/lib/renders";
import { Alert, Badge, Skeleton } from "@/components/ui/feedback";
import { Tabs } from "@/components/ui/Tabs";
import { LeadModalButton } from "@/components/forms/LeadModalButton";
import { hasWebGL } from "@/components/three/webgl";
import { Price } from "./Price";
import { AddToProjectButton, FavCompareButtons } from "./ProductActions";
import { ProductCard } from "./ProductCard";
import { ProductSpecs } from "./ProductSpecs";

const Preview3D = dynamic(() => import("@/components/three/ProductPreview3D"), { ssr: false, loading: () => <Skeleton className="h-full w-full" /> });

export function ProductDetail({ product }: { product: Product }) {
  const { locale, dict } = useI18n();
  const { product: find, price } = useCatalog();
  const [tab, setTab] = useState<"render" | "drawing" | "3d">("render");
  const [gl, setGl] = useState(false);
  useEffect(() => setGl(hasWebGL()), []);
  const related = [...new Set([...(product.related ?? []), ...(product.compatibleWith ?? [])])].map(find).filter((p): p is Product => !!p);
  const noPrice = price(product.id) === null;

  return (
    <>
      <div className="container-x grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <Tabs
            label={dict.product.drawing}
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "render", label: locale === "kk" ? "Визуализация" : "Визуализация" },
              { id: "drawing", label: product.linear ? dict.product.profileDrawing : dict.product.drawing },
              ...(gl ? [{ id: "3d" as const, label: dict.product.preview3d }] : []),
            ]}
          />
          <div key={tab} className="page-in relative mt-4 aspect-[4/3] overflow-hidden border border-line bg-surface">
            {tab === "render" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={productImage(product)} alt={lt(product.name, locale)} className="h-full w-full object-cover" />
            ) : tab === "drawing" ? (
              <div className="paper-grid flex h-full items-center justify-center p-8">
                <ProductDrawing product={product} className="h-full w-full" title={dict.product.drawing} />
              </div>
            ) : (
              <Preview3D product={product} />
            )}
          </div>
          <p className="mt-3 text-xs text-ink-4">{dict.product.photosMissing}</p>
        </div>
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            {product.source === "demo" && <Badge tone="demo">DEMO</Badge>}
            <Badge tone={product.availability === "in-stock" ? "ok" : "neutral"}>{dict.availability[product.availability]}</Badge>
          </div>
          <p className="text-ink-3">{lt(product.description, locale)}</p>
          <div>
            <Price product={product} className="font-display text-4xl" />
            {!noPrice && <p className="mt-1 text-xs text-ink-4">{format(dict.product.priceNote, { unit: dict.units[product.saleUnit] })}</p>}
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <AddToProjectButton product={product} size="lg" />
            {noPrice && <LeadModalButton label={dict.common.requestPrice} title={dict.product.requestTitle} variant="secondary" size="lg" comment={`${dict.product.requestTitle}: ${product.sku}`} />}
            <FavCompareButtons product={product} />
          </div>
          {product.source === "demo" && <Alert tone="warn">{dict.common.demoNotice}</Alert>}
          <h2 className="eyebrow mt-4">{dict.product.specs}</h2>
          <ProductSpecs product={product} />
          <Link href={`/${locale}/calculator/`} className="link text-sm">
            {dict.common.openCalculator} →
          </Link>
        </div>
      </div>
      {related.length > 0 && (
        <section className="container-x mt-20">
          <h2 className="display-3 mb-6">{dict.product.related}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

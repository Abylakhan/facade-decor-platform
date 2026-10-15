"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Availability, CategoryId, MaterialId, Product } from "@/domain/types";
import { format, lt } from "@/i18n";
import { useI18n } from "@/lib/i18n-context";
import { useCatalog } from "@/lib/catalog-context";
import { searchProducts } from "@/lib/search";
import { Checkbox, Input, NumberInput, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icons";
import { ProductCard } from "./ProductCard";
import { QuickView } from "./QuickView";

type Sort = "popular" | "priceAsc" | "priceDesc" | "name";

/** Client-side search, filters and sorting; state is mirrored to the URL (shareable). */
export function CatalogBrowser({ fixedCategory }: { fixedCategory?: CategoryId }) {
  const { locale, dict } = useI18n();
  const { products, categories, price } = useCatalog();
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [cats, setCats] = useState<CategoryId[]>(fixedCategory ? [fixedCategory] : ((sp.get("cat")?.split(",").filter(Boolean) as CategoryId[]) ?? []));
  const [mats, setMats] = useState<MaterialId[]>((sp.get("mat")?.split(",").filter(Boolean) as MaterialId[]) ?? []);
  const [avail, setAvail] = useState<Availability[]>([]);
  const [pmin, setPmin] = useState<number | null>(sp.get("pmin") ? Number(sp.get("pmin")) : null);
  const [pmax, setPmax] = useState<number | null>(sp.get("pmax") ? Number(sp.get("pmax")) : null);
  const [smin, setSmin] = useState<number | null>(null);
  const [smax, setSmax] = useState<number | null>(null);
  const [sort, setSort] = useState<Sort>((sp.get("sort") as Sort) ?? "popular");
  const [quick, setQuick] = useState<Product | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (!fixedCategory && cats.length) params.set("cat", cats.join(","));
    if (mats.length) params.set("mat", mats.join(","));
    if (pmin !== null) params.set("pmin", String(pmin));
    if (pmax !== null) params.set("pmax", String(pmax));
    if (sort !== "popular") params.set("sort", sort);
    const s = params.toString();
    router.replace(s ? `?${s}` : "?", { scroll: false });
  }, [q, cats, mats, pmin, pmax, sort, fixedCategory, router]);

  const results = useMemo(() => {
    let list = searchProducts(products, categories, q);
    if (cats.length) list = list.filter((p) => cats.includes(p.categoryId));
    if (mats.length) list = list.filter((p) => mats.includes(p.material));
    if (avail.length) list = list.filter((p) => avail.includes(p.availability));
    const size = (p: Product) => p.linear?.profileHeight ?? p.dimensions.width ?? p.dimensions.diameter ?? p.dimensions.height;
    if (smin !== null) list = list.filter((p) => (size(p) ?? -1) >= smin);
    if (smax !== null) list = list.filter((p) => (size(p) ?? Infinity) <= smax);
    if (pmin !== null) list = list.filter((p) => (price(p.id) ?? -1) >= pmin);
    if (pmax !== null) list = list.filter((p) => price(p.id) !== null && price(p.id)! <= pmax);
    const sorted = [...list];
    if (sort === "priceAsc") sorted.sort((a, b) => (price(a.id) ?? Infinity) - (price(b.id) ?? Infinity));
    if (sort === "priceDesc") sorted.sort((a, b) => (price(b.id) ?? -1) - (price(a.id) ?? -1));
    if (sort === "name") sorted.sort((a, b) => lt(a.name, locale).localeCompare(lt(b.name, locale), locale));
    return sorted;
  }, [products, categories, q, cats, mats, avail, smin, smax, pmin, pmax, sort, price, locale]);

  const toggle = <T,>(list: T[], v: T, set: (x: T[]) => void) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const reset = () => {
    setQ("");
    if (!fixedCategory) setCats([]);
    setMats([]);
    setAvail([]);
    setPmin(null);
    setPmax(null);
    setSmin(null);
    setSmax(null);
  };
  const materials = [...new Set(products.map((p) => p.material))];

  const filters = (
    <div className="space-y-7">
      {!fixedCategory && (
        <fieldset>
          <legend className="eyebrow mb-3">{dict.catalog.category}</legend>
          <div className="flex flex-col gap-2">
            {categories.map((c) => (
              <Checkbox key={c.id} label={lt(c.name, locale)} checked={cats.includes(c.id)} onChange={() => toggle(cats, c.id, setCats)} />
            ))}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend className="eyebrow mb-3">{dict.catalog.material}</legend>
        <div className="flex flex-col gap-2">
          {materials.map((m) => (
            <Checkbox key={m} label={dict.materials[m]} checked={mats.includes(m)} onChange={() => toggle(mats, m, setMats)} />
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="eyebrow mb-3">{dict.catalog.availability}</legend>
        <div className="flex flex-col gap-2">
          {(["in-stock", "to-order", "on-request"] as Availability[]).map((a) => (
            <Checkbox key={a} label={dict.availability[a]} checked={avail.includes(a)} onChange={() => toggle(avail, a, setAvail)} />
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="eyebrow mb-3">{dict.catalog.price}</legend>
        <div className="grid grid-cols-2 gap-2">
          <NumberInput aria-label={`${dict.catalog.price} ${dict.catalog.priceMin}`} placeholder={dict.catalog.priceMin} value={pmin} onValue={setPmin} min={0} />
          <NumberInput aria-label={`${dict.catalog.price} ${dict.catalog.priceMax}`} placeholder={dict.catalog.priceMax} value={pmax} onValue={setPmax} min={0} />
        </div>
      </fieldset>
      <fieldset>
        <legend className="eyebrow mb-3">{dict.catalog.size}</legend>
        <div className="grid grid-cols-2 gap-2">
          <NumberInput aria-label={`${dict.catalog.size} ${dict.catalog.priceMin}`} placeholder={dict.catalog.priceMin} value={smin} onValue={setSmin} min={0} unit={dict.units.mm} />
          <NumberInput aria-label={`${dict.catalog.size} ${dict.catalog.priceMax}`} placeholder={dict.catalog.priceMax} value={smax} onValue={setSmax} min={0} unit={dict.units.mm} />
        </div>
      </fieldset>
      <Button variant="ghost" size="sm" onClick={reset} icon="close">
        {dict.catalog.resetFilters}
      </Button>
    </div>
  );

  return (
    <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
      <aside className="hidden lg:block" aria-label={dict.catalog.filters}>
        {filters}
      </aside>
      <div>
        <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <label htmlFor="catalog-q" className="sr-only">
              {dict.nav.search}
            </label>
            <Icon name="search" size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-4" />
            <Input id="catalog-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={dict.nav.searchPlaceholder} className="pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="lg:hidden" icon="layers" onClick={() => setFiltersOpen(true)}>
              {dict.catalog.filters}
            </Button>
            <label htmlFor="catalog-sort" className="sr-only">
              {dict.catalog.sort}
            </label>
            <Select id="catalog-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-auto min-w-48">
              {(Object.keys(dict.catalog.sortOptions) as Sort[]).map((s) => (
                <option key={s} value={s}>
                  {dict.catalog.sortOptions[s]}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <p className="mt-4 text-xs text-ink-4" aria-live="polite">
          {format(dict.catalog.found, { count: results.length })}
        </p>
        {results.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon="search"
              title={products.length ? dict.catalog.empty : dict.catalog.emptyCategory}
              text={dict.catalog.emptyText}
              action={
                <Button variant="secondary" onClick={reset}>
                  {dict.catalog.resetFilters}
                </Button>
              }
            />
          </div>
        ) : (
          <div key={results.map((p) => p.id).join("|")} className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((p, i) => (
              <div key={p.id} className="step-in" style={{ animationDelay: `${Math.min(i, 9) * 45}ms` }}>
                <ProductCard product={p} onQuickView={setQuick} />
              </div>
            ))}
          </div>
        )}
        {fixedCategory && (
          <p className="mt-8 text-sm">
            <Link href={`/${locale}/catalog/`} className="link">
              ← {dict.catalog.title}
            </Link>
          </p>
        )}
      </div>
      {filtersOpen && (
        <div className="fixed inset-0 z-[90] flex lg:hidden" role="dialog" aria-modal="true" aria-label={dict.catalog.filters}>
          <div className="absolute inset-0 bg-black/65" onClick={() => setFiltersOpen(false)} />
          <div className="relative mr-auto h-full w-[86%] max-w-sm overflow-auto bg-paper p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-2xl">{dict.catalog.filters}</h2>
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label={dict.nav.close} className="h-10 w-10" autoFocus>
                <Icon name="close" />
              </button>
            </div>
            {filters}
            <Button className="mt-6 w-full" onClick={() => setFiltersOpen(false)}>
              {format(dict.catalog.found, { count: results.length })}
            </Button>
          </div>
        </div>
      )}
      <QuickView product={quick} onClose={() => setQuick(null)} />
    </div>
  );
}

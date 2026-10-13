"use client";
import { createContext, useContext, useMemo } from "react";
import type { Category, PriceList, Product } from "@/domain/types";

interface CatalogData {
  products: Product[];
  categories: Category[];
  prices: PriceList;
  product: (id: string) => Product | undefined;
  price: (id: string) => number | null;
}

const Ctx = createContext<CatalogData | null>(null);

/** Catalog + current price list, loaded on the server from the configured providers. */
export function CatalogDataProvider({
  products,
  categories,
  prices,
  children,
}: {
  products: Product[];
  categories: Category[];
  prices: PriceList;
  children: React.ReactNode;
}) {
  const value = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    return {
      products,
      categories,
      prices,
      product: (id: string) => byId.get(id),
      price: (id: string) => prices.items[id] ?? null,
    };
  }, [products, categories, prices]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalog() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCatalog outside CatalogDataProvider");
  return v;
}

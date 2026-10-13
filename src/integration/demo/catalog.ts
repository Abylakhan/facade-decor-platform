/** DEMO providers: in-memory fictional data. Not connected to any CRM. */
import { demoCategories, demoProducts } from "@/data/demo-catalog";
import { demoPriceList } from "@/data/demo-prices";
import type { CatalogProvider, PricingProvider, ProductQuery } from "../types";

export class DemoCatalogProvider implements CatalogProvider {
  readonly source = "demo" as const;
  async listCategories() {
    return [...demoCategories].sort((a, b) => a.order - b.order);
  }
  async listProducts(q: ProductQuery = {}) {
    return demoProducts.filter((p) => (!q.categoryId || p.categoryId === q.categoryId) && (!q.ids || q.ids.includes(p.id)));
  }
  async getProduct(idOrSlug: string) {
    return demoProducts.find((p) => p.id === idOrSlug || p.slug === idOrSlug) ?? null;
  }
}

export class DemoPricingProvider implements PricingProvider {
  readonly source = "demo" as const;
  async getPriceList() {
    return demoPriceList;
  }
}

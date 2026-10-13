/**
 * CRM adapter — NOT IMPLEMENTED YET.
 *
 * No access to the existing CRM has been provided, so its API, authentication,
 * entities and field names are unknown. This file deliberately does not invent
 * them. Once access is granted:
 *   1. Implement `HttpCrmAdapter` methods against the real API.
 *   2. Write mappers CRM entity → domain types (see docs/CRM_INTEGRATION.md).
 *   3. Run the contract tests in src/integration/contract.test.ts against it.
 *   4. Switch DATA_SOURCE=crm in the server environment.
 */
import type { CRMAdapter, CatalogProvider, PricingProvider, ProductQuery } from "../types";

export class CrmNotConfiguredError extends Error {
  constructor(what: string) {
    super(`CRM integration is not configured: ${what}. See docs/CRM_INTEGRATION.md`);
    this.name = "CrmNotConfiguredError";
  }
}

export interface CrmConfig {
  baseUrl?: string;
  /** Server-only secret. Never expose it with a NEXT_PUBLIC_ prefix. */
  token?: string;
}

export class HttpCrmAdapter implements CRMAdapter {
  constructor(private readonly config: CrmConfig) {
    if (!config.baseUrl || !config.token) throw new CrmNotConfiguredError("CRM_BASE_URL / CRM_API_TOKEN missing");
  }
  private todo(op: string): never {
    throw new CrmNotConfiguredError(`operation "${op}" has no mapping to the real CRM API yet`);
  }
  fetchCategories() {
    return this.todo("fetchCategories");
  }
  fetchProducts() {
    return this.todo("fetchProducts");
  }
  fetchProduct(_id: string) {
    return this.todo("fetchProduct");
  }
  fetchPriceList() {
    return this.todo("fetchPriceList");
  }
  createLead() {
    return this.todo("createLead");
  }
}

/** Catalog provider backed by the CRM adapter (thin; caching policy to be agreed). */
export class CrmCatalogProvider implements CatalogProvider {
  readonly source = "crm" as const;
  constructor(private readonly crm: CRMAdapter) {}
  listCategories() {
    return this.crm.fetchCategories();
  }
  async listProducts(q: ProductQuery = {}) {
    const all = await this.crm.fetchProducts();
    return all.filter((p) => (!q.categoryId || p.categoryId === q.categoryId) && (!q.ids || q.ids.includes(p.id)));
  }
  async getProduct(idOrSlug: string) {
    return this.crm.fetchProduct(idOrSlug);
  }
}

export class CrmPricingProvider implements PricingProvider {
  readonly source = "crm" as const;
  constructor(private readonly crm: CRMAdapter) {}
  getPriceList() {
    return this.crm.fetchPriceList();
  }
}

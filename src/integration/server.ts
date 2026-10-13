/**
 * Server-side provider selection. Runs at build time (static export) or on the
 * server in a Node deployment. The public UI has no way to switch modes.
 */
import "server-only";
import { CrmCatalogProvider, CrmPricingProvider, HttpCrmAdapter } from "./crm/adapter";
import { DemoCatalogProvider, DemoPricingProvider } from "./demo/catalog";
import type { CatalogProvider, DataSource, PricingProvider } from "./types";

export function dataSource(): DataSource {
  return process.env.DATA_SOURCE === "crm" ? "crm" : "demo";
}

let cached: { catalog: CatalogProvider; pricing: PricingProvider } | null = null;

export function providers() {
  if (cached) return cached;
  if (dataSource() === "crm") {
    const crm = new HttpCrmAdapter({ baseUrl: process.env.CRM_BASE_URL, token: process.env.CRM_API_TOKEN });
    cached = { catalog: new CrmCatalogProvider(crm), pricing: new CrmPricingProvider(crm) };
  } else {
    cached = { catalog: new DemoCatalogProvider(), pricing: new DemoPricingProvider() };
  }
  return cached;
}

/**
 * Integration contracts. The public site talks only to these interfaces;
 * implementations are chosen by server configuration (DATA_SOURCE), never by UI.
 *
 *   DATA_SOURCE=demo  → DemoCatalogProvider / DemoPricingProvider (fictional data)
 *   DATA_SOURCE=crm   → CrmCatalogProvider / CrmPricingProvider over a CRMAdapter
 *
 * The CRM is the source of truth for production catalog, prices and leads.
 */
import type { Category, CategoryId, Estimate, PriceList, Product, Project } from "@/domain/types";
import type { LeadInput } from "@/domain/schemas";

export type DataSource = "demo" | "crm";

export interface ProductQuery {
  categoryId?: CategoryId;
  ids?: string[];
}

export interface CatalogProvider {
  readonly source: DataSource;
  listCategories(): Promise<Category[]>;
  listProducts(query?: ProductQuery): Promise<Product[]>;
  getProduct(idOrSlug: string): Promise<Product | null>;
}

export interface PricingProvider {
  readonly source: DataSource;
  /** Current price list. Saved estimates keep the version they were computed with. */
  getPriceList(): Promise<PriceList>;
}

/** Where saved projects live. The demo implementation is browser-only. */
export interface ProjectProvider {
  readonly storage: "browser" | "server";
  list(): Promise<Project[]>;
  get(id: string): Promise<Project | null>;
  save(project: Project): Promise<Project>;
  remove(id: string): Promise<void>;
}

export interface LeadSubmission {
  lead: LeadInput;
  project?: Project;
  /** Client-side estimate; the server must recompute and never trust it blindly. */
  clientEstimate?: Estimate;
}

export type LeadResult =
  | { status: "demo-stored"; delivered: false; reference: string }
  | { status: "accepted"; delivered: true; reference: string; crmStatus?: string }
  | { status: "duplicate"; delivered: boolean; reference: string }
  | { status: "rejected"; delivered: false; errors: string[] };

export interface QuoteProvider {
  readonly mode: DataSource;
  submitLead(input: LeadSubmission): Promise<LeadResult>;
}

/**
 * Operations the site will need from the existing CRM. Which of them the CRM
 * actually supports is UNKNOWN until API access is granted — optional members
 * mark capabilities that may not exist.
 */
export interface CRMAdapter {
  fetchCategories(): Promise<Category[]>;
  fetchProducts(): Promise<Product[]>;
  fetchProduct(id: string): Promise<Product | null>;
  fetchPriceList(): Promise<PriceList>;
  fetchAvailability?(productIds: string[]): Promise<Record<string, Product["availability"]>>;
  fetchMedia?(productId: string): Promise<{ images: string[]; drawings: string[]; models: string[] }>;
  createLead(input: LeadSubmission & { serverEstimate?: Estimate }): Promise<{ reference: string; status?: string }>;
  sendSpecification?(leadReference: string, estimate: Estimate): Promise<void>;
  sendConfiguration?(leadReference: string, project: Project): Promise<void>;
  getLeadStatus?(reference: string): Promise<string>;
}

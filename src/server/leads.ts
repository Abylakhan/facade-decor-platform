/**
 * Server-side lead handling, ready to be mounted behind an API route when the
 * site runs on a server (the current GitHub Pages build is static and uses the
 * DEMO quote provider in the browser instead).
 *
 * - validates the payload with zod (never trusts the browser);
 * - rate-limits by client key;
 * - rejects repeated submissions with the same idempotency key;
 * - recomputes the estimate from the submitted project with server-side catalog
 *   and prices, and flags a mismatch with the client's numbers.
 */
import { buildEstimate } from "@/domain/calc/estimate";
import { leadSchema, projectSchema } from "@/domain/schemas";
import type { Estimate, PriceList, Product, Project } from "@/domain/types";
import { activeVariant } from "@/domain/project";
import type { CRMAdapter } from "@/integration/types";
import type { RateLimiter } from "./rate-limit";

export interface LeadHandlerDeps {
  products: Product[];
  prices: PriceList;
  limiter: RateLimiter;
  seen: Map<string, string>;
  /** Absent in DEMO mode → nothing is delivered. */
  crm?: CRMAdapter;
}

export type LeadResponse =
  | { http: 200; body: { status: "accepted" | "demo-stored" | "duplicate"; reference: string; delivered: boolean; priceMismatch: boolean; serverTotal?: number } }
  | { http: 400; body: { status: "invalid"; issues: { path: string; message: string }[] } }
  | { http: 429; body: { status: "rate-limited"; retryAfterMs: number } }
  | { http: 502; body: { status: "crm-error" } };

export async function handleLead(raw: unknown, clientKey: string, deps: LeadHandlerDeps): Promise<LeadResponse> {
  const rl = deps.limiter.check(clientKey);
  if (!rl.ok) return { http: 429, body: { status: "rate-limited", retryAfterMs: rl.retryAfterMs } };

  const body = (raw ?? {}) as { lead?: unknown; project?: unknown; clientTotal?: unknown };
  const lead = leadSchema.safeParse(body.lead);
  if (!lead.success) {
    return { http: 400, body: { status: "invalid", issues: lead.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) } };
  }
  let project: Project | undefined;
  if (body.project !== undefined) {
    const p = projectSchema.safeParse(body.project);
    if (!p.success) {
      return { http: 400, body: { status: "invalid", issues: p.error.issues.map((i) => ({ path: `project.${i.path.join(".")}`, message: i.message })) } };
    }
    project = p.data as Project;
  }

  const prior = deps.seen.get(lead.data.idempotencyKey);
  if (prior) return { http: 200, body: { status: "duplicate", reference: prior, delivered: !!deps.crm, priceMismatch: false } };

  let serverEstimate: Estimate | undefined;
  if (project) {
    const byId = new Map(deps.products.map((p) => [p.id, p]));
    serverEstimate = buildEstimate(activeVariant(project), (id) => byId.get(id), deps.prices);
  }
  const clientTotal = typeof body.clientTotal === "number" ? body.clientTotal : undefined;
  const priceMismatch = !!serverEstimate && clientTotal !== undefined && clientTotal !== serverEstimate.totals.total;

  if (!deps.crm) {
    const reference = `DEMO-${deps.seen.size + 1}`;
    deps.seen.set(lead.data.idempotencyKey, reference);
    return { http: 200, body: { status: "demo-stored", reference, delivered: false, priceMismatch, serverTotal: serverEstimate?.totals.total } };
  }
  try {
    const res = await deps.crm.createLead({ lead: lead.data, project, serverEstimate });
    deps.seen.set(lead.data.idempotencyKey, res.reference);
    return { http: 200, body: { status: "accepted", reference: res.reference, delivered: true, priceMismatch, serverTotal: serverEstimate?.totals.total } };
  } catch {
    // Do not log the payload: it contains personal data.
    return { http: 502, body: { status: "crm-error" } };
  }
}

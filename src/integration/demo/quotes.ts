/**
 * DEMO lead submission. Nothing is sent to a manager: the lead is validated and
 * stored in a local "outbox" so the flow can be tested end to end.
 * The UI must show that the request was NOT delivered.
 */
import { leadSchema } from "@/domain/schemas";
import type { KeyValueStore } from "./browser-projects";
import type { LeadResult, LeadSubmission, QuoteProvider } from "../types";

const KEY = "fd.demo-outbox.v1";

export class DemoQuoteProvider implements QuoteProvider {
  readonly mode = "demo" as const;
  constructor(private readonly store: KeyValueStore) {}

  async submitLead(input: LeadSubmission): Promise<LeadResult> {
    const parsed = leadSchema.safeParse(input.lead);
    if (!parsed.success) return { status: "rejected", delivered: false, errors: parsed.error.issues.map((i) => i.message) };
    const outbox: { key: string; reference: string; at: string; name: string; projectId?: string; total?: number }[] = JSON.parse(
      this.store.getItem(KEY) ?? "[]",
    );
    const dup = outbox.find((o) => o.key === parsed.data.idempotencyKey);
    if (dup) return { status: "duplicate", delivered: false, reference: dup.reference };
    const reference = `DEMO-${Date.now().toString(36).toUpperCase()}`;
    // Only what is needed to show the demo outbox — no phone numbers kept.
    outbox.push({
      key: parsed.data.idempotencyKey,
      reference,
      at: new Date().toISOString(),
      name: parsed.data.name,
      projectId: input.project?.id,
      total: input.clientEstimate?.totals.total,
    });
    this.store.setItem(KEY, JSON.stringify(outbox.slice(-20)));
    return { status: "demo-stored", delivered: false, reference };
  }
}

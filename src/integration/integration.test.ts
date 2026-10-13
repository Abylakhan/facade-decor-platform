import { describe, expect, it } from "vitest";
import { demoProducts } from "@/data/demo-catalog";
import { demoPriceList } from "@/data/demo-prices";
import { createProject, createVariant, duplicateVariant, generateGeometry, starterSelections, typicalHouse } from "@/domain/project";
import { buildEstimate } from "@/domain/calc/estimate";
import { handleLead } from "@/server/leads";
import { RateLimiter } from "@/server/rate-limit";
import { BrowserProjectProvider, MemoryStore } from "./demo/browser-projects";
import { DemoCatalogProvider } from "./demo/catalog";
import { DemoQuoteProvider } from "./demo/quotes";
import { HttpCrmAdapter, CrmNotConfiguredError } from "./crm/adapter";

const lookup = (id: string) => demoProducts.find((p) => p.id === id);

function sampleProject() {
  const g = generateGeometry(typicalHouse);
  return createProject("Дом", "villa", createVariant("A", g, starterSelections(["front", "right", "back", "left"])));
}

const validLead = (key = "key-12345678") => ({
  name: "Айгерим",
  phone: "+7 701 123 45 67",
  email: "",
  contactMethod: "whatsapp" as const,
  consent: true as const,
  elapsedMs: 8000,
  website: "",
  idempotencyKey: key,
});

describe("demo catalog", () => {
  it("every product is marked as demo and references existing products", async () => {
    const c = new DemoCatalogProvider();
    const all = await c.listProducts();
    const ids = new Set(all.map((p) => p.id));
    for (const p of all) {
      expect(p.source).toBe("demo");
      expect(p.sku.startsWith("DEMO-")).toBe(true);
      for (const r of [...(p.related ?? []), ...(p.compatibleWith ?? []), ...(p.consumables ?? []).map((x) => x.productId)]) {
        expect(ids.has(r), `${p.id} → ${r}`).toBe(true);
      }
      expect(p.id in demoPriceList.items, `price entry for ${p.id}`).toBe(true);
      if (p.linear) expect(p.linear.usableLength).toBeLessThanOrEqual(p.linear.nominalLength);
    }
    expect((await c.listCategories()).length).toBe(17);
  });
});

describe("project storage (browser demo)", () => {
  it("saves, lists, loads and removes projects", async () => {
    const store = new MemoryStore();
    const repo = new BrowserProjectProvider(store);
    const p = sampleProject();
    p.variants.push(duplicateVariant(p.variants[0]!, "B"));
    await repo.save(p);
    const loaded = await repo.get(p.id);
    expect(loaded).toEqual(p);
    expect(loaded!.variants[1]!.selections[0]!.id).not.toBe(p.variants[0]!.selections[0]!.id);
    expect(await repo.list()).toHaveLength(1);
    await repo.remove(p.id);
    expect(await repo.list()).toHaveLength(0);
  });
  it("survives corrupted storage", async () => {
    const store = new MemoryStore();
    store.setItem("fd.projects.v1", "{not json");
    expect(await new BrowserProjectProvider(store).list()).toEqual([]);
    store.setItem("fd.projects.v1", JSON.stringify([{ id: 1 }, sampleProject()]));
    expect(await new BrowserProjectProvider(store).list()).toHaveLength(1);
  });
  it("estimate snapshot keeps the price version", async () => {
    const p = sampleProject();
    const v = p.variants[0]!;
    v.snapshot = { estimate: buildEstimate(v, lookup, demoPriceList), fixedAt: new Date().toISOString() };
    const repo = new BrowserProjectProvider(new MemoryStore());
    await repo.save(p);
    expect((await repo.get(p.id))!.variants[0]!.snapshot!.estimate.priceListVersion).toBe("DEMO-2026.10");
  });
});

describe("demo quote provider", () => {
  it("never claims delivery and blocks duplicates", async () => {
    const q = new DemoQuoteProvider(new MemoryStore());
    const r1 = await q.submitLead({ lead: validLead() });
    expect(r1).toMatchObject({ status: "demo-stored", delivered: false });
    const r2 = await q.submitLead({ lead: validLead() });
    expect(r2.status).toBe("duplicate");
  });
  it("rejects spam and too-fast submissions", async () => {
    const q = new DemoQuoteProvider(new MemoryStore());
    expect((await q.submitLead({ lead: { ...validLead("k-abcdefgh"), website: "http://spam" } })).status).toBe("rejected");
    expect((await q.submitLead({ lead: { ...validLead("k-abcdefgi"), elapsedMs: 300 } })).status).toBe("rejected");
  });
});

describe("server lead handler", () => {
  const deps = () => ({ products: demoProducts, prices: demoPriceList, limiter: new RateLimiter(3, 60_000), seen: new Map<string, string>() });

  it("validates input on the server", async () => {
    const r = await handleLead({ lead: { ...validLead(), phone: "12" } }, "ip", deps());
    expect(r.http).toBe(400);
  });
  it("recomputes the estimate and flags a tampered client total", async () => {
    const p = sampleProject();
    const real = buildEstimate(p.variants[0]!, lookup, demoPriceList).totals.total;
    const d = deps();
    const ok = await handleLead({ lead: validLead("aaaaaaaa1"), project: p, clientTotal: real }, "ip", d);
    expect(ok.body).toMatchObject({ status: "demo-stored", delivered: false, priceMismatch: false, serverTotal: real });
    const bad = await handleLead({ lead: validLead("aaaaaaaa2"), project: p, clientTotal: 1 }, "ip", d);
    expect(bad.body).toMatchObject({ priceMismatch: true });
  });
  it("rate-limits and de-duplicates", async () => {
    const d = deps();
    await handleLead({ lead: validLead("same-key-1") }, "ip", d);
    expect((await handleLead({ lead: validLead("same-key-1") }, "ip", d)).body.status).toBe("duplicate");
    await handleLead({ lead: validLead("other-key-1") }, "ip", d);
    expect((await handleLead({ lead: validLead("other-key-2") }, "ip", d)).http).toBe(429);
  });
  it("reports CRM failures without claiming success", async () => {
    const crm = { createLead: async () => { throw new Error("down"); } } as never;
    const r = await handleLead({ lead: validLead("crm-key-1") }, "ip", { ...deps(), crm });
    expect(r.http).toBe(502);
  });
});

describe("CRM adapter", () => {
  it("is explicitly not configured", () => {
    expect(() => new HttpCrmAdapter({})).toThrow(CrmNotConfiguredError);
    const a = new HttpCrmAdapter({ baseUrl: "https://crm.invalid", token: "x" });
    expect(() => a.fetchProducts()).toThrow(CrmNotConfiguredError);
  });
});

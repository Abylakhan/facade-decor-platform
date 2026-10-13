import { describe, expect, it } from "vitest";
import { demoProducts } from "@/data/demo-catalog";
import { demoPriceList } from "@/data/demo-prices";
import type { DecorSelection, HouseGeometry, Opening, Placement, PriceList, Variant } from "../types";
import { createVariant } from "../project";
import { buildEstimate } from "./estimate";
import { computeAnchors, netWallArea, outerCorners, validateGeometry, wallArea, wallFrame, wallHeight, wallToWorld } from "./geometry";
import { ceilSafe, packSegments } from "./math";

const byId = new Map(demoProducts.map((p) => [p.id, p]));
const lookup = (id: string) => byId.get(id);

const win = (id: string, x: number, floor = 0, w = 1.2, h = 1.5): Opening => ({ id, kind: "window", width: w, height: h, floor, x, sill: 0.9 });

function house(over: Partial<HouseGeometry> = {}): HouseGeometry {
  return {
    length: 10,
    depth: 8,
    floors: 2,
    floorHeight: 3,
    plinthHeight: 0.5,
    roof: { type: "hip", pitchDeg: 25, overhang: 0.5 },
    walls: [
      { side: "front", included: true, openings: [win("w1", 3), win("w2", 7)] },
      { side: "right", included: true, openings: [] },
      { side: "back", included: true, openings: [] },
      { side: "left", included: true, openings: [] },
    ],
    ...over,
  };
}

let n = 0;
const sel = (productId: string, placement: Placement, extra: Partial<DecorSelection> = {}): DecorSelection => ({
  id: `s${++n}`,
  productId,
  enabled: true,
  placement,
  ...extra,
});

function estimate(selections: DecorSelection[], geometry = house(), patch: Partial<Variant> = {}, prices: PriceList = demoPriceList) {
  const v = { ...createVariant("t", geometry, selections), ...patch };
  return buildEstimate(v, lookup, prices, new Date("2026-10-13T00:00:00Z"));
}
const line = (e: ReturnType<typeof estimate>, id: string) => e.lines.find((l) => l.productId === id);

describe("math", () => {
  it("ceilSafe ignores floating point noise", () => {
    expect((0.1 + 0.2) * 10).not.toBe(3);
    expect(ceilSafe((0.1 + 0.2) * 10)).toBe(3);
    expect(ceilSafe(3.00001)).toBe(4);
  });
  it("packs segments first-fit-decreasing", () => {
    expect(packSegments([0.92, 0.77, 0.77], 1.97).pieces).toBe(2);
    expect(packSegments([1, 1, 1, 1], 2).pieces).toBe(2);
    expect(() => packSegments([2.1], 2)).toThrow();
  });
});

describe("geometry", () => {
  it("wall area, openings and net area", () => {
    const g = house();
    expect(wallHeight(g)).toBe(6.5);
    expect(wallArea(g, "front")).toBe(65);
    expect(netWallArea(g, "front")).toBeCloseTo(65 - 2 * 1.8, 6);
    const e = estimate([]);
    expect(e.metrics.grossArea).toBeCloseTo(2 * 65 + 2 * 52, 6);
    expect(e.metrics.netArea).toBeCloseTo(234 - 3.6, 6);
  });
  it("detects outer corners only between adjacent selected sides", () => {
    expect(outerCorners(["front"])).toEqual([]);
    expect(outerCorners(["front", "right"])).toEqual(["front-right"]);
    expect(outerCorners(["front", "back"])).toEqual([]);
    expect(outerCorners(["front", "right", "back", "left"])).toHaveLength(4);
  });
  it("validates openings", () => {
    const g = house({ walls: [{ side: "front", included: true, openings: [win("a", 3), win("b", 3.5), win("c", 9.8)] }] });
    const codes = validateGeometry(g).map((m) => m.code);
    expect(codes).toContain("openingOverlap");
    expect(codes).toContain("openingOutside");
    expect(validateGeometry(house({ length: 0 }))[0]).toMatchObject({ code: "missingParam", params: { field: "length" } });
  });
  it("maps wall-local points to world coordinates", () => {
    const g = house();
    expect(wallToWorld(wallFrame(g, "front"), 0, 0)).toEqual([-5, 0, 4]);
    expect(wallToWorld(wallFrame(g, "front"), 10, 1)).toEqual([5, 1, 4]);
    expect(wallToWorld(wallFrame(g, "right"), 8, 0)).toEqual([5, 0, -4]);
    expect(wallToWorld(wallFrame(g, "back"), 10, 0)).toEqual([-5, 0, -4]);
    expect(wallToWorld(wallFrame(g, "left"), 8, 0, 0.1)).toEqual([-5.1, 0, 4]);
  });
  it("computes anchors", () => {
    const a = computeAnchors(house({ floors: 3 }));
    expect(a.eavesY).toBe(9.5);
    expect(a.floorLinesY).toEqual([3.5, 6.5]);
    expect(a.openings[0]).toMatchObject({ bottom: 1.4, top: 2.9, left: 2.4, right: 3.6 });
  });
});

describe("linear decor", () => {
  it("eaves on one side: length × (1 + waste) / usable length, rounded up", () => {
    // 10 m × 1.07 = 10.7 m; 10.7 / 1.96 = 5.46 → 6
    const e = estimate([sel("p-k220", { kind: "eaves", sides: ["front"] })]);
    expect(line(e, "p-k220")?.quantity).toBe(6);
    expect(line(e, "p-k220")?.total).toBe(6 * 18500);
  });
  it("adds mitre allowance at outer corners", () => {
    // (36 + 4 × 2 × 0.18) × 1.07 = 40.06 m → 40.06 / 1.96 = 20.44 → 21
    const e = estimate([sel("p-k220", { kind: "eaves", sides: ["front", "right", "back", "left"] })]);
    expect(line(e, "p-k220")?.quantity).toBe(21);
  });
  it("uses prefabricated corners instead of mitres when chosen", () => {
    // 36 × 1.07 = 38.52 → 19.65 → 20, plus 4 corner elements
    const e = estimate([sel("p-k220", { kind: "eaves", sides: ["front", "right", "back", "left"], useCornerElements: true })]);
    expect(line(e, "p-k220")?.quantity).toBe(20);
    expect(line(e, "p-cr-k220")?.quantity).toBe(4);
  });
  it("belts run once per floor line", () => {
    const e = estimate([sel("p-pb150", { kind: "belt", sides: ["front"] })], house({ floors: 3 }));
    // 2 lines × 10 m × 1.07 = 21.4 / 1.96 = 10.92 → 11
    expect(line(e, "p-pb150")?.quantity).toBe(11);
    const one = estimate([sel("p-pb150", { kind: "belt", sides: ["front"] })], house({ floors: 1 }));
    expect(line(one, "p-pb150")).toBeUndefined();
    expect(one.warnings.map((w) => w.code)).toContain("noFloorLines");
  });
  it("refuses a placement without sides instead of adding silently", () => {
    const e = estimate([sel("p-k220", { kind: "eaves", sides: [] })]);
    expect(e.lines).toHaveLength(0);
    expect(e.warnings[0]).toMatchObject({ code: "noSides", severity: "error" });
  });
  it("respects waste override", () => {
    const e = estimate([sel("p-k220", { kind: "eaves", sides: ["front"] }, { wasteOverride: 0 })]);
    // 10 / 1.96 = 5.1 → 6 ; with 0 % still 6, try 0.2: 12/1.96 = 6.12 → 7
    expect(line(e, "p-k220")?.quantity).toBe(6);
    const e2 = estimate([sel("p-k220", { kind: "eaves", sides: ["front"] }, { wasteOverride: 0.2 })]);
    expect(line(e2, "p-k220")?.quantity).toBe(7);
  });
  it("applies the minimum order", () => {
    const e = estimate([sel("p-k300", { kind: "manual-length", length: 2 })]);
    expect(line(e, "p-k300")?.computedQuantity).toBe(4);
    expect(line(e, "p-k300")?.minOrderApplied).toBe(true);
  });
});

describe("window and door surrounds", () => {
  it("4-sided: each side cut separately, packed into usable stock", () => {
    // per window: 1.5,1.5,1.8,1.8 (+2×10 mm) → no two fit into 1.97 → 4 pieces
    const e = estimate([sel("p-w150", { kind: "window-surround", sides: ["front"], scheme: "4" })]);
    expect(line(e, "p-w150")?.quantity).toBe(8);
  });
  it("top-only (sandrik) scheme", () => {
    const e = estimate([sel("p-w150", { kind: "window-surround", sides: ["front"], scheme: "top" })]);
    expect(line(e, "p-w150")?.quantity).toBe(2);
  });
  it("3-sided scheme reuses offcuts for small windows", () => {
    const g = house({ walls: [{ side: "front", included: true, openings: [win("s", 2, 0, 0.6, 0.6)] }] });
    // top 0.9+0.02, sides 0.75+0.02 → [0.92+0.77] [0.77] → 2
    const e = estimate([sel("p-w150", { kind: "window-surround", sides: ["front"], scheme: "3" })], g);
    expect(line(e, "p-w150")?.quantity).toBe(2);
  });
  it("splits sides longer than the usable stock length", () => {
    const g = house({
      walls: [{ side: "front", included: true, openings: [{ id: "d", kind: "door", width: 1, height: 2.4, floor: 0, x: 5, sill: 0 }] }],
    });
    const e = estimate([sel("p-w150", { kind: "door-surround", sides: ["front"], scheme: "3" })], g);
    const l = line(e, "p-w150")!;
    expect(l.quantity).toBe(5);
    expect(l.steps.find((s) => s.k === "joints")?.v).toBe(2);
  });
  it("reports missing openings", () => {
    const e = estimate([sel("p-w150", { kind: "window-surround", sides: ["right"], scheme: "4" })]);
    expect(e.warnings.map((w) => w.code)).toContain("noOpenings");
  });
  it("does not count keystones twice when the surround kit already includes them", () => {
    const e = estimate([
      sel("p-w180k", { kind: "window-surround", sides: ["front"], scheme: "4" }),
      sel("p-ks1", { kind: "keystone", sides: ["front"], openings: "window" }),
    ]);
    expect(line(e, "p-ks1")).toBeUndefined();
    expect(e.warnings.find((w) => w.code === "kitDuplicate")?.params?.count).toBe(2);
  });
  it("counts keystones normally without a kit", () => {
    const e = estimate([sel("p-ks1", { kind: "keystone", sides: ["front"], openings: "window" })]);
    expect(line(e, "p-ks1")?.quantity).toBe(2);
  });
});

describe("piece goods", () => {
  it("quoins: ceil(height / module) per corner + reserve", () => {
    // 6.0 m / 0.3 = 20 per corner × 4 = 80 × 1.05 = 84
    const e = estimate([sel("p-rq", { kind: "quoins", corners: ["front-right", "right-back", "back-left", "left-front"] })]);
    expect(line(e, "p-rq")?.quantity).toBe(84);
  });
  it("columns check height range and proportions", () => {
    const ok = estimate([sel("p-c300", { kind: "column", count: 2, height: 3 })]);
    expect(line(ok, "p-c300")?.quantity).toBe(2);
    expect(ok.warnings).toHaveLength(0);
    const tooHigh = estimate([sel("p-c300", { kind: "column", count: 2, height: 5 })]);
    expect(line(tooHigh, "p-c300")).toBeUndefined();
    expect(tooHigh.warnings[0]?.code).toBe("heightOutOfRange");
    const slender = estimate([sel("p-c300", { kind: "column", count: 2, height: 3.5 })]);
    expect(line(slender, "p-c300")?.quantity).toBe(2);
    expect(slender.warnings[0]?.code).toBe("columnRatio");
  });
  it("column height defaults to floor height and says so", () => {
    const e = estimate([sel("p-c300", { kind: "column", count: 2 })]);
    expect(e.assumptions.map((a) => a.code)).toContain("columnHeightFromFloor");
  });
  it("pilasters taller than the stock are spliced and flagged", () => {
    // 6.0 m / 3.0 m = 2 parts per pilaster, 2 per side
    const e = estimate([sel("p-p300", { kind: "pilaster", sides: ["front"], perSide: 2 })]);
    expect(line(e, "p-p300")?.quantity).toBe(4);
    expect(e.warnings.map((w) => w.code)).toContain("pilasterSpliced");
  });
  it("brackets: floor(length / spacing) + 1 per side", () => {
    const e = estimate([sel("p-b1", { kind: "brackets", sides: ["front"], spacing: 0.6 })]);
    expect(line(e, "p-b1")?.quantity).toBe(17);
  });
  it("balustrade sections", () => {
    const e = estimate([sel("p-bl", { kind: "manual-length", length: 5 })]);
    expect(line(e, "p-bl")?.quantity).toBe(5);
  });
});

describe("area, consumables, prices", () => {
  it("area product uses net wall area", () => {
    // 61.4 m² × 0.35 kg × 1.1 = 23.64 kg / 15 = 1.58 → 2 packs
    const e = estimate([sel("p-a-coat", { kind: "area", sides: ["front"] })]);
    expect(line(e, "p-a-coat")?.quantity).toBe(2);
    expect(line(e, "p-a-coat")?.measure?.value).toBeCloseTo(61.4, 6);
  });
  it("aggregates consumables across selections before rounding", () => {
    // eaves 10 m + surrounds 2 × 6.6 m = 23.2 m → glue 8.12 → 9, sealant 3.48 → 4
    const e = estimate([
      sel("p-k220", { kind: "eaves", sides: ["front"] }),
      sel("p-w150", { kind: "window-surround", sides: ["front"], scheme: "4" }),
    ]);
    expect(line(e, "p-a-glue")?.quantity).toBe(9);
    expect(line(e, "p-a-seal")?.quantity).toBe(4);
  });
  it("marks items without a reliable price as on request", () => {
    const e = estimate([sel("p-x", { kind: "manual-count", count: 1 })]);
    expect(line(e, "p-x")?.total).toBeNull();
    expect(e.totals.hasUnpriced).toBe(true);
  });
  it("labour only for installation packages; delivery per zone", () => {
    const s = [sel("p-k220", { kind: "eaves", sides: ["front"] })];
    const mat = estimate(s);
    expect(mat.totals.labour).toBe(0);
    expect(mat.totals.delivery).toBe(0);
    const inst = estimate(s, house(), { options: { package: "installation", deliveryZone: "city" } });
    expect(inst.totals.labour).toBe(10 * 3500);
    expect(inst.totals.delivery).toBe(25000);
    const region = estimate(s, house(), { options: { package: "delivery", deliveryZone: "region", distanceKm: 100 } });
    expect(region.totals.delivery).toBe(25000 + 350 * 100);
    const noDistance = estimate(s, house(), { options: { package: "delivery", deliveryZone: "region" } });
    expect(noDistance.totals.hasUnpriced).toBe(true);
  });
  it("turnkey falls back to installation when unavailable", () => {
    const e = estimate([sel("p-k220", { kind: "eaves", sides: ["front"] })], house(), { options: { package: "turnkey", deliveryZone: "city" } });
    expect(e.warnings.map((w) => w.code)).toContain("turnkeyUnavailable");
    expect(e.totals.labour).toBeGreaterThan(0);
  });
  it("total = materials + labour + delivery + extras − discount", () => {
    const e = estimate([sel("p-c300", { kind: "column", count: 20, height: 3 })], house(), {
      options: { package: "installation", deliveryZone: "city" },
      extras: [{ id: "x", label: "Леса", amount: 100000 }],
    });
    const t = e.totals;
    expect(t.materials).toBeGreaterThanOrEqual(3_000_000);
    expect(t.discount).toBe(Math.round(t.materials * 0.05));
    expect(t.total).toBe(t.materials + t.labour + t.delivery + t.extras - t.discount);
  });
  it("manual overrides replace the computed quantity", () => {
    const e = estimate([sel("p-k220", { kind: "eaves", sides: ["front"] })], house(), { overrides: { "p-k220": 10 } });
    expect(line(e, "p-k220")).toMatchObject({ quantity: 10, computedQuantity: 6, overridden: true, total: 185000 });
  });
  it("records the price list version and recalculates with new prices", () => {
    const s = [sel("p-k220", { kind: "eaves", sides: ["front"] })];
    const newer: PriceList = { ...demoPriceList, version: "DEMO-2026.11", items: { ...demoPriceList.items, "p-k220": 20000 } };
    const a = estimate(s);
    const b = estimate(s, house(), {}, newer);
    expect(a.priceListVersion).toBe("DEMO-2026.10");
    expect(b.priceListVersion).toBe("DEMO-2026.11");
    expect(line(b, "p-k220")!.total! - line(a, "p-k220")!.total!).toBe(6 * 1500);
  });
  it("skips geometry-based decor when dimensions are missing, keeps manual items", () => {
    const e = estimate(
      [sel("p-k220", { kind: "eaves", sides: ["front"] }), sel("p-rs1", { kind: "manual-count", count: 2 })],
      house({ length: 0 }),
    );
    expect(line(e, "p-k220")).toBeUndefined();
    expect(line(e, "p-rs1")?.quantity).toBe(2);
    expect(e.warnings.map((w) => w.code)).toEqual(expect.arrayContaining(["missingParam", "skippedNoGeometry"]));
  });
  it("disabled selections are excluded", () => {
    const e = estimate([sel("p-k220", { kind: "eaves", sides: ["front"] }, { enabled: false })]);
    expect(e.lines).toHaveLength(0);
  });
  it("rejects a product in a placement it does not support", () => {
    const e = estimate([sel("p-c300", { kind: "eaves", sides: ["front"] })]);
    expect(e.warnings[0]?.code).toBe("placementNotSupported");
  });
});

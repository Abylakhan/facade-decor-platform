/**
 * Estimate builder: selections + geometry + catalog + price list → priced specification.
 *
 *   materials = Σ quantity × current unit price          (lines with a known price)
 *   labour    = Σ installed measure × applicable rate     (only for installation packages)
 *   total     = materials + labour + delivery + extras − discount
 */
import type {
  CalcMessage,
  Estimate,
  EstimateLine,
  LabourLine,
  PriceList,
  Product,
  Variant,
} from "../types";
import { computeMetrics, validateGeometry } from "./geometry";
import { ceilSafe, round } from "./math";
import { applyRule, consumablesFor, type Demand } from "./rules";

export interface CatalogLookup {
  (id: string): Product | undefined;
}

export function buildEstimate(variant: Variant, product: CatalogLookup, prices: PriceList, now = new Date()): Estimate {
  const warnings: CalcMessage[] = [];
  const assumptions: CalcMessage[] = [];

  const geometryProblems = validateGeometry(variant.geometry);
  const geometryValid = !geometryProblems.some((m) => m.code === "missingParam");
  for (const m of geometryProblems) warnings.push({ ...m, severity: m.code === "missingParam" ? "error" : "warn" });

  const active = variant.selections.filter((s) => s.enabled);
  const demands: Demand[] = [];
  for (const sel of active) {
    const res = applyRule(sel, { geometry: variant.geometry, geometryValid, product, selections: active });
    for (const m of res.messages) (m.severity === "info" ? assumptions : warnings).push(m);
    for (const d of res.demands) {
      demands.push(d);
      const p = product(d.productId);
      if (p) demands.push(...consumablesFor(d, p));
    }
  }

  /* -------- aggregate demands into one line per product -------- */
  const byProduct = new Map<string, Demand[]>();
  for (const d of demands) {
    const list = byProduct.get(d.productId) ?? [];
    list.push(d);
    byProduct.set(d.productId, list);
  }

  const lines: EstimateLine[] = [];
  for (const [productId, list] of byProduct) {
    const p = product(productId);
    if (!p) {
      warnings.push({ code: "productMissing", severity: "error", params: { id: productId } });
      continue;
    }
    const isConsumable = list.every((d) => d.fractional);
    const raw = list.reduce((s, d) => s + d.quantity, 0);
    let computed = isConsumable ? ceilSafe(raw) : round(raw, 3);
    let minOrderApplied = false;
    if (p.minOrder && computed > 0 && computed < p.minOrder) {
      computed = p.minOrder;
      minOrderApplied = true;
    }
    const key = productId;
    const override = variant.overrides[key];
    const quantity = override !== undefined && override >= 0 ? override : computed;
    const unitPrice = prices.items[productId] ?? null;
    const measureUnit = list.find((d) => d.measure)?.measure?.unit;
    const measureValue = list.reduce((s, d) => s + (d.measure?.value ?? 0), 0);
    lines.push({
      key,
      productId,
      sku: p.sku,
      name: p.name,
      categoryId: p.categoryId,
      unit: p.saleUnit,
      quantity,
      computedQuantity: computed,
      overridden: override !== undefined && override !== computed,
      measure: measureUnit ? { value: round(measureValue, 3), unit: measureUnit } : undefined,
      unitPrice,
      total: unitPrice === null ? null : Math.round(unitPrice * quantity),
      steps: isConsumable
        ? [
            { k: "consumableNeed", v: round(raw, 3) },
            { k: "pieces", v: computed, unit: "pcs" },
          ]
        : list.flatMap((d) => d.steps),
      selectionIds: [...new Set(list.map((d) => d.selectionId))],
      isConsumable,
      minOrderApplied,
    });
    if (unitPrice === null) warnings.push({ code: "priceOnRequest", severity: "warn", params: { sku: p.sku } });
    if (minOrderApplied) assumptions.push({ code: "minOrderApplied", severity: "info", params: { sku: p.sku, min: p.minOrder! } });
  }
  lines.sort((a, b) => Number(a.isConsumable) - Number(b.isConsumable) || a.sku.localeCompare(b.sku));

  /* -------- labour -------- */
  let pkg = variant.options.package;
  if (pkg === "turnkey" && !prices.turnkeyAvailable) {
    warnings.push({ code: "turnkeyUnavailable", severity: "warn" });
    pkg = "installation";
  }
  const labour: LabourLine[] = [];
  if (pkg === "installation" || pkg === "turnkey") {
    for (const d of demands) {
      if (!d.labour) continue;
      const rate =
        d.labour.unit === "m"
          ? prices.labour.perMetre[d.placement]
          : d.labour.unit === "pcs"
            ? prices.labour.perPiece[d.placement]
            : prices.labour.perM2;
      if (rate === undefined) {
        warnings.push({ code: "labourRateMissing", severity: "warn", params: { kind: d.placement } });
        continue;
      }
      labour.push({
        key: `${d.selectionId}:${d.productId}`,
        placement: d.placement,
        productId: d.productId,
        measure: d.labour.value,
        unit: d.labour.unit,
        rate,
        total: Math.round(d.labour.value * rate),
      });
    }
  } else {
    assumptions.push({ code: "noInstallation", severity: "info" });
  }

  /* -------- delivery -------- */
  let delivery = 0;
  let deliveryUnknown = false;
  if (pkg === "materials") {
    assumptions.push({ code: "noDelivery", severity: "info" });
  } else {
    const { deliveryZone, distanceKm } = variant.options;
    if (deliveryZone === "pickup") delivery = prices.delivery.pickup;
    else if (deliveryZone === "city") delivery = prices.delivery.city;
    else if (distanceKm && distanceKm > 0) delivery = Math.round(prices.delivery.regionBase + prices.delivery.regionPerKm * distanceKm);
    else {
      deliveryUnknown = true;
      warnings.push({ code: "missingParam", severity: "warn", params: { field: "distanceKm" } });
    }
  }

  /* -------- totals -------- */
  const materials = lines.reduce((s, l) => s + (l.total ?? 0), 0);
  const labourTotal = labour.reduce((s, l) => s + l.total, 0);
  const extras = variant.extras.reduce((s, e) => s + (Number.isFinite(e.amount) ? e.amount : 0), 0);
  const rule = [...prices.discounts]
    .filter((r) => materials >= r.materialsThreshold)
    .sort((a, b) => b.percent - a.percent)[0];
  const discount = rule ? Math.round((materials * rule.percent) / 100) : 0;
  if (rule) assumptions.push({ code: "discountApplied", severity: "info", params: { percent: rule.percent } });
  if (!lines.length) assumptions.push({ code: "emptySpec", severity: "info" });

  return {
    lines,
    labour,
    totals: {
      materials,
      labour: labourTotal,
      delivery,
      extras,
      discount,
      total: materials + labourTotal + delivery + extras - discount,
      hasUnpriced: lines.some((l) => l.unitPrice === null) || deliveryUnknown,
    },
    metrics: computeMetrics(variant.geometry),
    warnings,
    assumptions,
    priceListVersion: prices.version,
    priceSource: prices.source,
    calculatedAt: now.toISOString(),
  };
}

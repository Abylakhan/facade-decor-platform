/**
 * Quantity rules per placement kind. Each rule turns one decor selection plus the
 * house geometry into a "demand" for a product, with a step-by-step explanation.
 * Pricing and aggregation happen in estimate.ts.
 */
import type {
  CalcMessage,
  CalcStep,
  DecorSelection,
  HouseGeometry,
  Opening,
  OpeningKind,
  PlacementKind,
  Product,
  Side,
} from "../types";
import { getWall, netWallArea, outerCorners, wallHeight, wallLength } from "./geometry";
import { ceilSafe, mmToM, packSegments, round, splitSegment } from "./math";

export interface Demand {
  productId: string;
  selectionId: string;
  placement: PlacementKind;
  /** Quantity in the product's sale unit (whole number except for consumables). */
  quantity: number;
  measure?: { value: number; unit: "m" | "m2" | "pcs" };
  steps: CalcStep[];
  /** Installed measure that labour is charged on. */
  labour?: { value: number; unit: "m" | "pcs" | "m2" };
  /** Installed metres / pieces used for consumables. */
  installedMetres?: number;
  installedPieces?: number;
  /** Fractional consumable need, ceiled after aggregation. */
  fractional?: boolean;
}

export interface RuleContext {
  geometry: HouseGeometry;
  geometryValid: boolean;
  product: (id: string) => Product | undefined;
  /** All enabled selections — used to avoid double counting of kit contents. */
  selections: DecorSelection[];
}

export interface RuleResult {
  demands: Demand[];
  messages: CalcMessage[];
}

const GEOMETRY_FREE: PlacementKind[] = ["manual-length", "manual-count", "column"];

function openingsOn(g: HouseGeometry, sides: Side[], kind: OpeningKind | "all"): { side: Side; o: Opening }[] {
  return sides.flatMap((side) =>
    getWall(g, side)
      .openings.filter((o) => kind === "all" || o.kind === kind)
      .map((o) => ({ side, o })),
  );
}

function wasteOf(sel: DecorSelection, p: Product): number {
  return sel.wasteOverride ?? p.wastePercent ?? 0;
}

function withReserve(count: number, p: Product): { qty: number; reserve: number } {
  const r = p.reservePercent ?? 0;
  return { qty: ceilSafe(count * (1 + r)), reserve: r };
}

/** Continuous run of profile along walls (eaves, belts, plinth, manual lines). */
function linearRun(
  sel: DecorSelection,
  p: Product,
  baseLength: number,
  cornerCount: number,
  useCornerElements: boolean,
  messages: CalcMessage[],
): Demand[] {
  const spec = p.linear!;
  const waste = wasteOf(sel, p);
  const corners = useCornerElements && p.cornerElementId ? 0 : cornerCount;
  const mitre = corners * 2 * mmToM(spec.projection);
  const total = baseLength + mitre;
  const required = total * (1 + waste);
  const pieces = ceilSafe(required / spec.usableLength);
  const steps: CalcStep[] = [
    { k: "lineLength", v: round(baseLength, 3), unit: "m" },
  ];
  if (corners) steps.push({ k: "mitreAllowance", v: round(mitre, 3), unit: "m" });
  steps.push(
    { k: "waste", v: round(waste * 100, 1), unit: "%" },
    { k: "requiredLength", v: round(required, 3), unit: "m" },
    { k: "usableLength", v: spec.usableLength, unit: "m" },
    { k: "pieces", v: pieces, unit: "pcs" },
  );
  const out: Demand[] = [
    {
      productId: p.id,
      selectionId: sel.id,
      placement: sel.placement.kind,
      quantity: p.saleUnit === "m" ? round(required, 2) : pieces,
      measure: { value: round(required, 3), unit: "m" },
      steps,
      labour: { value: round(baseLength, 3), unit: "m" },
      installedMetres: baseLength,
    },
  ];
  if (useCornerElements && cornerCount > 0) {
    if (p.cornerElementId) {
      out.push({
        productId: p.cornerElementId,
        selectionId: sel.id,
        placement: sel.placement.kind,
        quantity: cornerCount,
        measure: { value: cornerCount, unit: "pcs" },
        steps: [{ k: "outerCorners", v: cornerCount, unit: "pcs" }],
        installedPieces: cornerCount,
      });
    } else {
      messages.push({ code: "noCornerElement", severity: "info", params: { sku: p.sku } });
    }
  }
  return out;
}

function surroundSegments(o: Opening, scheme: "4" | "3" | "top", faceWidth: number): number[] {
  const top = o.width + 2 * faceWidth;
  switch (scheme) {
    case "4":
      return [top, top, o.height + 2 * faceWidth, o.height + 2 * faceWidth];
    case "3":
      return [top, o.height + faceWidth, o.height + faceWidth];
    case "top":
      return [top];
  }
}

export function applyRule(sel: DecorSelection, ctx: RuleContext): RuleResult {
  const messages: CalcMessage[] = [];
  const p = ctx.product(sel.productId);
  const pl = sel.placement;
  if (!p) return { demands: [], messages: [{ code: "productMissing", severity: "error", params: { id: sel.productId } }] };
  if (!p.placements.includes(pl.kind)) {
    return { demands: [], messages: [{ code: "placementNotSupported", severity: "error", params: { sku: p.sku, kind: pl.kind } }] };
  }
  if (!ctx.geometryValid && !GEOMETRY_FREE.includes(pl.kind)) {
    return { demands: [], messages: [{ code: "skippedNoGeometry", severity: "error", params: { sku: p.sku } }] };
  }
  const g = ctx.geometry;
  const needLinear = () => {
    if (!p.linear) {
      messages.push({ code: "productNotLinear", severity: "error", params: { sku: p.sku } });
      return false;
    }
    return true;
  };
  const needSides = (sides: Side[]) => {
    if (!sides.length) {
      messages.push({ code: "noSides", severity: "error", params: { sku: p.sku } });
      return false;
    }
    return true;
  };

  switch (pl.kind) {
    case "eaves":
    case "belt":
    case "plinth": {
      if (!needLinear() || !needSides(pl.sides)) return { demands: [], messages };
      const runs = pl.kind === "belt" ? g.floors - 1 : 1;
      if (runs <= 0) {
        messages.push({ code: "noFloorLines", severity: "error", params: { sku: p.sku } });
        return { demands: [], messages };
      }
      const base = pl.sides.reduce((s, side) => s + wallLength(g, side), 0) * runs;
      const corners = outerCorners(pl.sides).length * runs;
      return { demands: linearRun(sel, p, base, corners, !!pl.useCornerElements, messages), messages };
    }

    case "window-surround":
    case "door-surround": {
      if (!needLinear() || !needSides(pl.sides)) return { demands: [], messages };
      const kind: OpeningKind = pl.kind === "window-surround" ? "window" : "door";
      const list = openingsOn(g, pl.sides, kind);
      if (!list.length) {
        messages.push({ code: "noOpenings", severity: "error", params: { sku: p.sku, kind } });
        return { demands: [], messages };
      }
      const spec = p.linear!;
      const face = mmToM(spec.profileHeight);
      const cut = mmToM(spec.cutAllowance);
      let net = 0;
      let joints = 0;
      const parts: number[] = [];
      for (const { o } of list) {
        for (const seg of surroundSegments(o, pl.scheme, face)) {
          net += seg;
          const split = seg + 2 * cut > spec.usableLength ? splitSegment(seg, spec.usableLength, cut) : [seg];
          joints += split.length - 1;
          for (const part of split) parts.push(part + 2 * cut);
        }
      }
      const plan = packSegments(parts, spec.usableLength);
      const extra = sel.wasteOverride ?? 0;
      const pieces = ceilSafe(plan.pieces * (1 + extra));
      const required = parts.reduce((a, b) => a + b, 0);
      const steps: CalcStep[] = [
        { k: "openings", v: list.length, unit: "pcs" },
        { k: "scheme", v: pl.scheme },
        { k: "segments", v: parts.length, unit: "pcs" },
        { k: "lineLength", v: round(net, 3), unit: "m" },
        { k: "cutAllowance", v: spec.cutAllowance, unit: "mm" },
        { k: "requiredLength", v: round(required, 3), unit: "m" },
        { k: "usableLength", v: spec.usableLength, unit: "m" },
        { k: "cuttingPlan", v: plan.pieces, unit: "pcs" },
        { k: "offcut", v: round(plan.offcut, 2), unit: "m" },
      ];
      if (extra) steps.push({ k: "waste", v: round(extra * 100, 1), unit: "%" });
      if (joints) steps.push({ k: "joints", v: joints, unit: "pcs" });
      steps.push({ k: "pieces", v: pieces, unit: "pcs" });
      return {
        demands: [
          {
            productId: p.id,
            selectionId: sel.id,
            placement: pl.kind,
            quantity: pieces,
            measure: { value: round(required, 3), unit: "m" },
            steps,
            labour: { value: round(net, 3), unit: "m" },
            installedMetres: net,
          },
        ],
        messages,
      };
    }

    case "keystone": {
      if (!needSides(pl.sides)) return { demands: [], messages };
      let list = openingsOn(g, pl.sides, pl.openings);
      // Openings whose surround kit already contains this keystone are not counted again.
      const covered = new Set<string>();
      for (const other of ctx.selections) {
        if (other.id === sel.id || !other.enabled) continue;
        const op = other.placement;
        if (op.kind !== "window-surround" && op.kind !== "door-surround") continue;
        const kit = ctx.product(other.productId)?.kitIncludes?.find((k) => k.productId === p.id);
        if (!kit) continue;
        const kind: OpeningKind = op.kind === "window-surround" ? "window" : "door";
        for (const { o } of openingsOn(g, op.sides, kind)) covered.add(o.id);
      }
      const before = list.length;
      list = list.filter(({ o }) => !covered.has(o.id));
      if (before !== list.length) {
        messages.push({ code: "kitDuplicate", severity: "warn", params: { sku: p.sku, count: before - list.length } });
      }
      if (!list.length) return { demands: [], messages };
      const { qty, reserve } = withReserve(list.length, p);
      return {
        demands: [
          {
            productId: p.id,
            selectionId: sel.id,
            placement: pl.kind,
            quantity: qty,
            measure: { value: list.length, unit: "pcs" },
            steps: [
              { k: "openings", v: list.length, unit: "pcs" },
              { k: "reserve", v: round(reserve * 100, 1), unit: "%" },
              { k: "pieces", v: qty, unit: "pcs" },
            ],
            labour: { value: list.length, unit: "pcs" },
            installedPieces: list.length,
          },
        ],
        messages,
      };
    }

    case "quoins": {
      const module = p.piece?.moduleHeight;
      if (!module) {
        messages.push({ code: "missingProductParam", severity: "error", params: { sku: p.sku, field: "moduleHeight" } });
        return { demands: [], messages };
      }
      if (!pl.corners.length) {
        messages.push({ code: "noCorners", severity: "error", params: { sku: p.sku } });
        return { demands: [], messages };
      }
      const height = wallHeight(g) - g.plinthHeight;
      const perCorner = ceilSafe(height / mmToM(module));
      const count = perCorner * pl.corners.length;
      const { qty, reserve } = withReserve(count, p);
      return {
        demands: [
          {
            productId: p.id,
            selectionId: sel.id,
            placement: pl.kind,
            quantity: qty,
            measure: { value: count, unit: "pcs" },
            steps: [
              { k: "cornerHeight", v: round(height, 3), unit: "m" },
              { k: "moduleHeight", v: module, unit: "mm" },
              { k: "perCorner", v: perCorner, unit: "pcs" },
              { k: "corners", v: pl.corners.length, unit: "pcs" },
              { k: "reserve", v: round(reserve * 100, 1), unit: "%" },
              { k: "pieces", v: qty, unit: "pcs" },
            ],
            labour: { value: count, unit: "pcs" },
            installedPieces: count,
          },
        ],
        messages,
      };
    }

    case "pilaster": {
      if (!needSides(pl.sides)) return { demands: [], messages };
      const count = pl.sides.length * pl.perSide;
      if (count <= 0) {
        messages.push({ code: "zeroCount", severity: "error", params: { sku: p.sku } });
        return { demands: [], messages };
      }
      const height = wallHeight(g) - g.plinthHeight;
      const max = p.piece?.maxHeight ? mmToM(p.piece.maxHeight) : undefined;
      const perPilaster = max ? ceilSafe(height / max) : 1;
      if (perPilaster > 1) messages.push({ code: "pilasterSpliced", severity: "warn", params: { sku: p.sku, parts: perPilaster } });
      const pieces = count * perPilaster;
      const { qty, reserve } = withReserve(pieces, p);
      return {
        demands: [
          {
            productId: p.id,
            selectionId: sel.id,
            placement: pl.kind,
            quantity: qty,
            measure: { value: pieces, unit: "pcs" },
            steps: [
              { k: "elements", v: count, unit: "pcs" },
              { k: "requiredHeight", v: round(height, 3), unit: "m" },
              { k: "partsPerElement", v: perPilaster, unit: "pcs" },
              { k: "reserve", v: round(reserve * 100, 1), unit: "%" },
              { k: "pieces", v: qty, unit: "pcs" },
            ],
            labour: { value: count, unit: "pcs" },
            installedPieces: pieces,
          },
        ],
        messages,
      };
    }

    case "column": {
      if (pl.count <= 0) {
        messages.push({ code: "zeroCount", severity: "error", params: { sku: p.sku } });
        return { demands: [], messages };
      }
      let height = pl.height;
      if (!height) {
        if (!ctx.geometryValid) {
          messages.push({ code: "missingParam", severity: "error", params: { field: "columnHeight" } });
          return { demands: [], messages };
        }
        height = g.floorHeight;
        messages.push({ code: "columnHeightFromFloor", severity: "info", params: { height: round(height, 2) } });
      }
      const hmm = height * 1000;
      const spec = p.piece ?? {};
      if ((spec.maxHeight && hmm > spec.maxHeight) || (spec.minHeight && hmm < spec.minHeight)) {
        messages.push({
          code: "heightOutOfRange",
          severity: "error",
          params: { sku: p.sku, height: round(height, 2), min: (spec.minHeight ?? 0) / 1000, max: (spec.maxHeight ?? 0) / 1000 },
        });
        return { demands: [], messages };
      }
      const d = p.dimensions.diameter ?? p.dimensions.width;
      if (d && spec.minRatio && spec.maxRatio) {
        const ratio = hmm / d;
        if (ratio < spec.minRatio || ratio > spec.maxRatio) {
          messages.push({
            code: "columnRatio",
            severity: "warn",
            params: { sku: p.sku, ratio: round(ratio, 1), min: spec.minRatio, max: spec.maxRatio },
          });
        }
      }
      const { qty, reserve } = withReserve(pl.count, p);
      return {
        demands: [
          {
            productId: p.id,
            selectionId: sel.id,
            placement: pl.kind,
            quantity: qty,
            measure: { value: pl.count, unit: "pcs" },
            steps: [
              { k: "elements", v: pl.count, unit: "pcs" },
              { k: "requiredHeight", v: round(height, 3), unit: "m" },
              { k: "reserve", v: round(reserve * 100, 1), unit: "%" },
              { k: "pieces", v: qty, unit: "pcs" },
            ],
            labour: { value: pl.count, unit: "pcs" },
            installedPieces: pl.count,
          },
        ],
        messages,
      };
    }

    case "brackets": {
      if (!needSides(pl.sides)) return { demands: [], messages };
      if (!(pl.spacing > 0)) {
        messages.push({ code: "missingParam", severity: "error", params: { field: "spacing" } });
        return { demands: [], messages };
      }
      const count = pl.sides.reduce((s, side) => s + Math.floor(round(wallLength(g, side) / pl.spacing, 6)) + 1, 0);
      const { qty, reserve } = withReserve(count, p);
      return {
        demands: [
          {
            productId: p.id,
            selectionId: sel.id,
            placement: pl.kind,
            quantity: qty,
            measure: { value: count, unit: "pcs" },
            steps: [
              { k: "spacing", v: pl.spacing, unit: "m" },
              { k: "elements", v: count, unit: "pcs" },
              { k: "reserve", v: round(reserve * 100, 1), unit: "%" },
              { k: "pieces", v: qty, unit: "pcs" },
            ],
            labour: { value: count, unit: "pcs" },
            installedPieces: count,
          },
        ],
        messages,
      };
    }

    case "manual-length": {
      if (!(pl.length > 0)) {
        messages.push({ code: "missingParam", severity: "error", params: { field: "length" } });
        return { demands: [], messages };
      }
      const section = p.piece?.sectionLength;
      if (section) {
        const sections = ceilSafe(pl.length / section);
        return {
          demands: [
            {
              productId: p.id,
              selectionId: sel.id,
              placement: pl.kind,
              quantity: sections,
              measure: { value: pl.length, unit: "m" },
              steps: [
                { k: "lineLength", v: pl.length, unit: "m" },
                { k: "sectionLength", v: section, unit: "m" },
                { k: "pieces", v: sections, unit: "pcs" },
              ],
              labour: { value: pl.length, unit: "m" },
              installedMetres: pl.length,
            },
          ],
          messages,
        };
      }
      if (!needLinear()) return { demands: [], messages };
      return { demands: linearRun(sel, p, pl.length, 0, false, messages), messages };
    }

    case "manual-count": {
      if (!(pl.count > 0)) {
        messages.push({ code: "zeroCount", severity: "error", params: { sku: p.sku } });
        return { demands: [], messages };
      }
      const { qty, reserve } = withReserve(pl.count, p);
      return {
        demands: [
          {
            productId: p.id,
            selectionId: sel.id,
            placement: pl.kind,
            quantity: qty,
            measure: { value: pl.count, unit: "pcs" },
            steps: [
              { k: "elements", v: pl.count, unit: "pcs" },
              { k: "reserve", v: round(reserve * 100, 1), unit: "%" },
              { k: "pieces", v: qty, unit: "pcs" },
            ],
            labour: { value: pl.count, unit: "pcs" },
            installedPieces: pl.count,
          },
        ],
        messages,
      };
    }

    case "area": {
      if (!needSides(pl.sides)) return { demands: [], messages };
      if (!p.area) {
        messages.push({ code: "missingProductParam", severity: "error", params: { sku: p.sku, field: "area" } });
        return { demands: [], messages };
      }
      const area = pl.sides.reduce((s, side) => s + netWallArea(g, side), 0);
      const waste = wasteOf(sel, p);
      const need = area * p.area.consumptionPerM2 * (1 + waste);
      const packs = ceilSafe(need / p.area.packSize);
      return {
        demands: [
          {
            productId: p.id,
            selectionId: sel.id,
            placement: pl.kind,
            quantity: packs,
            measure: { value: round(area, 3), unit: "m2" },
            steps: [
              { k: "netArea", v: round(area, 3), unit: "m2" },
              { k: "consumption", v: p.area.consumptionPerM2, unit: "kg" },
              { k: "waste", v: round(waste * 100, 1), unit: "%" },
              { k: "need", v: round(need, 2), unit: "kg" },
              { k: "packSize", v: p.area.packSize, unit: "kg" },
              { k: "pieces", v: packs, unit: "pcs" },
            ],
            labour: { value: round(area, 3), unit: "m2" },
          },
        ],
        messages,
      };
    }
  }
}

/** Consumables (adhesive, sealant…) needed for a demand, before rounding. */
export function consumablesFor(d: Demand, p: Product): Demand[] {
  return (p.consumables ?? []).flatMap((rule) => {
    const base = rule.per === "m" ? d.installedMetres : d.installedPieces;
    if (!base) return [];
    return [
      {
        productId: rule.productId,
        selectionId: d.selectionId,
        placement: d.placement,
        quantity: base * rule.rate,
        fractional: true,
        steps: [],
      },
    ];
  });
}

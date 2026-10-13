/**
 * Core domain types shared by the catalog, the 3D configurator, the calculator,
 * saved projects and the integration layer. No React, no I/O.
 *
 * Units: geometry in metres, product dimensions in millimetres, money in whole KZT.
 */

export type Locale = "ru" | "kk";
export const LOCALES: Locale[] = ["ru", "kk"];

/** Text in every supported language. `en` is optional until English is added. */
export type LocalizedText = { ru: string; kk: string; en?: string };

export type SaleUnit = "piece" | "m" | "m2" | "set" | "pack" | "cartridge";

export type CategoryId =
  | "moldings"
  | "cornices"
  | "window-surrounds"
  | "door-surrounds"
  | "columns"
  | "half-columns"
  | "pilasters"
  | "rusts"
  | "keystones"
  | "brackets"
  | "balustrades"
  | "rosettes"
  | "belts"
  | "plinth"
  | "corners"
  | "custom"
  | "accessories";

export interface Category {
  id: CategoryId;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  order: number;
}

export type MaterialId = "polyurethane" | "eps-coated" | "gfrc" | "polymer-concrete" | "polymer-adhesive";

export type Availability = "in-stock" | "to-order" | "on-request";

/** How a product can be placed on a facade (drives both 3D and calculation). */
export type PlacementKind =
  | "eaves"
  | "belt"
  | "plinth"
  | "window-surround"
  | "door-surround"
  | "keystone"
  | "quoins"
  | "pilaster"
  | "column"
  | "brackets"
  | "manual-length"
  | "manual-count"
  | "area";

/** Cross-section of a linear profile: points in mm, x = projection from wall, y = height. */
export type ProfilePoint = [number, number];

export interface LinearSpec {
  /** Nominal stock length, m. */
  nominalLength: number;
  /** Length actually usable for installation after trimming damaged/factory ends, m. */
  usableLength: number;
  /** Visible face height of the profile, mm. */
  profileHeight: number;
  /** Projection from the wall plane, mm. */
  projection: number;
  /** Closed polygon of the cross-section, mm. */
  profile: ProfilePoint[];
  /** Allowance per cut end (saw kerf + fitting), mm. */
  cutAllowance: number;
}

export interface PieceSpec {
  /** For quoins / rusts: block height incl. joint, mm. */
  moduleHeight?: number;
  /** Columns / pilasters: allowed height range, mm. */
  minHeight?: number;
  maxHeight?: number;
  /** Columns: allowed height / diameter ratio. */
  minRatio?: number;
  maxRatio?: number;
  /** Balustrade sections: section length, m. */
  sectionLength?: number;
}

export interface AreaSpec {
  /** Consumption per m², in pack units' base (kg). */
  consumptionPerM2: number;
  /** Pack size in the same base unit. */
  packSize: number;
}

export interface ConsumableRule {
  productId: string;
  /** Need per metre of installed profile or per installed piece. */
  per: "m" | "piece";
  rate: number;
}

export interface KitItem {
  productId: string;
  perUnit: number;
}

export type Model3D =
  | { kind: "parametric"; generator: PlacementKind }
  | { kind: "gltf"; url: string; scale?: number };

export interface Product {
  id: string;
  sku: string;
  slug: string;
  categoryId: CategoryId;
  name: LocalizedText;
  description: LocalizedText;
  material: MaterialId;
  /** Applicable dimensions only, mm. */
  dimensions: Partial<Record<"length" | "width" | "height" | "depth" | "diameter", number>>;
  saleUnit: SaleUnit;
  minOrder?: number;
  linear?: LinearSpec;
  piece?: PieceSpec;
  area?: AreaSpec;
  /** Default cutting allowance for linear products, fraction (0.07 = 7 %). */
  wastePercent?: number;
  /** Technological reserve for piece goods, fraction. */
  reservePercent?: number;
  consumables?: ConsumableRule[];
  /** Items already contained in one sale unit of this product. */
  kitIncludes?: KitItem[];
  /** Prefabricated outside-corner element for this profile, if any. */
  cornerElementId?: string;
  compatibleWith?: string[];
  related?: string[];
  placements: PlacementKind[];
  model3d?: Model3D;
  images: string[];
  availability: Availability;
  /** Data origin. Demo items must never be presented as real company products. */
  source: "demo" | "crm";
}

/* ------------------------------------------------------------------ geometry */

export type Side = "front" | "right" | "back" | "left";
export const SIDES: Side[] = ["front", "right", "back", "left"];

/** Corners are named by the two walls they join, in ring order. */
export type Corner = "front-right" | "right-back" | "back-left" | "left-front";
export const CORNERS: Corner[] = ["front-right", "right-back", "back-left", "left-front"];

export type OpeningKind = "window" | "door";

export interface Opening {
  id: string;
  kind: OpeningKind;
  /** m */
  width: number;
  height: number;
  /** 0-based floor index. */
  floor: number;
  /** Centre of the opening from the wall's left edge (seen from outside), m. */
  x: number;
  /** Bottom of the opening above that floor's level, m. */
  sill: number;
}

export interface Wall {
  side: Side;
  /** Whether this side is a decorated facade. */
  included: boolean;
  openings: Opening[];
}

export type RoofType = "hip" | "gable" | "flat";

export interface HouseGeometry {
  /** Front/back wall length, m. */
  length: number;
  /** Left/right wall length, m. */
  depth: number;
  floors: number;
  /** Floor-to-floor height, m. */
  floorHeight: number;
  /** Plinth (socle) height above ground, m. Floor 0 starts on top of it. */
  plinthHeight: number;
  roof: { type: RoofType; pitchDeg: number; overhang: number };
  walls: Wall[];
}

/* ---------------------------------------------------------------- placements */

export type SurroundScheme = "4" | "3" | "top";

export type Placement =
  | { kind: "eaves" | "belt" | "plinth"; sides: Side[]; useCornerElements?: boolean }
  | { kind: "window-surround" | "door-surround"; sides: Side[]; scheme: SurroundScheme }
  | { kind: "keystone"; sides: Side[]; openings: OpeningKind | "all" }
  | { kind: "quoins"; corners: Corner[] }
  | { kind: "pilaster"; sides: Side[]; perSide: number }
  | { kind: "column"; count: number; height?: number }
  | { kind: "brackets"; sides: Side[]; spacing: number }
  | { kind: "manual-length"; length: number; label?: string }
  | { kind: "manual-count"; count: number; label?: string }
  | { kind: "area"; sides: Side[] };

export interface DecorSelection {
  id: string;
  productId: string;
  enabled: boolean;
  placement: Placement;
  /** Overrides the product's cutting allowance (fraction). Pro mode. */
  wasteOverride?: number;
}

/* ------------------------------------------------------------------ projects */

export type BuildingType = "private-house" | "cottage" | "villa" | "commercial" | "other";
export type WallMaterial = "plaster" | "stone" | "brick" | "concrete";
export type Lighting = "day" | "evening";
export type PackageOption = "materials" | "delivery" | "installation" | "turnkey";
export type DeliveryZone = "pickup" | "city" | "region";

export interface SceneSettings {
  facadeColor: string;
  decorColor: string;
  roofColor: string;
  wallMaterial: WallMaterial;
  lighting: Lighting;
}

export interface CommercialOptions {
  package: PackageOption;
  deliveryZone: DeliveryZone;
  /** Required when deliveryZone = region. */
  distanceKm?: number;
}

export interface ExtraCost {
  id: string;
  label: string;
  amount: number;
}

export interface HistoryEntry {
  at: string;
  message: string;
}

export interface Variant {
  id: string;
  name: string;
  geometry: HouseGeometry;
  selections: DecorSelection[];
  scene: SceneSettings;
  options: CommercialOptions;
  extras: ExtraCost[];
  /** Manual quantity overrides by estimate line key (pro mode). */
  overrides: Record<string, number>;
  history: HistoryEntry[];
  /** A fixed estimate, frozen together with the price-list version it used. */
  snapshot?: EstimateSnapshot;
}

export interface Project {
  schemaVersion: 1;
  id: string;
  name: string;
  buildingType: BuildingType;
  createdAt: string;
  updatedAt: string;
  activeVariantId: string;
  variants: Variant[];
}

/* ------------------------------------------------------------------- pricing */

export interface LabourRates {
  /** KZT per metre of installed linear decor, by placement kind. */
  perMetre: Partial<Record<PlacementKind, number>>;
  /** KZT per installed piece, by placement kind. */
  perPiece: Partial<Record<PlacementKind, number>>;
  /** KZT per m² of area finish. */
  perM2: number;
}

export interface DeliveryRates {
  pickup: number;
  city: number;
  regionBase: number;
  regionPerKm: number;
}

export interface DiscountRule {
  id: string;
  /** Applies to the materials subtotal when it reaches the threshold. */
  materialsThreshold: number;
  percent: number;
}

export interface PriceList {
  version: string;
  effectiveFrom: string;
  currency: "KZT";
  source: "demo" | "crm";
  /** null = price on request (no reliable price available). */
  items: Record<string, number | null>;
  labour: LabourRates;
  delivery: DeliveryRates;
  discounts: DiscountRule[];
  turnkeyAvailable: boolean;
}

/* ------------------------------------------------------------------ estimate */

export interface CalcStep {
  /** i18n key under `calc.step.*` */
  k: string;
  v: number | string;
  unit?: "m" | "mm" | "m2" | "pcs" | "%" | "kg" | "KZT";
}

export interface EstimateLine {
  key: string;
  productId: string;
  sku: string;
  name: LocalizedText;
  categoryId: CategoryId;
  unit: SaleUnit;
  /** Quantity after overrides, in sale units. */
  quantity: number;
  computedQuantity: number;
  overridden: boolean;
  /** Physical measure that produced the quantity. */
  measure?: { value: number; unit: "m" | "m2" | "pcs" };
  reserve?: number;
  unitPrice: number | null;
  total: number | null;
  steps: CalcStep[];
  selectionIds: string[];
  isConsumable: boolean;
  minOrderApplied?: boolean;
}

export interface LabourLine {
  key: string;
  placement: PlacementKind;
  productId: string;
  measure: number;
  unit: "m" | "pcs" | "m2";
  rate: number;
  total: number;
}

export type MessageParams = Record<string, string | number>;
export interface CalcMessage {
  code: string;
  /** info: assumption/notice; warn: included but check it; error: NOT included in the estimate. */
  severity?: "info" | "warn" | "error";
  params?: MessageParams;
}

export interface EstimateTotals {
  materials: number;
  labour: number;
  delivery: number;
  extras: number;
  discount: number;
  total: number;
  hasUnpriced: boolean;
}

export interface GeometryMetrics {
  wallHeight: number;
  grossArea: number;
  openingsArea: number;
  netArea: number;
  perimeter: number;
  windows: number;
  doors: number;
}

export interface Estimate {
  lines: EstimateLine[];
  labour: LabourLine[];
  totals: EstimateTotals;
  metrics: GeometryMetrics;
  warnings: CalcMessage[];
  assumptions: CalcMessage[];
  priceListVersion: string;
  priceSource: "demo" | "crm";
  calculatedAt: string;
}

export interface EstimateSnapshot {
  estimate: Estimate;
  fixedAt: string;
}

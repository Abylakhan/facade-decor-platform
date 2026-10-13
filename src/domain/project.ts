/** Factories and pure operations on the shared project model. */
import type {
  BuildingType,
  DecorSelection,
  HouseGeometry,
  Opening,
  Project,
  SceneSettings,
  Side,
  Variant,
  Wall,
} from "./types";
import { SIDES } from "./types";
import { wallLength } from "./calc/geometry";
import { round } from "./calc/math";

export const uid = (prefix = "id") =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;

export const defaultScene: SceneSettings = {
  facadeColor: "#e8e1d4",
  decorColor: "#f6f2ea",
  roofColor: "#3a3734",
  wallMaterial: "plaster",
  lighting: "day",
};

export interface SimpleHouseInput {
  length: number;
  depth: number;
  floors: number;
  floorHeight: number;
  plinthHeight: number;
  /** Number of decorated facade sides, starting with the front: 1 = front, 2 = front+right... */
  facadeSides: number;
  windowsPerFloorFront: number;
  windowsPerFloorSide: number;
  windowWidth: number;
  windowHeight: number;
  doorWidth: number;
  doorHeight: number;
}

/** Evenly distributes `count` openings along a wall of length `len`. */
export function distribute(len: number, count: number, width: number, skipCentre = false): number[] {
  if (count <= 0) return [];
  const slots = skipCentre ? count + 1 : count;
  const step = len / slots;
  const xs = Array.from({ length: slots }, (_, i) => round(step * (i + 0.5), 3));
  if (skipCentre) xs.splice(Math.floor(slots / 2), 1);
  return xs.filter((x) => x - width / 2 >= 0.2 && x + width / 2 <= len - 0.2);
}

/** Builds a rectangular house with evenly spaced windows and a central front door. */
export function generateGeometry(i: SimpleHouseInput): HouseGeometry {
  const g: HouseGeometry = {
    length: i.length,
    depth: i.depth,
    floors: i.floors,
    floorHeight: i.floorHeight,
    plinthHeight: i.plinthHeight,
    roof: { type: "hip", pitchDeg: 28, overhang: 0.5 },
    walls: [],
  };
  const sill = round(Math.max(0.6, i.floorHeight - i.windowHeight - 0.35), 2);
  g.walls = SIDES.map((side, idx): Wall => {
    const len = wallLength(g, side);
    const perFloor = side === "front" || side === "back" ? i.windowsPerFloorFront : i.windowsPerFloorSide;
    const openings: Opening[] = [];
    for (let f = 0; f < i.floors; f++) {
      const hasDoor = side === "front" && f === 0 && i.doorWidth > 0;
      for (const x of distribute(len, perFloor, i.windowWidth, hasDoor)) {
        openings.push({ id: uid("w"), kind: "window", width: i.windowWidth, height: i.windowHeight, floor: f, x, sill });
      }
      if (hasDoor) {
        openings.push({ id: uid("d"), kind: "door", width: i.doorWidth, height: i.doorHeight, floor: 0, x: round(len / 2, 3), sill: 0 });
      }
    }
    return { side, included: idx < i.facadeSides, openings };
  });
  return g;
}

export const typicalHouse: SimpleHouseInput = {
  length: 12,
  depth: 10,
  floors: 2,
  floorHeight: 3.2,
  plinthHeight: 0.6,
  facadeSides: 4,
  windowsPerFloorFront: 4,
  windowsPerFloorSide: 2,
  windowWidth: 1.2,
  windowHeight: 1.6,
  doorWidth: 1.4,
  doorHeight: 2.4,
};

export function createVariant(name: string, geometry: HouseGeometry, selections: DecorSelection[] = []): Variant {
  return {
    id: uid("v"),
    name,
    geometry,
    selections,
    scene: { ...defaultScene },
    options: { package: "materials", deliveryZone: "city" },
    extras: [],
    overrides: {},
    history: [],
  };
}

export function createProject(name: string, buildingType: BuildingType, variant: Variant, now = new Date()): Project {
  return {
    schemaVersion: 1,
    id: uid("prj"),
    name,
    buildingType,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    activeVariantId: variant.id,
    variants: [variant],
  };
}

export function duplicateVariant(v: Variant, name: string): Variant {
  const copy: Variant = JSON.parse(JSON.stringify(v));
  copy.id = uid("v");
  copy.name = name;
  copy.snapshot = undefined;
  copy.history = [];
  copy.selections = copy.selections.map((s) => ({ ...s, id: uid("s") }));
  return copy;
}

/** A tasteful starting set of decor so the configurator never opens empty. */
export function starterSelections(sides: Side[]): DecorSelection[] {
  return [
    { id: uid("s"), productId: "p-k220", enabled: true, placement: { kind: "eaves", sides, useCornerElements: false } },
    { id: uid("s"), productId: "p-w150", enabled: true, placement: { kind: "window-surround", sides, scheme: "4" } },
    { id: uid("s"), productId: "p-pb150", enabled: true, placement: { kind: "belt", sides } },
    { id: uid("s"), productId: "p-pl200", enabled: true, placement: { kind: "plinth", sides } },
  ];
}

export function activeVariant(p: Project): Variant {
  return p.variants.find((v) => v.id === p.activeVariantId) ?? p.variants[0]!;
}

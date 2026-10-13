import type { CalcMessage, Corner, GeometryMetrics, HouseGeometry, Opening, Side, Wall } from "../types";
import { CORNERS, SIDES } from "../types";
import { round } from "./math";

/** Walls form a ring: front → right → back → left → front. */
export const CORNER_SIDES: Record<Corner, [Side, Side]> = {
  "front-right": ["front", "right"],
  "right-back": ["right", "back"],
  "back-left": ["back", "left"],
  "left-front": ["left", "front"],
};

export function wallLength(g: HouseGeometry, side: Side): number {
  return side === "front" || side === "back" ? g.length : g.depth;
}

/** Height from ground to the eaves line. */
export function wallHeight(g: HouseGeometry): number {
  return round(g.plinthHeight + g.floors * g.floorHeight, 6);
}

export function getWall(g: HouseGeometry, side: Side): Wall {
  return g.walls.find((w) => w.side === side) ?? { side, included: false, openings: [] };
}

export function wallArea(g: HouseGeometry, side: Side): number {
  return wallLength(g, side) * wallHeight(g);
}

export function openingArea(o: Opening): number {
  return o.width * o.height;
}

/** Usable wall area = wall area − area of its openings. */
export function netWallArea(g: HouseGeometry, side: Side): number {
  const w = getWall(g, side);
  const openings = w.openings.reduce((s, o) => s + openingArea(o), 0);
  return Math.max(0, wallArea(g, side) - openings);
}

/** Bottom of an opening above ground. */
export function openingBottom(g: HouseGeometry, o: Opening): number {
  return g.plinthHeight + o.floor * g.floorHeight + o.sill;
}

export function computeMetrics(g: HouseGeometry, sides: Side[] = includedSides(g)): GeometryMetrics {
  let grossArea = 0;
  let openingsArea = 0;
  let windows = 0;
  let doors = 0;
  for (const side of sides) {
    grossArea += wallArea(g, side);
    for (const o of getWall(g, side).openings) {
      openingsArea += openingArea(o);
      if (o.kind === "window") windows++;
      else doors++;
    }
  }
  return {
    wallHeight: wallHeight(g),
    grossArea: round(grossArea, 3),
    openingsArea: round(openingsArea, 3),
    netArea: round(Math.max(0, grossArea - openingsArea), 3),
    perimeter: round(2 * (g.length + g.depth), 3),
    windows,
    doors,
  };
}

export function includedSides(g: HouseGeometry): Side[] {
  return SIDES.filter((s) => getWall(g, s).included);
}

/** Outside corners where two selected sides meet (used for mitres / corner elements). */
export function outerCorners(sides: Side[]): Corner[] {
  const set = new Set(sides);
  return CORNERS.filter((c) => set.has(CORNER_SIDES[c][0]) && set.has(CORNER_SIDES[c][1]));
}

/** Validates dimensions and opening positions. Returns problems instead of throwing. */
export function validateGeometry(g: HouseGeometry): CalcMessage[] {
  const out: CalcMessage[] = [];
  const positive: [keyof HouseGeometry, number][] = [
    ["length", g.length],
    ["depth", g.depth],
    ["floors", g.floors],
    ["floorHeight", g.floorHeight],
  ];
  for (const [field, v] of positive) {
    if (!Number.isFinite(v) || v <= 0) out.push({ code: "missingParam", params: { field } });
  }
  if (!Number.isFinite(g.plinthHeight) || g.plinthHeight < 0) out.push({ code: "missingParam", params: { field: "plinthHeight" } });
  if (out.length) return out;

  for (const wall of g.walls) {
    const len = wallLength(g, wall.side);
    const sorted = [...wall.openings].sort((a, b) => a.floor - b.floor || a.x - b.x);
    for (const o of wall.openings) {
      const left = o.x - o.width / 2;
      const right = o.x + o.width / 2;
      if (o.width <= 0 || o.height <= 0) {
        out.push({ code: "openingInvalid", params: { side: wall.side, id: o.id } });
        continue;
      }
      if (left < 0 || right > len || o.floor >= g.floors || o.floor < 0 || o.sill + o.height > g.floorHeight) {
        out.push({ code: "openingOutside", params: { side: wall.side, id: o.id } });
      }
    }
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1]!;
      const b = sorted[i]!;
      if (a.floor === b.floor && a.x + a.width / 2 > b.x - b.width / 2) {
        out.push({ code: "openingOverlap", params: { side: wall.side, a: a.id, b: b.id } });
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------ 3D frames/anchors */

export interface WallFrame {
  /** World position of the wall's outer face, left-bottom corner (x, z). */
  origin: [number, number];
  /** Unit vector along the wall (left → right seen from outside). */
  dir: [number, number];
  /** Outward normal. */
  normal: [number, number];
  /** Rotation around Y so that local +X = dir, local +Z = normal. */
  rotationY: number;
  length: number;
}

/**
 * House is centred at the origin. X runs along `length`, Z along `depth`;
 * the front facade faces +Z.
 */
export function wallFrame(g: HouseGeometry, side: Side): WallFrame {
  const L = g.length / 2;
  const D = g.depth / 2;
  switch (side) {
    case "front":
      return { origin: [-L, D], dir: [1, 0], normal: [0, 1], rotationY: 0, length: g.length };
    case "right":
      return { origin: [L, D], dir: [0, -1], normal: [1, 0], rotationY: Math.PI / 2, length: g.depth };
    case "back":
      return { origin: [L, -D], dir: [-1, 0], normal: [0, -1], rotationY: Math.PI, length: g.length };
    case "left":
      return { origin: [-L, -D], dir: [0, 1], normal: [-1, 0], rotationY: -Math.PI / 2, length: g.depth };
  }
}

/** Converts a point in wall-local coordinates (u along wall, y up, d outward) to world. */
export function wallToWorld(f: WallFrame, u: number, y: number, d = 0): [number, number, number] {
  return [f.origin[0] + f.dir[0] * u + f.normal[0] * d, y, f.origin[1] + f.dir[1] * u + f.normal[1] * d];
}

export interface Anchors {
  eavesY: number;
  plinthTopY: number;
  floorLinesY: number[];
  corners: { corner: Corner; x: number; z: number }[];
  openings: { side: Side; opening: Opening; bottom: number; top: number; left: number; right: number }[];
}

/** Snap points used to place decor according to the house dimensions. */
export function computeAnchors(g: HouseGeometry): Anchors {
  const H = wallHeight(g);
  const floorLinesY: number[] = [];
  for (let i = 1; i < g.floors; i++) floorLinesY.push(round(g.plinthHeight + i * g.floorHeight, 6));
  const L = g.length / 2;
  const D = g.depth / 2;
  const cornerPos: Record<Corner, [number, number]> = {
    "front-right": [L, D],
    "right-back": [L, -D],
    "back-left": [-L, -D],
    "left-front": [-L, D],
  };
  return {
    eavesY: H,
    plinthTopY: g.plinthHeight,
    floorLinesY,
    corners: CORNERS.map((c) => ({ corner: c, x: cornerPos[c][0], z: cornerPos[c][1] })),
    openings: g.walls.flatMap((w) =>
      w.openings.map((o) => {
        const bottom = openingBottom(g, o);
        return { side: w.side, opening: o, bottom, top: bottom + o.height, left: o.x - o.width / 2, right: o.x + o.width / 2 };
      }),
    ),
  };
}

/**
 * Where decor goes on a wall (wall-local coordinates: u along the wall from its left
 * edge seen from outside, y above ground). Shared by the 2D elevation and the 3D model,
 * so the drawing, the scene and the calculation always describe the same facade.
 */
import type { HouseGeometry, Opening, Side } from "../types";
import { getWall, openingBottom, wallLength } from "./geometry";
import { round } from "./math";

/** Free intervals on the wall's ground floor between openings (and the wall ends). */
export function freeIntervals(len: number, openings: Opening[], margin = 0.15): [number, number][] {
  const busy = openings
    .filter((o) => o.floor === 0)
    .map((o) => [o.x - o.width / 2 - margin, o.x + o.width / 2 + margin] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  let cur = 0;
  for (const [a, b] of busy) {
    if (a > cur) out.push([cur, a]);
    cur = Math.max(cur, b);
  }
  if (cur < len) out.push([cur, len]);
  return out;
}

/**
 * Axis positions for `n` pilasters: the widest gaps between openings are used,
 * spread from the corners inwards. Elements never overlap an opening.
 */
export function pilasterPositions(g: HouseGeometry, side: Side, n: number, width: number): number[] {
  if (n <= 0) return [];
  const len = wallLength(g, side);
  const gaps = freeIntervals(len, getWall(g, side).openings).filter(([a, b]) => b - a >= width + 0.1);
  if (!gaps.length) return [];
  const ends = n >= 2 ? [width / 2 + 0.05, len - width / 2 - 0.05] : [];
  const centres = gaps.map(([a, b]) => (a + b) / 2).filter((c) => ends.every((e) => Math.abs(e - c) > width * 1.5));
  const candidates = [...ends, ...centres.sort((a, b) => Math.abs(a - len / 2) - Math.abs(b - len / 2))];
  return candidates
    .slice(0, n)
    .map((x) => round(x, 3))
    .sort((a, b) => a - b);
}

/** Column axes in front of the main door (or the facade centre), symmetric. */
export function columnPositions(g: HouseGeometry, count: number): { u: number; offset: number }[] {
  if (count <= 0) return [];
  const front = getWall(g, "front");
  const door = front.openings.find((o) => o.kind === "door");
  const centre = door?.x ?? g.length / 2;
  const span = Math.max(1.8, (door?.width ?? 1.2) + 1.0);
  const xs: number[] = [];
  const half = Math.floor(count / 2);
  if (count % 2 === 1) xs.push(centre);
  for (let i = 0; i < half; i++) {
    const d = (count % 2 === 1 ? 1.6 * (i + 1) : span / 2 + 1.6 * i);
    xs.push(centre - d, centre + d);
  }
  return xs
    .filter((x) => x > 0.2 && x < g.length - 0.2)
    .sort((a, b) => a - b)
    .map((u) => ({ u: round(u, 3), offset: 1.6 }));
}

/** Bracket positions along a wall: floor(len / spacing) + 1, evenly spread. */
export function bracketPositions(len: number, spacing: number): number[] {
  if (!(spacing > 0)) return [];
  const count = Math.floor(round(len / spacing, 6)) + 1;
  if (count === 1) return [len / 2];
  const step = (len - 0.2) / (count - 1);
  return Array.from({ length: count }, (_, i) => round(0.1 + i * step, 3));
}

export interface OpeningBox {
  o: Opening;
  left: number;
  right: number;
  bottom: number;
  top: number;
}

export function openingBoxes(g: HouseGeometry, side: Side, kind?: Opening["kind"]): OpeningBox[] {
  return getWall(g, side)
    .openings.filter((o) => !kind || o.kind === kind)
    .map((o) => {
      const bottom = openingBottom(g, o);
      return { o, left: o.x - o.width / 2, right: o.x + o.width / 2, bottom, top: bottom + o.height };
    });
}

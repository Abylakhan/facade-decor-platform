/** Geometry builders for the parametric house and decor. Units: metres. */
import * as THREE from "three";
import type { HouseGeometry, ProfilePoint, Side } from "@/domain/types";
import { getWall, openingBottom, wallHeight, wallLength } from "@/domain/calc/geometry";

/** Wall slab with window/door holes. Local frame: x along wall, y up, outer face at z = 0. */
export function wallGeometry(g: HouseGeometry, side: Side, thickness = 0.3): THREE.BufferGeometry {
  const len = wallLength(g, side);
  const H = wallHeight(g);
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(len, 0);
  shape.lineTo(len, H);
  shape.lineTo(0, H);
  shape.closePath();
  for (const o of getWall(g, side).openings) {
    const b = openingBottom(g, o);
    const l = Math.max(0.02, o.x - o.width / 2);
    const r = Math.min(len - 0.02, o.x + o.width / 2);
    const t = Math.min(H - 0.02, b + o.height);
    if (r <= l || t <= b) continue;
    const hole = new THREE.Path();
    hole.moveTo(l, b);
    hole.lineTo(l, t);
    hole.lineTo(r, t);
    hole.lineTo(r, b);
    hole.closePath();
    shape.holes.push(hole);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geo.translate(0, 0, -thickness);
  return geo;
}

const basisH = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, 0, 0));
const basisV = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0));

/**
 * Extrudes a profile cross-section (mm) to a given length (m). The cross-section is
 * never scaled — only the extrusion length changes.
 * - "h": runs along +x from 0 to length, profile height along +y.
 * - "v": runs along +y from 0 to length, profile face width along +x.
 * Projection always points out of the wall (+z).
 */
export function profileGeometry(profile: ProfilePoint[], length: number, dir: "h" | "v"): THREE.BufferGeometry {
  const shape = new THREE.Shape(profile.map(([x, y]) => new THREE.Vector2(x / 1000, y / 1000)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.001, length), bevelEnabled: false, curveSegments: 1 });
  if (dir === "h") {
    geo.applyMatrix4(basisH);
    geo.translate(length, 0, 0);
  } else {
    geo.applyMatrix4(basisV);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Roof as a non-indexed mesh (flat shaded). */
export function roofGeometry(g: HouseGeometry): THREE.BufferGeometry {
  const H = wallHeight(g);
  const o = g.roof.overhang;
  const X = g.length / 2 + o;
  const Z = g.depth / 2 + o;
  const pitch = (g.roof.pitchDeg * Math.PI) / 180;
  const v: number[] = [];
  const tri = (a: number[], b: number[], c: number[]) => v.push(...a, ...b, ...c);
  const quad = (a: number[], b: number[], c: number[], d: number[]) => {
    tri(a, b, c);
    tri(a, c, d);
  };
  if (g.roof.type === "flat") {
    const t = 0.25;
    const box = new THREE.BoxGeometry(g.length + 0.3, t, g.depth + 0.3);
    box.translate(0, H + t / 2, 0);
    return box;
  }
  const alongX = g.length >= g.depth;
  const run = alongX ? Z : X;
  const rise = Math.tan(pitch) * run;
  const top = H + rise;
  const e = [
    [-X, H, Z],
    [X, H, Z],
    [X, H, -Z],
    [-X, H, -Z],
  ] as const;
  if (g.roof.type === "hip") {
    const half = alongX ? Math.max(0, X - Z) : Math.max(0, Z - X);
    const r1 = alongX ? [-half, top, 0] : [0, top, half];
    const r2 = alongX ? [half, top, 0] : [0, top, -half];
    if (alongX) {
      quad([...e[0]], [...e[1]], r2, r1); // front
      quad([...e[2]], [...e[3]], r1, r2); // back
      tri([...e[1]], [...e[2]], r2); // right
      tri([...e[3]], [...e[0]], r1); // left
    } else {
      quad([...e[1]], [...e[2]], r2, r1);
      quad([...e[3]], [...e[0]], r1, r2);
      tri([...e[0]], [...e[1]], r1);
      tri([...e[2]], [...e[3]], r2);
    }
  } else {
    // gable: ridge along the longer side, gable ends closed by triangles
    const r1 = alongX ? [-X, top, 0] : [0, top, Z];
    const r2 = alongX ? [X, top, 0] : [0, top, -Z];
    if (alongX) {
      quad([...e[0]], [...e[1]], r2, r1);
      quad([...e[2]], [...e[3]], r1, r2);
      const L = g.length / 2;
      const D = g.depth / 2;
      const gr = Math.tan(pitch) * D;
      tri([L, H, D], [L, H, -D], [L, H + gr, 0]);
      tri([-L, H, -D], [-L, H, D], [-L, H + gr, 0]);
    } else {
      quad([...e[1]], [...e[2]], r2, r1);
      quad([...e[3]], [...e[0]], r1, r2);
      const L = g.length / 2;
      const D = g.depth / 2;
      const gr = Math.tan(pitch) * L;
      tri([-L, H, D], [L, H, D], [0, H + gr, D]);
      tri([L, H, -D], [-L, H, -D], [0, H + gr, -D]);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  geo.computeVertexNormals();
  return geo;
}

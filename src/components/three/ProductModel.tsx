"use client";
/**
 * 3D representation of a single catalog product, built from its own data
 * (profile section, dimensions). Shown mounted on a short wall sample so the
 * scale and the way it sits on a facade are readable.
 */
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Product } from "@/domain/types";
import { metricBox, profileGeometry } from "./geometry3d";
import { bandProfile, corniceProfile } from "@/data/demo-catalog";
import { applySet, pbrSet } from "./pbr";

const mm = (v: number | undefined, d: number) => (v ?? d) / 1000;

function lathe(points: [number, number][], segments = 48) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments);
}

/** Tuscan column: base, entasis shaft, capital (radius r, height h). */
function columnGeo(r: number, h: number) {
  const pts: [number, number][] = [
    [0, 0],
    [r * 1.35, 0],
    [r * 1.35, h * 0.03],
    [r * 1.2, h * 0.035],
    [r * 1.22, h * 0.05],
    [r * 1.05, h * 0.065],
  ];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const ent = 1 - 0.16 * Math.pow(Math.max(0, t - 0.33) / 0.67, 1.6);
    pts.push([r * ent, h * (0.07 + t * 0.81)]);
  }
  pts.push([r * 0.95, h * 0.9], [r * 1.12, h * 0.925], [r * 1.12, h * 0.94], [r * 1.4, h * 0.95], [r * 1.4, h], [0, h]);
  return lathe(pts);
}

function baluster(h: number) {
  return lathe(
    [
      [0, 0],
      [0.055, 0],
      [0.055, h * 0.08],
      [0.035, h * 0.12],
      [0.06, h * 0.35],
      [0.065, h * 0.45],
      [0.03, h * 0.75],
      [0.042, h * 0.86],
      [0.05, h * 0.92],
      [0.05, h],
      [0, h],
    ],
    24,
  );
}

function rosette(d: number, depth: number) {
  const r = d / 2;
  const pts: [number, number][] = [[0, depth]];
  const rings = 5;
  for (let i = 1; i <= rings * 8; i++) {
    const t = i / (rings * 8);
    pts.push([r * t, depth * (0.35 + 0.65 * (1 - t)) + Math.sin(t * Math.PI * rings * 2) * depth * 0.12]);
  }
  pts.push([r, 0], [0, 0]);
  return lathe(pts.map(([x, y]) => [x, y]), 72).rotateX(Math.PI / 2);
}

function bracketGeo(w: number, h: number, d: number) {
  // S-scroll console profile (side view), extruded across its width
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(0, h);
  s.lineTo(d, h);
  s.lineTo(d, h * 0.86);
  s.bezierCurveTo(d * 0.55, h * 0.84, d * 0.62, h * 0.45, d * 0.32, h * 0.3);
  s.bezierCurveTo(d * 0.12, h * 0.2, d * 0.28, 0.02, d * 0.12, 0);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false, curveSegments: 16 });
  g.translate(0, 0, -w / 2);
  g.rotateY(-Math.PI / 2);
  return g;
}

function keystoneGeo(w: number, h: number, d: number) {
  const s = new THREE.Shape();
  s.moveTo(-w * 0.36, 0);
  s.lineTo(w * 0.36, 0);
  s.lineTo(w / 2, h);
  s.lineTo(-w / 2, h);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2 });
}

export interface ProductModelInfo {
  /** Bounding size for camera framing, m. */
  size: THREE.Vector3;
  center: THREE.Vector3;
}

/** Returns geometry pieces for the product (in metres, wall plane at z = 0, floor at y = 0). */
function buildPieces(p: Product): { geo: THREE.BufferGeometry; pos?: [number, number, number]; mat?: "decor" | "accent" }[] {
  const d = p.dimensions;
  if (p.linear) {
    const L = 0.7;
    const g = profileGeometry(p.linear.profile, L, "h");
    g.translate(-L / 2, 0.25, 0);
    return [{ geo: g }];
  }
  if (p.categoryId === "corners") {
    // outside corner: two short profile runs meeting at 90° on a wall corner
    const h = d.height ?? 220;
    const proj = Math.min(h * 0.8, 180);
    const prof = h >= 150 ? corniceProfile(h, proj) : bandProfile(h, proj * 0.4);
    const L = 0.32;
    const a = profileGeometry(prof, L, "h").translate(-L, 0.3, 0);
    const b = profileGeometry(prof, L, "h").rotateY(Math.PI / 2).translate(0, 0.3, 0);
    return [{ geo: a }, { geo: b }];
  }
  switch (p.categoryId) {
    case "columns": {
      const r = mm(d.diameter, 300) / 2;
      const h = Math.min(mm(d.height, 3000), 3.2);
      const g = columnGeo(r, h);
      g.translate(0, 0, r * 1.6);
      return [{ geo: g }];
    }
    case "half-columns": {
      const r = mm(d.diameter, 250) / 2;
      const g = columnGeo(r, 2.4);
      // keep the front half only by flattening the back onto the wall
      const pos = g.getAttribute("position");
      for (let i = 0; i < pos.count; i++) if (pos.getZ(i) < 0) pos.setZ(i, 0);
      g.computeVertexNormals();
      return [{ geo: g }];
    }
    case "pilasters": {
      const w = mm(d.width, 300);
      const dep = mm(d.depth, 60);
      const h = 2.4;
      const shaft = new THREE.BoxGeometry(w, h - 0.36, dep).translate(0, h / 2, dep / 2);
      const base = new THREE.BoxGeometry(w + 0.08, 0.18, dep + 0.04).translate(0, 0.09, (dep + 0.04) / 2);
      const cap = new THREE.BoxGeometry(w + 0.1, 0.18, dep + 0.06).translate(0, h - 0.09, (dep + 0.06) / 2);
      const flutes = [-0.25, 0, 0.25].map((f) => new THREE.BoxGeometry(w * 0.08, h - 0.6, 0.01).translate(f * w, h / 2, dep + 0.003));
      return [{ geo: shaft }, { geo: base }, { geo: cap }, ...flutes.map((geo) => ({ geo, mat: "accent" as const }))];
    }
    case "rusts": {
      const w = mm(d.width, 400);
      const h = mm(d.height, 280);
      const dep = mm(d.depth, 40);
      const mod = p.piece?.moduleHeight ? p.piece.moduleHeight / 1000 : h + 0.02;
      return Array.from({ length: 4 }, (_, i) => {
        const ww = i % 2 ? w * 0.65 : w;
        const g = new THREE.BoxGeometry(ww, h, dep).translate(-ww / 2 + w / 2, 0.15 + i * mod + h / 2, dep / 2);
        return { geo: g };
      });
    }
    case "keystones": {
      const g = keystoneGeo(mm(d.width, 180), mm(d.height, 240), mm(d.depth, 60));
      g.translate(0, 0.4, 0);
      return [{ geo: g }];
    }
    case "brackets": {
      const g = bracketGeo(mm(d.width, 160), mm(d.height, 220), mm(d.depth, 180));
      g.translate(0, 0.5, 0);
      return [{ geo: g }];
    }
    case "balustrades": {
      const len = p.piece?.sectionLength ?? 1.2;
      const h = mm(d.height, 900);
      const out: { geo: THREE.BufferGeometry }[] = [
        { geo: new THREE.BoxGeometry(len, 0.12, 0.24).translate(0, 0.06, 0.25) },
        { geo: new THREE.BoxGeometry(len, 0.1, 0.26).translate(0, h - 0.05, 0.25) },
      ];
      for (let i = 0; i < 8; i++) out.push({ geo: baluster(h - 0.22).translate(-len / 2 + (i + 0.5) * (len / 8), 0.12, 0.25) });
      return out;
    }
    case "rosettes": {
      if (d.diameter) return [{ geo: rosette(mm(d.diameter, 400), mm(d.depth, 50)).translate(0, 0.6, 0) }];
      const w = mm(d.width, 900);
      const h = mm(d.height, 300);
      const panel = new THREE.BoxGeometry(w, h, 0.02).translate(0, 0.5, 0.01);
      const scrolls = [-1, 1].map((sgn) => rosette(h * 0.7, mm(d.depth, 40)).translate((sgn * w) / 4, 0.5, 0.02));
      return [{ geo: panel }, ...scrolls.map((geo) => ({ geo }))];
    }
    case "accessories": {
      if (p.saleUnit === "pack") {
        return [
          { geo: lathe([[0, 0], [0.13, 0], [0.15, 0.3], [0.155, 0.31], [0, 0.31]], 40).translate(0, 0, 0.3), mat: "accent" },
        ];
      }
      const g = lathe([[0, 0], [0.024, 0], [0.024, 0.2], [0.012, 0.21], [0.004, 0.29], [0, 0.29]], 32);
      g.rotateZ(Math.PI / 2).translate(0.15, 0.03, 0.25);
      return [{ geo: g, mat: "accent" }];
    }
    default: {
      const w = mm(d.width, 500);
      const h = mm(d.height, 500);
      return [{ geo: new THREE.BoxGeometry(w, h, mm(d.depth, 60)).translate(0, 0.3 + h / 2, mm(d.depth, 60) / 2) }];
    }
  }
}

export function productBounds(p: Product): ProductModelInfo {
  const box = new THREE.Box3();
  for (const piece of buildPieces(p)) {
    piece.geo.computeBoundingBox();
    box.union(piece.geo.boundingBox!);
    piece.geo.dispose();
  }
  return { size: box.getSize(new THREE.Vector3()), center: box.getCenter(new THREE.Vector3()) };
}

export function ProductModel({ product, color = "#f2ede4", wall = true }: { product: Product; color?: string; wall?: boolean }) {
  const pieces = useMemo(() => buildPieces(product), [product]);
  const mats = useMemo(() => {
    const decor = applySet(new THREE.MeshStandardMaterial(), pbrSet("beige_wall_001", 0.6), 0.45);
    decor.map = null;
    decor.color.set(color);
    const accent = new THREE.MeshStandardMaterial({ color: product.categoryId === "accessories" ? "#e7e2d8" : color, roughness: 0.45 });
    const wallMat = applySet(new THREE.MeshStandardMaterial(), pbrSet("beige_wall_001", 1.6), 0.8);
    wallMat.map = null;
    wallMat.color.set("#ddd4c5");
    return { decor, accent, wall: wallMat };
  }, [color, product.categoryId]);
  useEffect(
    () => () => {
      pieces.forEach((x) => x.geo.dispose());
      Object.values(mats).forEach((m) => m.dispose());
    },
    [pieces, mats],
  );
  const wallGeo = useMemo(() => metricBox(6, 3, 0.1), []);
  useEffect(() => () => wallGeo.dispose(), [wallGeo]);
  const mounted = wall && !["columns", "accessories", "balustrades"].includes(product.categoryId);
  const corner = product.categoryId === "corners";
  return (
    <group>
      {pieces.map((x, i) => (
        <mesh key={i} geometry={x.geo} position={x.pos} material={x.mat === "accent" ? mats.accent : mats.decor} castShadow receiveShadow />
      ))}
      {mounted && (
        <>
          <mesh geometry={wallGeo} position={[corner ? -3 : 0, 1.5, -0.05]} material={mats.wall} receiveShadow />
          {corner && <mesh geometry={wallGeo} position={[-0.05, 1.5, -3]} rotation={[0, Math.PI / 2, 0]} material={mats.wall} receiveShadow />}
        </>
      )}
    </group>
  );
}

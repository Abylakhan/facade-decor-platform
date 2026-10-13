"use client";
/**
 * Parametric house + decor built from the shared project model.
 * Every element is positioned from the geometry anchors (walls, openings, floor
 * lines, eaves, corners) — the same data the calculator uses.
 */
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { DecorSelection, HouseGeometry, Product, Side, Variant } from "@/domain/types";
import { SIDES } from "@/domain/types";
import { CORNER_SIDES, wallFrame, wallHeight, wallLength } from "@/domain/calc/geometry";
import { bracketPositions, columnPositions, openingBoxes, pilasterPositions } from "@/domain/calc/layout";
import { profileGeometry, roofGeometry, wallGeometry } from "./geometry3d";
import { wallTexture } from "./textures";

export interface HouseFx {
  /** 0..1 how much of the blueprint edges is drawn */
  lines: number;
  /** 0..1 opacity of solid surfaces */
  solid: number;
  /** 0..1 blend from blueprint tint to real materials */
  material: number;
}

interface Mats {
  wall: THREE.MeshStandardMaterial;
  plinth: THREE.MeshStandardMaterial;
  decor: THREE.MeshStandardMaterial;
  roof: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  frame: THREE.MeshStandardMaterial;
  door: THREE.MeshStandardMaterial;
}

const RING: Side[] = SIDES; // front → right → back → left
const next = (s: Side) => RING[(RING.indexOf(s) + 1) % 4]!;
const prev = (s: Side) => RING[(RING.indexOf(s) + 3) % 4]!;

export function HouseModel({
  variant,
  product,
  fxRef,
  lowDetail = false,
}: {
  variant: Variant;
  product: (id: string) => Product | undefined;
  fxRef?: MutableRefObject<HouseFx>;
  lowDetail?: boolean;
}) {
  const g = variant.geometry;
  const scene = variant.scene;
  const evening = scene.lighting === "evening";

  const mats = useMemo<Mats>(() => {
    const m: Mats = {
      wall: new THREE.MeshStandardMaterial({ color: scene.facadeColor, map: typeof document !== "undefined" ? wallTexture(scene.wallMaterial) : null, roughness: 0.92 }),
      plinth: new THREE.MeshStandardMaterial({ color: "#8c857a", roughness: 0.95 }),
      decor: new THREE.MeshStandardMaterial({ color: scene.decorColor, roughness: 0.55 }),
      roof: new THREE.MeshStandardMaterial({ color: scene.roofColor, roughness: 0.75, side: THREE.DoubleSide }),
      glass: new THREE.MeshStandardMaterial({
        color: evening ? "#3a2a12" : "#7d93a1",
        emissive: evening ? "#ffb85c" : "#000000",
        emissiveIntensity: evening ? 1.1 : 0,
        roughness: 0.08,
        metalness: 0.6,
      }),
      frame: new THREE.MeshStandardMaterial({ color: "#2b2a27", roughness: 0.5 }),
      door: new THREE.MeshStandardMaterial({ color: "#4a3b2e", roughness: 0.6 }),
    };
    for (const mat of Object.values(m)) mat.userData.base = mat.color.clone();
    return m;
  }, [scene.facadeColor, scene.decorColor, scene.roofColor, scene.wallMaterial, evening]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  const groupRef = useRef<THREE.Group>(null);
  useBlueprintFx(groupRef, fxRef, mats, variant);

  const shadow = !lowDetail;
  const roof = useMemo(() => {
    const geo = roofGeometry(g);
    geo.translate(0, 0.12, 0);
    return geo;
  }, [g]);
  useEffect(() => () => roof.dispose(), [roof]);
  const H = wallHeight(g);
  const enabled = variant.selections.filter((s) => s.enabled);

  return (
    <group ref={groupRef}>
      {RING.map((side) => (
        <WallBlock key={side} g={g} side={side} mats={mats} shadow={shadow} />
      ))}
      {/* roof slab + roof */}
      <mesh position={[0, H + 0.06, 0]} material={mats.frame} castShadow={shadow}>
        <boxGeometry args={[g.length + 2 * g.roof.overhang, 0.12, g.depth + 2 * g.roof.overhang]} />
      </mesh>
      <mesh geometry={roof} material={mats.roof} castShadow={shadow} receiveShadow={shadow} />
      {enabled.map((s) => (
        <Decor key={s.id} sel={s} g={g} product={product} mats={mats} all={enabled} shadow={shadow} />
      ))}
    </group>
  );
}

/* ----------------------------------------------------------------- walls */

function WallFrame({ g, side, children }: { g: HouseGeometry; side: Side; children: React.ReactNode }) {
  const f = wallFrame(g, side);
  return (
    <group position={[f.origin[0], 0, f.origin[1]]} rotation={[0, f.rotationY, 0]}>
      {children}
    </group>
  );
}

function WallBlock({ g, side, mats, shadow }: { g: HouseGeometry; side: Side; mats: Mats; shadow: boolean }) {
  const geo = useMemo(() => wallGeometry(g, side), [g, side]);
  useEffect(() => () => geo.dispose(), [geo]);
  const len = wallLength(g, side);
  return (
    <WallFrame g={g} side={side}>
      <mesh geometry={geo} material={mats.wall} castShadow={shadow} receiveShadow={shadow} />
      {g.plinthHeight > 0 && (
        <mesh position={[len / 2, g.plinthHeight / 2, 0.03]} material={mats.plinth} receiveShadow={shadow}>
          <boxGeometry args={[len + 0.06, g.plinthHeight, 0.06]} />
        </mesh>
      )}
      {openingBoxes(g, side).map((b) => {
        const w = b.right - b.left;
        const h = b.top - b.bottom;
        const cx = (b.left + b.right) / 2;
        const cy = (b.bottom + b.top) / 2;
        if (b.o.kind === "door") {
          return (
            <group key={b.o.id}>
              <mesh position={[cx, cy, -0.1]} material={mats.door}>
                <boxGeometry args={[w, h, 0.06]} />
              </mesh>
              <mesh position={[cx, b.bottom + h * 0.7, -0.06]} material={mats.glass}>
                <boxGeometry args={[w * 0.6, h * 0.35, 0.01]} />
              </mesh>
            </group>
          );
        }
        return (
          <group key={b.o.id}>
            <mesh position={[cx, cy, -0.14]} material={mats.glass}>
              <planeGeometry args={[w, h]} />
            </mesh>
            {/* frame + mullion + transom */}
            <mesh position={[cx, cy, -0.12]} material={mats.frame}>
              <boxGeometry args={[0.05, h, 0.05]} />
            </mesh>
            <mesh position={[cx, b.top - h * 0.3, -0.12]} material={mats.frame}>
              <boxGeometry args={[w, 0.05, 0.05]} />
            </mesh>
            <mesh position={[cx, b.bottom - 0.03, 0.03]} material={mats.plinth}>
              <boxGeometry args={[w + 0.1, 0.05, 0.1]} />
            </mesh>
          </group>
        );
      })}
    </WallFrame>
  );
}

/* ----------------------------------------------------------------- decor */

function useProfile(profile: [number, number][] | undefined, length: number, dir: "h" | "v") {
  const geo = useMemo(() => (profile ? profileGeometry(profile, length, dir) : null), [profile, length, dir]);
  useEffect(() => () => geo?.dispose(), [geo]);
  return geo;
}

function Run({ profile, from, to, y, mat, shadow }: { profile: [number, number][]; from: number; to: number; y: number; mat: THREE.Material; shadow: boolean }) {
  const geo = useProfile(profile, to - from, "h");
  if (!geo) return null;
  return <mesh geometry={geo} position={[from, y, 0]} material={mat} castShadow={shadow} />;
}

function Jamb({ profile, x, y0, y1, mat }: { profile: [number, number][]; x: number; y0: number; y1: number; mat: THREE.Material }) {
  const geo = useProfile(profile, y1 - y0, "v");
  if (!geo) return null;
  return <mesh geometry={geo} position={[x, y0, 0]} material={mat} />;
}

function Keystone({ x, y, mat }: { x: number; y: number; mat: THREE.Material }) {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.07, 0);
    s.lineTo(0.07, 0);
    s.lineTo(0.1, 0.26);
    s.lineTo(-0.1, 0.26);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: false });
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} position={[x, y - 0.04, 0]} material={mat} />;
}

function GltfPiece({ url, scale = 1, position }: { url: string; scale?: number; position: [number, number, number] }) {
  const { scene } = useGLTF(url);
  const clone = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={clone} position={position} scale={scale} />;
}

function Decor({
  sel,
  g,
  product,
  mats,
  all,
  shadow,
}: {
  sel: DecorSelection;
  g: HouseGeometry;
  product: (id: string) => Product | undefined;
  mats: Mats;
  all: DecorSelection[];
  shadow: boolean;
}) {
  const p = product(sel.productId);
  if (!p || !p.placements.includes(sel.placement.kind)) return null;
  const pl = sel.placement;
  const H = wallHeight(g);
  const mat = mats.decor;
  const profile = p.linear?.profile;
  const ph = (p.linear?.profileHeight ?? 150) / 1000;
  const proj = (p.linear?.projection ?? 100) / 1000;

  switch (pl.kind) {
    case "eaves":
    case "belt":
    case "plinth": {
      if (!profile) return null;
      const ys =
        pl.kind === "eaves"
          ? [H - ph]
          : pl.kind === "plinth"
            ? [g.plinthHeight - ph * 0.35]
            : Array.from({ length: Math.max(0, g.floors - 1) }, (_, i) => g.plinthHeight + (i + 1) * g.floorHeight - ph / 2);
      return (
        <>
          {pl.sides.map((side) => {
            const len = wallLength(g, side);
            const from = pl.sides.includes(prev(side)) ? -proj : 0;
            const to = pl.sides.includes(next(side)) ? len + proj : len;
            return (
              <WallFrame key={side} g={g} side={side}>
                {ys.map((y) => (
                  <Run key={y} profile={profile} from={from} to={to} y={y} mat={mat} shadow={shadow} />
                ))}
              </WallFrame>
            );
          })}
        </>
      );
    }
    case "window-surround":
    case "door-surround": {
      if (!profile) return null;
      const kind = pl.kind === "window-surround" ? "window" : "door";
      const f = ph;
      const withKeystone = !!p.kitIncludes?.length;
      return (
        <>
          {pl.sides.map((side) => (
            <WallFrame key={side} g={g} side={side}>
              {openingBoxes(g, side, kind).map((b) => {
                const low = pl.scheme === "4" ? b.bottom - f : b.bottom;
                return (
                  <group key={b.o.id}>
                    <Run profile={profile} from={b.left - f} to={b.right + f} y={b.top} mat={mat} shadow={false} />
                    {pl.scheme !== "top" && (
                      <>
                        <Jamb profile={profile} x={b.left - f} y0={low} y1={b.top} mat={mat} />
                        <Jamb profile={profile} x={b.right} y0={low} y1={b.top} mat={mat} />
                      </>
                    )}
                    {pl.scheme === "4" && <Run profile={profile} from={b.left - f} to={b.right + f} y={b.bottom - f} mat={mat} shadow={false} />}
                    {withKeystone && <Keystone x={b.o.x} y={b.top + f * 0.4} mat={mat} />}
                  </group>
                );
              })}
            </WallFrame>
          ))}
        </>
      );
    }
    case "keystone": {
      // skip openings whose surround kit already includes this keystone (same rule as the estimate)
      const covered = new Set<string>();
      for (const o of all) {
        const op = o.placement;
        if ((op.kind === "window-surround" || op.kind === "door-surround") && product(o.productId)?.kitIncludes?.some((k) => k.productId === p.id)) {
          for (const side of op.sides) for (const b of openingBoxes(g, side, op.kind === "window-surround" ? "window" : "door")) covered.add(b.o.id);
        }
      }
      return (
        <>
          {pl.sides.map((side) => (
            <WallFrame key={side} g={g} side={side}>
              {openingBoxes(g, side, pl.openings === "all" ? undefined : pl.openings)
                .filter((b) => !covered.has(b.o.id))
                .map((b) =>
                  p.model3d?.kind === "gltf" ? (
                    <GltfPiece key={b.o.id} url={p.model3d.url} scale={p.model3d.scale} position={[b.o.x, b.top, 0]} />
                  ) : (
                    <Keystone key={b.o.id} x={b.o.x} y={b.top} mat={mat} />
                  ),
                )}
            </WallFrame>
          ))}
        </>
      );
    }
    case "quoins": {
      const mod = (p.piece?.moduleHeight ?? 300) / 1000;
      const n = Math.ceil((H - g.plinthHeight) / mod);
      const depth = (p.dimensions.depth ?? 40) / 1000;
      return (
        <>
          {pl.corners.flatMap((c) => {
            const [a, b] = CORNER_SIDES[c];
            return [
              { side: a, atEnd: true },
              { side: b, atEnd: false },
            ].map(({ side, atEnd }) => {
              const len = wallLength(g, side);
              return (
                <WallFrame key={`${c}-${side}`} g={g} side={side}>
                  {Array.from({ length: n }, (_, i) => {
                    const w = (i + (atEnd ? 0 : 1)) % 2 === 0 ? 0.42 : 0.28;
                    const y = g.plinthHeight + i * mod;
                    const h = Math.min(mod - 0.025, H - y - 0.02);
                    if (h <= 0) return null;
                    const x = atEnd ? len - w / 2 : w / 2;
                    return (
                      <mesh key={i} position={[x, y + h / 2, depth / 2]} material={mat} castShadow={shadow}>
                        <boxGeometry args={[w, h, depth]} />
                      </mesh>
                    );
                  })}
                </WallFrame>
              );
            });
          })}
        </>
      );
    }
    case "pilaster": {
      const w = (p.dimensions.width ?? p.dimensions.diameter ?? 300) / 1000;
      const d = (p.dimensions.depth ?? 60) / 1000;
      const round = p.categoryId === "half-columns";
      const top = H - 0.25;
      const h = top - g.plinthHeight;
      return (
        <>
          {pl.sides.map((side) => (
            <WallFrame key={side} g={g} side={side}>
              {pilasterPositions(g, side, pl.perSide, w).map((u) => (
                <group key={u} position={[u, 0, 0]}>
                  {round ? (
                    <mesh position={[0, g.plinthHeight + h / 2, 0]} rotation={[0, -Math.PI / 2, 0]} material={mat} castShadow={shadow}>
                      <cylinderGeometry args={[w / 2, w / 2, h - 0.3, 20, 1, false, 0, Math.PI]} />
                    </mesh>
                  ) : (
                    <mesh position={[0, g.plinthHeight + h / 2, d / 2]} material={mat} castShadow={shadow}>
                      <boxGeometry args={[w, h - 0.3, d]} />
                    </mesh>
                  )}
                  <mesh position={[0, g.plinthHeight + 0.09, d / 2 + 0.01]} material={mat}>
                    <boxGeometry args={[w + 0.08, 0.18, d + 0.04]} />
                  </mesh>
                  <mesh position={[0, top - 0.1, d / 2 + 0.015]} material={mat}>
                    <boxGeometry args={[w + 0.1, 0.2, d + 0.05]} />
                  </mesh>
                </group>
              ))}
            </WallFrame>
          ))}
        </>
      );
    }
    case "column": {
      const dia = (p.dimensions.diameter ?? 300) / 1000;
      const h = pl.height ?? g.floorHeight;
      const cols = columnPositions(g, pl.count);
      if (!cols.length) return null;
      const offset = cols[0]!.offset;
      const minU = cols[0]!.u - dia;
      const maxU = cols[cols.length - 1]!.u + dia;
      return (
        <WallFrame g={g} side="front">
          {/* porch slab */}
          <mesh position={[(minU + maxU) / 2, g.plinthHeight / 2, offset / 2 + 0.2]} material={mats.plinth} receiveShadow={shadow} castShadow={shadow}>
            <boxGeometry args={[maxU - minU + 0.8, g.plinthHeight, offset + 0.4]} />
          </mesh>
          {cols.map((c) => (
            <group key={c.u} position={[c.u, g.plinthHeight, offset]}>
              <mesh position={[0, 0.08, 0]} material={mat} castShadow={shadow}>
                <boxGeometry args={[dia * 1.35, 0.16, dia * 1.35]} />
              </mesh>
              <mesh position={[0, h / 2, 0]} material={mat} castShadow={shadow}>
                <cylinderGeometry args={[dia * 0.42, dia / 2, h - 0.36, lowGeom(shadow)]} />
              </mesh>
              <mesh position={[0, h - 0.1, 0]} material={mat} castShadow={shadow}>
                <boxGeometry args={[dia * 1.4, 0.2, dia * 1.4]} />
              </mesh>
            </group>
          ))}
          {/* entablature tying columns to the wall */}
          <mesh position={[(minU + maxU) / 2, g.plinthHeight + h + 0.15, offset / 2]} material={mat} castShadow={shadow}>
            <boxGeometry args={[maxU - minU + 0.3, 0.3, offset + dia * 1.4]} />
          </mesh>
        </WallFrame>
      );
    }
    case "brackets": {
      const w = (p.dimensions.width ?? 160) / 1000;
      const hh = (p.dimensions.height ?? 220) / 1000;
      const d = (p.dimensions.depth ?? 180) / 1000;
      const eaves = all.find((s) => s.placement.kind === "eaves");
      const eavesH = eaves ? (product(eaves.productId)?.linear?.profileHeight ?? 0) / 1000 : 0;
      return (
        <>
          {pl.sides.map((side) => (
            <WallFrame key={side} g={g} side={side}>
              {bracketPositions(wallLength(g, side), pl.spacing).map((u) =>
                p.model3d?.kind === "gltf" ? (
                  <GltfPiece key={u} url={p.model3d.url} scale={p.model3d.scale} position={[u, H - eavesH - hh, 0]} />
                ) : (
                  <mesh key={u} position={[u, H - eavesH - hh / 2, d / 2]} material={mat} castShadow={shadow}>
                    <boxGeometry args={[w, hh, d]} />
                  </mesh>
                ),
              )}
            </WallFrame>
          ))}
        </>
      );
    }
    default:
      // manual-length / manual-count / area have no fixed position on the model
      return null;
  }
}

const lowGeom = (hi: boolean) => (hi ? 28 : 14);

/* ------------------------------------------------- blueprint → material fx */

function useBlueprintFx(groupRef: React.RefObject<THREE.Group | null>, fxRef: MutableRefObject<HouseFx> | undefined, mats: Mats, variant: Variant) {
  const edges = useRef<THREE.LineSegments[]>([]);
  const lineMat = useMemo(() => new THREE.LineBasicMaterial({ color: "#8fc1ea", transparent: true }), []);
  useEffect(() => {
    if (!fxRef || !groupRef.current) return;
    const created: THREE.LineSegments[] = [];
    // wait one frame so all decor meshes are mounted
    const id = requestAnimationFrame(() => {
      groupRef.current?.traverse((obj) => {
        if (obj instanceof THREE.Mesh && !obj.userData.fxEdge) {
          const eg = new THREE.EdgesGeometry(obj.geometry, 28);
          const ls = new THREE.LineSegments(eg, lineMat);
          ls.userData.fxEdge = true;
          ls.userData.count = eg.getAttribute("position").count;
          obj.add(ls);
          created.push(ls);
        }
      });
      edges.current = created;
      for (const m of Object.values(mats)) {
        m.transparent = true;
        m.needsUpdate = true;
      }
    });
    return () => {
      cancelAnimationFrame(id);
      for (const ls of created) {
        ls.parent?.remove(ls);
        ls.geometry.dispose();
      }
      edges.current = [];
    };
  }, [fxRef, groupRef, mats, variant, lineMat]);

  const blue = useMemo(() => new THREE.Color("#16324d"), []);
  useFrame(() => {
    if (!fxRef) return;
    const { lines, solid, material } = fxRef.current;
    for (const m of Object.values(mats)) {
      m.opacity = solid;
      m.depthWrite = solid > 0.95;
      m.visible = solid > 0.01;
      m.color.lerpColors(blue, m.userData.base as THREE.Color, material);
    }
    lineMat.opacity = Math.min(1, lines * 1.2) * (1 - material * 0.9);
    lineMat.visible = lineMat.opacity > 0.01;
    for (const ls of edges.current) {
      const c = ls.userData.count as number;
      ls.geometry.setDrawRange(0, Math.floor((c * Math.min(1, lines)) / 2) * 2);
    }
  });
}

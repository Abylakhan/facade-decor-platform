"use client";
/**
 * Parametric house + decor built from the shared project model.
 * Every element is positioned from the geometry anchors (walls, openings, floor
 * lines, eaves, corners) — the same data the calculator uses.
 */
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { DecorSelection, HouseGeometry, Product, Side, Variant } from "@/domain/types";
import { SIDES } from "@/domain/types";
import { CORNER_SIDES, wallFrame, wallHeight, wallLength } from "@/domain/calc/geometry";
import { bracketPositions, columnPositions, openingBoxes, pilasterPositions } from "@/domain/calc/layout";
import { metricBox, profileGeometry, roofGeometry, wallGeometry } from "./geometry3d";
import { HIGHLIGHT, WALL_SETS, applySet, pbrSet, wallTint } from "./pbr";

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
  glass: THREE.MeshPhysicalMaterial;
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
  highlightId = null,
}: {
  variant: Variant;
  product: (id: string) => Product | undefined;
  fxRef?: MutableRefObject<HouseFx>;
  lowDetail?: boolean;
  /** Selection to emphasise in the scene (e.g. while it is edited in the panel). */
  highlightId?: string | null;
}) {
  const g = variant.geometry;
  const scene = variant.scene;
  const evening = scene.lighting === "evening";

  const invalidate = useThree((st) => st.invalidate);
  // Materials are rebuilt only when the texture set or lighting changes;
  // colours change smoothly in useFrame (see useColourTransition).
  const mats = useMemo<Mats>(() => {
    const ws = WALL_SETS[scene.wallMaterial];
    const m: Mats = {
      wall: applySet(new THREE.MeshStandardMaterial(), pbrSet(ws.id, ws.tile), 1),
      plinth: applySet(new THREE.MeshStandardMaterial(), pbrSet("castle_brick_02_white", 1.1), 1.2),
      decor: applySet(new THREE.MeshStandardMaterial(), pbrSet("beige_wall_001", 0.7), 0.5),
      roof: applySet(new THREE.MeshStandardMaterial({ side: THREE.DoubleSide }), pbrSet("grey_roof_tiles_02", 1.6), 1.2),
      glass: new THREE.MeshPhysicalMaterial({
        color: evening ? "#3a2810" : "#a9bcc8",
        emissive: evening ? "#ffb35a" : "#000000",
        emissiveIntensity: evening ? 1.6 : 0,
        roughness: 0.04,
        metalness: evening ? 0.3 : 0.88,
        envMapIntensity: 1.25,
      }),
      frame: new THREE.MeshStandardMaterial({ color: "#2e2c29", roughness: 0.38, metalness: 0.4 }),
      door: new THREE.MeshStandardMaterial({ color: "#3a2a1e", roughness: 0.42, metalness: 0.05 }),
    };
    m.decor.map = null; // painted decor: relief from the normal map, colour from the palette
    m.plinth.color.set("#a29b90");
    for (const mat of Object.values(m)) mat.userData.target = mat.color.clone();
    return m;
  }, [scene.wallMaterial, evening]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  // colour targets from the palette
  useEffect(() => {
    wallTint(scene.wallMaterial, scene.facadeColor, mats.wall.userData.target as THREE.Color);
    (mats.decor.userData.target as THREE.Color).set(scene.decorColor);
    (mats.roof.userData.target as THREE.Color).set("#ffffff").lerp(new THREE.Color(scene.roofColor), 0.75);
    if (!fxRef) for (const k of ["wall", "decor", "roof"] as const) if (!mats[k].userData.init) {
      mats[k].color.copy(mats[k].userData.target as THREE.Color);
      mats[k].userData.init = true;
    }
    invalidate();
  }, [mats, scene.facadeColor, scene.decorColor, scene.roofColor, scene.wallMaterial, fxRef, invalidate]);
  useFrame((_, dt) => {
    if (fxRef) return;
    let moving = false;
    const k = 1 - Math.pow(0.002, dt);
    for (const mat of [mats.wall, mats.decor, mats.roof]) {
      const t = mat.userData.target as THREE.Color;
      if (Math.abs(mat.color.r - t.r) + Math.abs(mat.color.g - t.g) + Math.abs(mat.color.b - t.b) > 0.002) {
        mat.color.lerp(t, k);
        moving = true;
      }
    }
    if (moving) invalidate();
  });

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
        <DecorFade key={s.id} base={mats.decor} highlighted={s.id === highlightId}>
          {(mat) => <Decor sel={s} g={g} product={product} mats={{ ...mats, decor: mat }} all={enabled} shadow={shadow} />}
        </DecorFade>
      ))}
    </group>
  );
}

/** Box mesh with metric UVs (memoised geometry). */
function MBox({ args, ...rest }: { args: [number, number, number] } & Omit<React.ComponentProps<"mesh">, "args">) {
  const [w, h, d] = args;
  const geo = useMemo(() => metricBox(w, h, d), [w, h, d]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} {...rest} />;
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
        <MBox args={[len + 0.06, g.plinthHeight, 0.06]} position={[len / 2, g.plinthHeight / 2, 0.03]} material={mats.plinth} receiveShadow={shadow} />
      )}
      {openingBoxes(g, side).map((b) => {
        const w = b.right - b.left;
        const h = b.top - b.bottom;
        const cx = (b.left + b.right) / 2;
        const cy = (b.bottom + b.top) / 2;
        if (b.o.kind === "door") {
          return (
            <group key={b.o.id}>
              {/* door leaf with raised panels and a glazed top */}
              <mesh position={[cx, cy, -0.16]} material={mats.door} castShadow={shadow}>
                <boxGeometry args={[w, h, 0.06]} />
              </mesh>
              {[0.28, 0.62].map((f) => (
                <mesh key={f} position={[cx, b.bottom + h * f, -0.125]} material={mats.door}>
                  <boxGeometry args={[w * 0.72, h * 0.26, 0.02]} />
                </mesh>
              ))}
              <mesh position={[cx, b.bottom + h * 0.86, -0.12]} material={mats.glass}>
                <boxGeometry args={[w * 0.72, h * 0.14, 0.01]} />
              </mesh>
              <mesh position={[cx + w * 0.36, b.bottom + h * 0.48, -0.1]} material={mats.frame}>
                <sphereGeometry args={[0.03, 12, 8]} />
              </mesh>
              {/* stone threshold step */}
              <MBox args={[w + 0.6, 0.16, 0.5]} position={[cx, b.bottom - 0.08, 0.18]} material={mats.plinth} receiveShadow={shadow} castShadow={shadow} />
            </group>
          );
        }
        const t = 0.06; // frame profile
        return (
          <group key={b.o.id}>
            <mesh position={[cx, cy, -0.18]} material={mats.glass}>
              <planeGeometry args={[w, h]} />
            </mesh>
            {/* outer frame */}
            <mesh position={[cx, b.top - t / 2, -0.15]} material={mats.frame}>
              <boxGeometry args={[w, t, 0.07]} />
            </mesh>
            <mesh position={[cx, b.bottom + t / 2, -0.15]} material={mats.frame}>
              <boxGeometry args={[w, t, 0.07]} />
            </mesh>
            <mesh position={[b.left + t / 2, cy, -0.15]} material={mats.frame}>
              <boxGeometry args={[t, h, 0.07]} />
            </mesh>
            <mesh position={[b.right - t / 2, cy, -0.15]} material={mats.frame}>
              <boxGeometry args={[t, h, 0.07]} />
            </mesh>
            {/* casement mullion and transom */}
            <mesh position={[cx, cy, -0.16]} material={mats.frame}>
              <boxGeometry args={[0.045, h, 0.05]} />
            </mesh>
            <mesh position={[cx, b.top - h * 0.28, -0.16]} material={mats.frame}>
              <boxGeometry args={[w, 0.045, 0.05]} />
            </mesh>
            {/* stone sill with drip */}
            <MBox args={[w + 0.14, 0.07, 0.42]} position={[cx, b.bottom - 0.035, 0.02]} material={mats.plinth} castShadow={shadow} />
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
          <MBox args={[maxU - minU + 0.8, g.plinthHeight, offset + 0.4]} position={[(minU + maxU) / 2, g.plinthHeight / 2, offset / 2 + 0.2]} material={mats.plinth} receiveShadow={shadow} castShadow={shadow} />
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

/**
 * Per-selection material that follows the shared decor material (colour, blueprint
 * fade) and adds a soft appear animation and a bronze highlight while edited.
 */
function DecorFade({ base, highlighted, children }: { base: THREE.MeshStandardMaterial; highlighted: boolean; children: (m: THREE.MeshStandardMaterial) => React.ReactNode }) {
  const invalidate = useThree((st) => st.invalidate);
  const mat = useMemo(() => {
    const m = base.clone();
    m.transparent = true;
    m.opacity = 0;
    m.userData.appear = 0;
    m.userData.glow = 0;
    return m;
  }, [base]);
  useEffect(() => () => mat.dispose(), [mat]);
  useEffect(() => invalidate(), [highlighted, invalidate]);
  useFrame((_, dt) => {
    const k = 1 - Math.pow(0.001, dt);
    const appear = (mat.userData.appear as number) + (1 - (mat.userData.appear as number)) * k;
    const glow = (mat.userData.glow as number) + ((highlighted ? 1 : 0) - (mat.userData.glow as number)) * k;
    mat.userData.appear = appear > 0.995 ? 1 : appear;
    mat.userData.glow = Math.abs(glow - (highlighted ? 1 : 0)) < 0.005 ? (highlighted ? 1 : 0) : glow;
    mat.color.copy(base.color);
    mat.opacity = base.opacity * (mat.userData.appear as number);
    mat.transparent = mat.opacity < 0.999 || base.transparent;
    mat.depthWrite = base.depthWrite && mat.opacity > 0.95;
    mat.visible = base.visible;
    mat.emissive.copy(HIGHLIGHT).multiplyScalar(0.35 * (mat.userData.glow as number));
    if (mat.userData.appear !== 1 || (mat.userData.glow !== 0 && mat.userData.glow !== 1)) invalidate();
  });
  return <>{children(mat)}</>;
}

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
      m.color.lerpColors(blue, m.userData.target as THREE.Color, material);
    }
    lineMat.opacity = Math.min(1, lines * 1.2) * (1 - material * 0.9);
    lineMat.visible = lineMat.opacity > 0.01;
    for (const ls of edges.current) {
      const c = ls.userData.count as number;
      ls.geometry.setDrawRange(0, Math.floor((c * Math.min(1, lines)) / 2) * 2);
    }
  });
}

/**
 * PBR material library built on CC0 texture sets from Poly Haven
 * (see public/assets/LICENSES.md). Geometry UVs are in metres, so
 * `repeat = 1 / tile size in metres`.
 */
import * as THREE from "three";
import type { WallMaterial } from "@/domain/types";
import { asset } from "@/lib/site";

export type PbrId =
  | "beige_wall_001"
  | "plastered_wall_02"
  | "castle_brick_02_white"
  | "brick_wall_001"
  | "grey_roof_tiles_02"
  | "patterned_paving"
  | "grass_ground";

export interface PbrSet {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  arm: THREE.Texture;
}

const loader = typeof window !== "undefined" ? new THREE.TextureLoader() : null;
const cache = new Map<string, PbrSet>();

function tex(path: string, srgb: boolean, tile: number, onLoad?: () => void) {
  const t = loader!.load(asset(path), onLoad);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / tile, 1 / tile);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Loads (once) a texture set; tile = real-world size of one texture repeat, m. */
export function pbrSet(id: PbrId, tile: number, onLoad?: () => void): PbrSet {
  const key = `${id}@${tile}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const set = {
    map: tex(`/assets/pbr/${id}/diff.jpg`, true, tile, onLoad),
    normalMap: tex(`/assets/pbr/${id}/nor.jpg`, false, tile, onLoad),
    arm: tex(`/assets/pbr/${id}/arm.jpg`, false, tile, onLoad),
  };
  cache.set(key, set);
  return set;
}

/** Applies a set to a standard material: ARM = AO (r), roughness (g), metalness (b). */
export function applySet(m: THREE.MeshStandardMaterial, s: PbrSet, normalScale = 1) {
  m.map = s.map;
  m.normalMap = s.normalMap;
  m.normalScale.set(normalScale, normalScale);
  m.aoMap = s.arm;
  m.aoMapIntensity = 0.9;
  m.roughnessMap = s.arm;
  m.metalnessMap = s.arm;
  m.roughness = 1;
  m.metalness = 1;
  m.needsUpdate = true;
  return m;
}

export const WALL_SETS: Record<WallMaterial, { id: PbrId; tile: number; tint: number }> = {
  plaster: { id: "beige_wall_001", tile: 2.2, tint: 1 },
  concrete: { id: "plastered_wall_02", tile: 3.2, tint: 0.8 },
  stone: { id: "castle_brick_02_white", tile: 1.8, tint: 0.35 },
  brick: { id: "brick_wall_001", tile: 1.4, tint: 0.15 },
};

export const HDRI = {
  day: "/assets/hdri/kloofendal_48d_partly_cloudy_puresky_1k.hdr",
  evening: "/assets/hdri/venice_sunset_1k.hdr",
};

/**
 * Colour shown for a facade: plaster/concrete take the chosen colour fully;
 * stone/brick keep their natural texture and receive only a light tint.
 */
export function wallTint(kind: WallMaterial, color: string, out = new THREE.Color()) {
  out.set("#ffffff").lerp(new THREE.Color(color), WALL_SETS[kind].tint);
  // the plaster/concrete albedo maps are mid-beige: compensate so the result reads as the chosen colour
  if (kind === "plaster" || kind === "concrete") out.multiplyScalar(1.2);
  return out;
}

/** Bronze accent used to highlight the decor element being edited. */
export const HIGHLIGHT = new THREE.Color("#c08a4e");

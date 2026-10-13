"use client";
/**
 * Shared architectural "stage": HDRI image-based lighting, sun with soft shadows,
 * landscaped ground and (on capable devices) ambient occlusion + anti-aliasing.
 * Used by the configurator, the hero scene and the render lab, so every view of
 * the house is lit the same way.
 */
import { Suspense, useEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import type { HouseGeometry, Lighting } from "@/domain/types";
import { getWall, wallHeight } from "@/domain/calc/geometry";
import { asset } from "@/lib/site";
import { HDRI, applySet, pbrSet } from "./pbr";

/** Re-render on demand when any texture/HDRI finishes loading. */
export function InvalidateOnLoad() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  });
  useEffect(() => {
    const m = THREE.DefaultLoadingManager;
    const prev = m.onLoad;
    m.onLoad = () => {
      prev?.();
      invalidate();
    };
    m.onProgress = () => invalidate();
    return () => {
      m.onLoad = prev;
    };
  }, [invalidate]);
  return null;
}

export function Sun({ lighting, size, shadows, intensity = 1 }: { lighting: Lighting; size: number; shadows: boolean; intensity?: number }) {
  const ref = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    const l = ref.current;
    if (!l) return;
    const c = l.shadow.camera;
    c.left = c.bottom = -size;
    c.right = c.top = size;
    c.near = 1;
    c.far = size * 6;
    c.updateProjectionMatrix();
    l.shadow.radius = 4;
    l.shadow.normalBias = 0.02;
  }, [size]);
  const evening = lighting === "evening";
  return (
    <directionalLight
      ref={ref}
      position={evening ? [-size * 1.6, size * 0.45, size * 1.2] : [size * 1.1, size * 1.6, size * 1.3]}
      intensity={(evening ? 1.6 : 3.4) * intensity}
      color={evening ? "#ffb47a" : "#fff1dc"}
      castShadow={shadows}
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.0002}
    />
  );
}

/** Lawn, paved terrace around the house and a path to the entrance. */
export function Grounds({ g, shadows }: { g: HouseGeometry; shadows: boolean }) {
  const mats = useMemo(() => {
    const lawn = applySet(new THREE.MeshStandardMaterial(), pbrSet("grass_ground", 2.2), 0.8);
    lawn.color.set("#b3bd93");
    const paving = applySet(new THREE.MeshStandardMaterial(), pbrSet("patterned_paving", 2.4), 1);
    paving.color.set("#d9d2c4");
    return { lawn, paving };
  }, []);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  const pad = 2.2;
  const door = getWall(g, "front").openings.find((o) => o.kind === "door");
  const doorX = door ? -g.length / 2 + door.x : 0;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow={shadows} material={mats.lawn}>
        <TerracePlane w={220} d={220} />
      </mesh>
      {/* terrace: UVs scaled to metres via geometry size */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow={shadows} material={mats.paving}>
        <TerracePlane w={g.length + pad * 2} d={g.depth + pad * 2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[doorX, 0.006, g.depth / 2 + pad + 6]} receiveShadow={shadows} material={mats.paving}>
        <TerracePlane w={2.4} d={12} />
      </mesh>
    </group>
  );
}

function TerracePlane({ w, d }: { w: number; d: number }) {
  const geo = useMemo(() => {
    const p = new THREE.PlaneGeometry(w, d);
    const uv = p.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * d);
    return p;
  }, [w, d]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <primitive object={geo} attach="geometry" />;
}

/**
 * HDRI environment (sky + reflections). `background` shows the sky behind the house.
 */
export function Sky({ lighting, background = true, intensity = 1 }: { lighting: Lighting; background?: boolean; intensity?: number }) {
  // own Suspense boundary: the house renders immediately, the sky joins when loaded
  return (
    <Suspense fallback={null}>
      <SkyInner lighting={lighting} background={background} intensity={intensity} />
      <InvalidateOnLoad />
    </Suspense>
  );
}

function SkyInner({ lighting, background, intensity }: { lighting: Lighting; background: boolean; intensity: number }) {
  return (
    <Environment
      files={asset(lighting === "evening" ? HDRI.evening : HDRI.day)}
      background={background}
      backgroundBlurriness={0.02}
      backgroundIntensity={lighting === "evening" ? 0.7 : 1}
      environmentIntensity={(lighting === "evening" ? 0.55 : 1.05) * intensity}
    />
  );
}

/** Post-processing for capable devices: AO grounds the decor in the facade. */
export function Post({ evening, enabled }: { evening: boolean; enabled: boolean }) {
  const gl = useThree((st) => st.gl);
  useEffect(() => {
    // the composer applies tone mapping itself; without it the renderer does
    gl.toneMapping = enabled ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1;
  }, [gl, enabled]);
  if (!enabled) return null;
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <N8AO aoRadius={0.9} intensity={2.2} distanceFalloff={0.6} quality="medium" halfRes />
      {evening ? <Bloom intensity={0.6} luminanceThreshold={0.9} mipmapBlur /> : <></>}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.25} darkness={0.35} />
      <SMAA />
    </EffectComposer>
  );
}

export function stageSize(g: HouseGeometry) {
  return Math.max(g.length, g.depth, wallHeight(g)) + 6;
}

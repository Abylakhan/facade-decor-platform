"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, OrbitControls, PerformanceMonitor } from "@react-three/drei";
import { Grounds, InvalidateOnLoad, Post, Sky, Sun, stageSize } from "./SceneStage";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { Product, Variant } from "@/domain/types";
import { wallHeight } from "@/domain/calc/geometry";
import { HouseModel } from "./HouseModel";
import { deviceTier } from "./webgl";

export type ViewPreset = "front" | "left" | "right" | "back" | "top" | "iso";

export function presetPose(v: Variant, view: ViewPreset): { pos: THREE.Vector3; target: THREE.Vector3 } {
  const g = v.geometry;
  const H = wallHeight(g);
  const R = Math.max(g.length, g.depth, H) * 1.45 + 4;
  const target = new THREE.Vector3(0, H * 0.45, 0);
  const pos = {
    front: [0, H * 0.55, g.depth / 2 + R],
    back: [0, H * 0.55, -g.depth / 2 - R],
    right: [g.length / 2 + R, H * 0.55, 0],
    left: [-g.length / 2 - R, H * 0.55, 0],
    top: [0.01, R * 1.6, 0.01],
    iso: [R * 0.72, H * 0.9 + 2, R * 0.85],
  }[view] as [number, number, number];
  return { pos: new THREE.Vector3(...pos), target };
}

function CameraRig({ variant, view, nonce }: { variant: Variant; view: ViewPreset; nonce: number }) {
  const { camera, controls, invalidate } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: OrbitControlsImpl | null; invalidate: () => void };
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  useEffect(() => {
    goal.current = presetPose(variant, view);
    invalidate();
    // re-run only when the user asks for a view (nonce), not on every geometry edit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, nonce]);
  useFrame((_, dt) => {
    const gl = goal.current;
    if (!gl || !controls) return;
    const k = 1 - Math.pow(0.0015, dt);
    camera.position.lerp(gl.pos, k);
    controls.target.lerp(gl.target, k);
    controls.update();
    if (camera.position.distanceTo(gl.pos) < 0.02) goal.current = null;
    invalidate();
  });
  return null;
}

export function FacadeScene({
  variant,
  product,
  view,
  viewNonce,
  className = "",
  highlightId = null,
}: {
  variant: Variant;
  product: (id: string) => Product | undefined;
  view: ViewPreset;
  viewNonce: number;
  className?: string;
  highlightId?: string | null;
}) {
  const [tier] = useState(() => deviceTier());
  const [degraded, setDegraded] = useState(false);
  const low = tier === "low" || degraded;
  const evening = variant.scene.lighting === "evening";
  const initial = useMemo(() => presetPose(variant, "iso"), []); // eslint-disable-line react-hooks/exhaustive-deps
  const size = stageSize(variant.geometry);
  return (
    <Canvas
      className={className}
      shadows={low ? false : "soft"}
      frameloop="demand"
      dpr={low ? [1, 1.25] : [1, 1.75]}
      gl={{ antialias: low, powerPreference: "high-performance", preserveDrawingBuffer: false }}
      camera={{ position: initial.pos.toArray(), fov: 34, near: 0.1, far: 600 }}
    >
      <InvalidateOnLoad />
      <PerformanceMonitor onDecline={() => setDegraded(true)} />
      <AdaptiveDpr pixelated={false} />
      <Sky lighting={variant.scene.lighting} />
      <Sun lighting={variant.scene.lighting} size={size} shadows={!low} />
      <HouseModel variant={variant} product={product} lowDetail={low} highlightId={highlightId} />
      <Grounds g={variant.geometry} shadows={!low} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.12} maxPolarAngle={Math.PI / 2 - 0.04} minDistance={4} maxDistance={90} target={initial.target} />
      <CameraRig variant={variant} view={view} nonce={viewNonce} />
      <Post evening={evening} enabled={!low} />
    </Canvas>
  );
}

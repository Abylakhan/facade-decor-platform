"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, OrbitControls, PerformanceMonitor } from "@react-three/drei";
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

function Lights({ evening, shadows, size }: { evening: boolean; shadows: boolean; size: number }) {
  const sun = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    const s = sun.current;
    if (!s) return;
    const c = s.shadow.camera;
    c.left = c.bottom = -size;
    c.right = c.top = size;
    c.updateProjectionMatrix();
  }, [size]);
  return evening ? (
    <>
      <hemisphereLight args={["#2b3b5c", "#0d0d10", 0.55]} />
      <directionalLight ref={sun} position={[-14, 6, 10]} intensity={0.9} color="#ff9f5a" castShadow={shadows} shadow-mapSize={[1024, 1024]} />
      <pointLight position={[0, 1.2, size * 0.6]} intensity={30} distance={14} color="#ffc27a" />
    </>
  ) : (
    <>
      <hemisphereLight args={["#e8eef5", "#b9a98f", 0.95]} />
      <directionalLight ref={sun} position={[12, 18, 14]} intensity={2.4} color="#fff4e2" castShadow={shadows} shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} />
    </>
  );
}

export function FacadeScene({
  variant,
  product,
  view,
  viewNonce,
  className = "",
}: {
  variant: Variant;
  product: (id: string) => Product | undefined;
  view: ViewPreset;
  viewNonce: number;
  className?: string;
}) {
  const [tier] = useState(() => deviceTier());
  const [degraded, setDegraded] = useState(false);
  const low = tier === "low" || degraded;
  const evening = variant.scene.lighting === "evening";
  const initial = useMemo(() => presetPose(variant, "iso"), []); // eslint-disable-line react-hooks/exhaustive-deps
  const size = Math.max(variant.geometry.length, variant.geometry.depth) + 6;
  return (
    <Canvas
      className={className}
      shadows={!low}
      frameloop="demand"
      dpr={low ? [1, 1.25] : [1, 1.75]}
      gl={{ antialias: !low, powerPreference: "high-performance", preserveDrawingBuffer: false }}
      camera={{ position: initial.pos.toArray(), fov: 38, near: 0.1, far: 400 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = evening ? 0.9 : 1.05;
      }}
    >
      <color attach="background" args={[evening ? "#0f141c" : "#e9e5dd"]} />
      <fog attach="fog" args={[evening ? "#0f141c" : "#e9e5dd", 60, 160]} />
      <PerformanceMonitor onDecline={() => setDegraded(true)} />
      <AdaptiveDpr pixelated={false} />
      <Lights evening={evening} shadows={!low} size={size} />
      <HouseModel variant={variant} product={product} lowDetail={low} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={!low}>
        <circleGeometry args={[size * 4, 48]} />
        <meshStandardMaterial color={evening ? "#1d2027" : "#d9d2c3"} roughness={1} />
      </mesh>
      <gridHelper args={[size * 3, Math.round(size * 3), evening ? "#2a303b" : "#cbc2b1", evening ? "#22272f" : "#d4ccbd"]} position={[0, 0.005, 0]} />
      <OrbitControls makeDefault enableDamping={false} maxPolarAngle={Math.PI / 2 - 0.03} minDistance={4} maxDistance={90} target={initial.target} />
      <CameraRig variant={variant} view={view} nonce={viewNonce} />
    </Canvas>
  );
}

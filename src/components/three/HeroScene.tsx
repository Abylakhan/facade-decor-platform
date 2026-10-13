"use client";
/**
 * Real-time 3D intro: a blueprint becomes a finished villa. Driven by scroll
 * progress (0..1) through a ref, so React does not re-render per scroll event.
 */
import { useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { demoProducts } from "@/data/demo-catalog";
import { villaVariant } from "@/data/presets";
import { HouseModel, type HouseFx } from "./HouseModel";
import { deviceTier } from "./webgl";

const byId = new Map(demoProducts.map((p) => [p.id, p]));
const lookup = (id: string) => byId.get(id);

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Camera keyframes: [progress, position, target]. */
const KEYS: [number, [number, number, number], [number, number, number]][] = [
  [0.0, [0.01, 46, 0.5], [0, 0, 0]], // plan view: the drawing
  [0.22, [4, 34, 18], [0, 2, 0]],
  [0.42, [22, 14, 26], [0, 3.5, 0]], // volume appears
  [0.6, [16, 6, 24], [0, 4, 0]],
  [0.74, [-6, 3.2, 17], [2, 4.2, 6]], // fly along the facade
  [0.86, [-18, 4.5, 15], [0, 4, 4]],
  [1.0, [-17, 6.5, 27], [0, 4.6, 0]], // final hero framing
];

function poseAt(p: number) {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1]![0]) i++;
  const [p0, a0, t0] = KEYS[i]!;
  const [p1, a1, t1] = KEYS[i + 1]!;
  const t = smooth(seg(p, p0, p1));
  return {
    pos: new THREE.Vector3(...a0).lerp(new THREE.Vector3(...a1), t),
    target: new THREE.Vector3(...t0).lerp(new THREE.Vector3(...t1), t),
  };
}

function Director({ progress, fx }: { progress: MutableRefObject<number>; fx: MutableRefObject<HouseFx> }) {
  const { camera, scene } = useThree();
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const grid = useRef<THREE.GridHelper>(null);
  const ground = useRef<THREE.MeshStandardMaterial>(null);
  const smoothP = useRef(progress.current);
  const bgDark = useMemo(() => new THREE.Color("#0e1822"), []);
  const bgLight = useMemo(() => new THREE.Color("#cfc5b3"), []);
  const groundDark = useMemo(() => new THREE.Color("#0e1822"), []);
  const groundLight = useMemo(() => new THREE.Color("#bfb39d"), []);
  const look = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    // ease towards the scroll position for a controlled, cinematic feel
    smoothP.current += (progress.current - smoothP.current) * (1 - Math.pow(0.0005, dt));
    const p = smoothP.current;
    fx.current.lines = smooth(seg(p, 0.06, 0.3));
    fx.current.solid = smooth(seg(p, 0.3, 0.46));
    fx.current.material = smooth(seg(p, 0.44, 0.64));
    const m = fx.current.material;
    const { pos, target } = poseAt(p);
    camera.position.copy(pos);
    look.copy(target);
    camera.lookAt(look);
    if (scene.background instanceof THREE.Color) scene.background.lerpColors(bgDark, bgLight, m);
    if (scene.fog instanceof THREE.Fog) scene.fog.color.lerpColors(bgDark, bgLight, m);
    if (sun.current) sun.current.intensity = 0.2 + 2.6 * m;
    if (hemi.current) hemi.current.intensity = 0.25 + 0.75 * m;
    if (grid.current) {
      const mat = grid.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.55 * (1 - m * 0.85);
    }
    if (ground.current) {
      ground.current.color.lerpColors(groundDark, groundLight, m);
    }
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={["#f3ead9", "#8c7a5e", 0.4]} />
      <directionalLight ref={sun} position={[-16, 14, 18]} intensity={0.3} color="#ffe2b8" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004}>
        <orthographicCamera attach="shadow-camera" args={[-22, 22, 22, -22, 0.5, 80]} />
      </directionalLight>
      <gridHelper ref={grid} args={[120, 120, "#4f7da6", "#2a4560"]} position={[0, 0.01, 0]} material-transparent />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[90, 64]} />
        <meshStandardMaterial ref={ground} color="#0e1822" roughness={1} />
      </mesh>
    </>
  );
}

export default function HeroScene({ progress }: { progress: MutableRefObject<number> }) {
  const variant = useMemo(() => villaVariant(), []);
  const fx = useRef<HouseFx>({ lines: 0, solid: 0, material: 0 });
  const low = useMemo(() => deviceTier() === "low", []);
  return (
    <Canvas
      shadows={!low}
      dpr={low ? [1, 1.25] : [1, 1.75]}
      gl={{ antialias: !low, powerPreference: "high-performance" }}
      camera={{ position: [0.01, 46, 0.5], fov: 34, near: 0.1, far: 300 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <color attach="background" args={["#0e1822"]} />
      <fog attach="fog" args={["#0e1822", 50, 140]} />
      <Director progress={progress} fx={fx} />
      <HouseModel variant={variant} product={lookup} fxRef={fx} lowDetail={low} />
    </Canvas>
  );
}

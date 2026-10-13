"use client";
/**
 * Dev tool: renders high-resolution stills of the project's own 3D scenes
 * (houses with PBR materials, product studio shots) and sends them to
 * scripts/render-save-server.mjs, which writes public/renders/*.webp.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";
import { demoProducts } from "@/data/demo-catalog";
import { presets, villaVariant } from "@/data/presets";
import type { Product, Variant } from "@/domain/types";
import { asset } from "@/lib/site";
import { HouseModel } from "./HouseModel";
import { Grounds, InvalidateOnLoad, Post, Sky, Sun, stageSize } from "./SceneStage";
import { ProductModel, productBounds } from "./ProductModel";
import { HDRI } from "./pbr";

const byId = new Map(demoProducts.map((p) => [p.id, p]));
const lookup = (id: string) => byId.get(id);

type Shot =
  | { kind: "house"; name: string; w: number; h: number; variant: () => Variant; pos: [number, number, number]; target: [number, number, number]; fov: number }
  | { kind: "product"; name: string; w: number; h: number; product: Product };

function evening(v: Variant): Variant {
  return { ...v, scene: { ...v.scene, lighting: "evening" } };
}

const SHOTS: Shot[] = [
  ...demoProducts.map((p): Shot => ({ kind: "product", name: `product-${p.slug}`, w: 1200, h: 900, product: p })),
];

function HouseShot({ make }: { make: () => Variant }) {
  const variant = useMemo(() => make(), [make]);
  return (
    <>
      <Sky lighting={variant.scene.lighting} />
      <Sun lighting={variant.scene.lighting} size={stageSize(variant.geometry)} shadows />
      <HouseModel variant={variant} product={lookup} />
      <Grounds g={variant.geometry} shadows />
      <Post evening={variant.scene.lighting === "evening"} enabled />
    </>
  );
}

export function ProductStudio({ product }: { product: Product }) {
  const { camera } = useThree();
  const b = useMemo(() => productBounds(product), [product]);
  useEffect(() => {
    const c = camera as THREE.PerspectiveCamera;
    const span = Math.max(b.size.x * 0.75, b.size.y * 1.1, 0.3);
    const dist = (span / 2 / Math.tan((c.fov * Math.PI) / 360)) * 1.25;
    const dir = new THREE.Vector3(0.55, 0.22, 1).normalize();
    c.position.copy(b.center).addScaledVector(dir, dist);
    c.lookAt(b.center);
    c.near = 0.01;
    c.far = 200;
    c.updateProjectionMatrix();
  }, [b, camera]);
  return (
    <>
      <color attach="background" args={["#d6cfc3"]} />
      <fog attach="fog" args={["#d6cfc3", 6, 22]} />
      <Environment files={asset(HDRI.evening)} environmentIntensity={0.35} />
      <hemisphereLight args={["#fff6ea", "#bfb3a2", 0.9]} />
      <directionalLight position={[-3, 4.5, 3.5]} intensity={2.4} color="#fff1df" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003} />
      <directionalLight position={[3, 2, -2]} intensity={0.8} color="#f3ece2" />
      <ProductModel product={product} color="#f1ebe1" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#d6cfc3" roughness={1} />
      </mesh>
      <ContactShadows position={[0, 0.002, 0]} opacity={0.5} blur={2.2} far={2.5} scale={8} />
      <Post evening={false} enabled />
    </>
  );
}

function Capture({ shot, onDone }: { shot: Shot; onDone: (ok: boolean) => void }) {
  const { gl, scene, camera, invalidate, advance } = useThree();
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // let textures/HDRI load and the composer settle
      for (let i = 0; i < 40 && !cancelled; i++) {
        advance(performance.now());
        await new Promise((r) => setTimeout(r, 120));
      }
      if (cancelled) return;
      void scene;
      void camera;
      const url = gl.domElement.toDataURL("image/webp", 0.86);
      try {
        const res = await fetch(`http://127.0.0.1:3999/?name=${shot.name}.webp`, { method: "POST", body: url });
        done.current(res.ok);
      } catch {
        done.current(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shot, gl, scene, camera, invalidate]);
  return null;
}

export function RenderLab() {
  const [i, setI] = useState(-1);
  const [log, setLog] = useState<string[]>([]);
  const only = useRef<string | null>(null);
  useEffect(() => {
    only.current = new URLSearchParams(location.search).get("only");
  }, []);
  const list = useMemo(() => SHOTS, []);
  const shot = i >= 0 ? list[i] : undefined;
  const next = async (from: number) => {
    let n = from + 1;
    const force = new URLSearchParams(location.search).has("force");
    for (; n < list.length; n++) {
      const name = list[n]!.name;
      if (only.current && !name.startsWith(only.current)) continue;
      if (!force) {
        const head = await fetch(`/renders/${name}.webp`, { method: "HEAD", cache: "no-store" }).catch(() => null);
        if (head?.ok) continue; // already rendered
      }
      break;
    }
    setI(n < list.length ? n : -2);
  };
  return (
    <main style={{ padding: 16, fontFamily: "sans-serif" }}>
      <h1>Render lab (dev only)</h1>
      <button onClick={() => void next(-1)} id="start">
        Render {list.length} shots
      </button>
      <pre id="log">{log.join("\n")}</pre>
      {i === -2 && <p id="done">DONE</p>}
      {shot && (
        <div style={{ width: shot.w, height: shot.h }}>
          <Canvas
            key={shot.name}
            shadows="soft"
            frameloop="never"
            dpr={1}
            gl={{ preserveDrawingBuffer: true, antialias: false }}
            camera={shot.kind !== "product" ? { position: shot.pos, fov: shot.fov, near: 0.1, far: 600 } : { position: [2, 1, 3], fov: 28, near: 0.01, far: 100 }}
            onCreated={({ camera }) => {
              if (shot.kind !== "product") camera.lookAt(...shot.target);
            }}
          >
            <InvalidateOnLoad />
            {shot.kind === "house" ? <HouseShot make={shot.variant} /> : <ProductStudio product={shot.product} />}
            <Capture
              shot={shot}
              onDone={(ok) => {
                setLog((l) => [...l, `${ok ? "ok " : "FAIL"} ${shot.name}`]);
                void next(i);
              }}
            />
          </Canvas>
        </div>
      )}
    </main>
  );
}

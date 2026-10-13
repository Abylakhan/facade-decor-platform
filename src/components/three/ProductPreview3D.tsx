"use client";
import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import type { Product } from "@/domain/types";
import { asset } from "@/lib/site";
import { HDRI } from "./pbr";
import { ProductModel, productBounds } from "./ProductModel";

/** Interactive preview of one product: the same 3D representation used for its studio render. */
export default function ProductPreview3D({ product }: { product: Product }) {
  const b = useMemo(() => productBounds(product), [product]);
  const span = Math.max(b.size.x * 0.75, b.size.y * 1.1, 0.3);
  const dist = (span / 2 / Math.tan((30 * Math.PI) / 360)) * 1.35;
  const c = b.center;
  return (
    <Canvas shadows dpr={[1, 1.75]} camera={{ position: [c.x + dist * 0.5, c.y + dist * 0.2, c.z + dist * 0.85], fov: 30, near: 0.01, far: 100 }}>
      <color attach="background" args={["#d6cfc3"]} />
      <fog attach="fog" args={["#d6cfc3", 6, 22]} />
      <hemisphereLight args={["#fff6ea", "#bfb3a2", 0.9]} />
      <directionalLight position={[-3, 4.5, 3.5]} intensity={2.4} color="#fff1df" castShadow shadow-mapSize={[1024, 1024]} />
      <Suspense fallback={null}>
        <Environment files={asset(HDRI.evening)} environmentIntensity={0.35} />
      </Suspense>
      <ProductModel product={product} color="#f1ebe1" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#d6cfc3" roughness={1} />
      </mesh>
      <ContactShadows position={[0, 0.002, 0]} opacity={0.5} blur={2.2} far={2.5} scale={8} />
      <OrbitControls makeDefault target={[c.x, c.y, c.z]} enablePan={false} minDistance={dist * 0.4} maxDistance={dist * 2} maxPolarAngle={Math.PI / 2 - 0.05} enableDamping />
    </Canvas>
  );
}

"use client";
import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Product } from "@/domain/types";
import { profileGeometry } from "./geometry3d";

function Piece({ product }: { product: Product }) {
  const geo = useMemo(() => {
    if (product.linear) {
      const g = profileGeometry(product.linear.profile, 1, "h");
      g.translate(-0.5, -product.linear.profileHeight / 2000, 0);
      return g;
    }
    const d = product.dimensions;
    if (product.categoryId === "columns" || product.categoryId === "half-columns") {
      const r = (d.diameter ?? 300) / 2000;
      return new THREE.CylinderGeometry(r * 0.85, r, Math.min(1.4, (d.height ?? 1000) / 1000), 32);
    }
    if (d.diameter) return new THREE.CylinderGeometry(d.diameter / 2000, d.diameter / 2000, (d.depth ?? 50) / 1000, 48).rotateX(Math.PI / 2);
    return new THREE.BoxGeometry((d.width ?? 300) / 1000, (d.height ?? 300) / 1000, (d.depth ?? 60) / 1000);
  }, [product]);
  return (
    <mesh geometry={geo} castShadow>
      <meshStandardMaterial color="#f3ede2" roughness={0.5} />
    </mesh>
  );
}

/** Small interactive preview of one product's 3D representation. */
export default function ProductPreview3D({ product }: { product: Product }) {
  return (
    <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0.9, 0.5, 1.2], fov: 35 }}>
      <color attach="background" args={["#ebe6dc"]} />
      <hemisphereLight args={["#ffffff", "#b9a98f", 1]} />
      <directionalLight position={[2, 3, 2]} intensity={2} />
      <Piece product={product} />
      <OrbitControls makeDefault enablePan={false} minDistance={0.6} maxDistance={4} />
    </Canvas>
  );
}

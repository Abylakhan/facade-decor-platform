/**
 * Procedural wall textures (no downloads). UVs of the wall geometry are in metres,
 * so `repeat` = 1 / tile size in metres.
 */
import * as THREE from "three";
import type { WallMaterial } from "@/domain/types";

const cache = new Map<string, THREE.Texture>();

function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function make(kind: WallMaterial): { canvas: HTMLCanvasElement; tile: number } {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const r = rand(kind.length * 7919 + 13);
  const noise = (alpha: number, base: number, spread: number, n = 9000) => {
    for (let i = 0; i < n; i++) {
      const v = base + (r() - 0.5) * spread;
      g.fillStyle = `rgba(${v},${v},${v},${alpha})`;
      g.fillRect(r() * size, r() * size, 1 + r() * 2, 1 + r() * 2);
    }
  };
  switch (kind) {
    case "plaster": {
      g.fillStyle = "#f4f4f4";
      g.fillRect(0, 0, size, size);
      noise(0.35, 225, 50, 14000);
      return { canvas: c, tile: 1.2 };
    }
    case "concrete": {
      g.fillStyle = "#e6e6e6";
      g.fillRect(0, 0, size, size);
      noise(0.25, 200, 70, 16000);
      g.strokeStyle = "rgba(0,0,0,0.12)";
      g.lineWidth = 2;
      g.strokeRect(1, 1, size - 2, size / 2 - 2);
      g.strokeRect(1, size / 2 + 1, size - 2, size / 2 - 2);
      g.fillStyle = "rgba(0,0,0,0.25)";
      for (const [x, y] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
        g.beginPath();
        g.arc(x! * size, y! * size, 5, 0, Math.PI * 2);
        g.fill();
      }
      return { canvas: c, tile: 2.4 };
    }
    case "stone": {
      g.fillStyle = "#cfcfcf";
      g.fillRect(0, 0, size, size);
      const rows = 4;
      const rh = size / rows;
      for (let row = 0; row < rows; row++) {
        let x = row % 2 ? -rh * 0.7 : 0;
        while (x < size) {
          const w = rh * (1.4 + r() * 1.2);
          const v = 215 + (r() - 0.5) * 40;
          g.fillStyle = `rgb(${v},${v},${v})`;
          g.fillRect(x + 3, row * rh + 3, w - 6, rh - 6);
          x += w;
        }
      }
      noise(0.2, 180, 80, 12000);
      return { canvas: c, tile: 1.6 };
    }
    case "brick": {
      g.fillStyle = "#d9d9d9";
      g.fillRect(0, 0, size, size);
      const rows = 16;
      const bh = size / rows;
      const bw = bh * 3.2;
      for (let row = 0; row < rows; row++) {
        for (let x = row % 2 ? -bw / 2 : 0; x < size; x += bw) {
          const v = 165 + (r() - 0.5) * 45;
          g.fillStyle = `rgb(${v},${v * 0.98},${v * 0.96})`;
          g.fillRect(x + 2, row * bh + 2, bw - 4, bh - 4);
        }
      }
      noise(0.15, 150, 60, 8000);
      return { canvas: c, tile: 1.1 };
    }
  }
}

export function wallTexture(kind: WallMaterial): THREE.Texture {
  const hit = cache.get(kind);
  if (hit) return hit;
  const { canvas, tile } = make(kind);
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / tile, 1 / tile);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(kind, t);
  return t;
}

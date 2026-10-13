/** True when the browser can create a WebGL context. */
export function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Rough device class: limits resolution and effects on weak / mobile devices. */
export function deviceTier(): "low" | "high" {
  if (typeof window === "undefined") return "high";
  const mobile = window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  return mobile || cores <= 4 || mem <= 4 ? "low" : "high";
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Rounds to `digits` decimals (half away from zero). */
export function round(x: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.sign(x) * Math.round(Math.abs(x) * f) / f;
}

/**
 * Ceiling that ignores floating-point noise: 0.1 + 0.2 = 0.30000000000000004
 * must not turn 3 stock pieces into 4.
 */
export function ceilSafe(x: number): number {
  return Math.ceil(round(x, 6));
}

export const mmToM = (mm: number) => mm / 1000;

/**
 * First-fit-decreasing cutting plan: how many stock pieces of `stock` length are
 * needed to cut all `segments` (all in metres). Each segment must be ≤ stock.
 */
export function packSegments(segments: number[], stock: number): { pieces: number; offcut: number } {
  if (stock <= 0) throw new Error("stock length must be positive");
  const bins: number[] = [];
  const sorted = [...segments].sort((a, b) => b - a);
  for (const seg of sorted) {
    const s = round(seg, 6);
    if (s > stock + 1e-9) throw new Error(`segment ${s} exceeds stock ${stock}`);
    const idx = bins.findIndex((free) => free + 1e-9 >= s);
    if (idx === -1) bins.push(round(stock - s, 6));
    else bins[idx] = round(bins[idx]! - s, 6);
  }
  return { pieces: bins.length, offcut: round(bins.reduce((a, b) => a + b, 0), 6) };
}

/**
 * Splits a segment longer than the usable stock length into equal parts
 * joined on site. Returns the part lengths (without cut allowances).
 */
export function splitSegment(length: number, usable: number, cutAllowance: number): number[] {
  const parts = ceilSafe(length / (usable - 2 * cutAllowance));
  return Array.from({ length: Math.max(1, parts) }, () => length / Math.max(1, parts));
}

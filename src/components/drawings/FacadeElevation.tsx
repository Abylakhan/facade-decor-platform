/**
 * 2D elevation of one facade, generated from the same project model as the 3D scene
 * and the estimate. Used for the estimate/PDF, portfolio, before/after and as the
 * no-WebGL fallback of the configurator.
 */
import type { DecorSelection, Product, Side, Variant } from "@/domain/types";
import { CORNER_SIDES, getWall, wallHeight, wallLength } from "@/domain/calc/geometry";
import { bracketPositions, columnPositions, openingBoxes, pilasterPositions } from "@/domain/calc/layout";

const S = 40; // px per metre

/** Drawing frame shared with overlays (callouts): viewBox size and metre → SVG unit mapping. */
export function elevationFrame(variant: Variant, side: Side = "front") {
  const g = variant.geometry;
  const len = wallLength(g, side);
  const H = wallHeight(g);
  const pitch = (g.roof.pitchDeg * Math.PI) / 180;
  const roofH = g.roof.type === "flat" ? 0.4 : Math.tan(pitch) * (Math.min(g.length, g.depth) / 2 + g.roof.overhang);
  const pad = 1.6;
  const W = (len + pad * 2) * S;
  const Ht = (H + roofH + pad * 1.6) * S;
  return { W, Ht, X: (u: number) => (u + pad) * S, Y: (y: number) => Ht - (pad * 0.8 + y) * S, len, H };
}

export function FacadeElevation({
  variant,
  product,
  side = "front",
  decor = true,
  dims = true,
  className = "",
  title,
  tone = "paper",
}: {
  variant: Variant;
  product: (id: string) => Product | undefined;
  side?: Side;
  decor?: boolean;
  dims?: boolean;
  className?: string;
  title?: string;
  tone?: "paper" | "blueprint" | "ink";
}) {
  const g = variant.geometry;
  const len = wallLength(g, side);
  const H = wallHeight(g);
  if (!(len > 0) || !(H > 0)) return null;
  const pitch = (g.roof.pitchDeg * Math.PI) / 180;
  const o = g.roof.overhang;
  const roofH = g.roof.type === "flat" ? 0.4 : Math.tan(pitch) * (Math.min(g.length, g.depth) / 2 + o);
  const pad = 1.6;
  const W = len + pad * 2;
  const Ht = H + roofH + pad * 1.6;
  const X = (u: number) => (u + pad) * S;
  const Y = (y: number) => (Ht - pad * 0.8 - y) * S;

  const ink = tone === "ink";
  const stroke = tone === "blueprint" ? "#8fb6d8" : ink ? "#2b2a27" : "#1b1a18";
  const thin = tone === "blueprint" ? "#5f8db5" : "#8a857b";
  const wallFill = tone === "blueprint" || ink ? "transparent" : variant.scene.facadeColor;
  const decorFill = tone === "blueprint" ? "rgba(143,182,216,0.15)" : ink ? "var(--decor-fill, transparent)" : variant.scene.decorColor;
  const sel = decor ? variant.selections.filter((s) => s.enabled) : [];
  const onSide = (s: DecorSelection) => "sides" in s.placement && s.placement.sides.includes(side);

  // roof outline as seen from this side
  const along = side === "front" || side === "back";
  const ridgeHalf = g.roof.type === "hip" ? Math.max(0, (along ? g.length - g.depth : 0) / 2) : along ? len / 2 + o : 0;
  const roofPts =
    g.roof.type === "flat"
      ? [[-0.05, H], [len + 0.05, H], [len + 0.05, H + roofH], [-0.05, H + roofH]]
      : g.roof.type === "gable" && !along
        ? [[-o, H], [len + o, H], [len / 2, H + roofH]]
        : [[-o, H], [len + o, H], [len / 2 + ridgeHalf, H + roofH], [len / 2 - ridgeHalf, H + roofH]];

  const els: React.ReactNode[] = [];
  let k = 0;
  const rect = (u: number, y: number, w: number, h: number, extra: Record<string, unknown> = {}) => (
    <rect key={k++} className="decor" pathLength={1} x={X(u)} y={Y(y + h)} width={w * S} height={h * S} fill={decorFill} stroke={stroke} strokeWidth={0.8} {...extra} />
  );

  for (const s of sel) {
    const p = product(s.productId);
    if (!p) continue;
    const pl = s.placement;
    const ph = (p.linear?.profileHeight ?? p.dimensions.height ?? 150) / 1000;
    if ((pl.kind === "eaves" || pl.kind === "belt" || pl.kind === "plinth") && onSide(s)) {
      const ys = pl.kind === "eaves" ? [H - ph] : pl.kind === "plinth" ? [g.plinthHeight - ph / 2] : Array.from({ length: g.floors - 1 }, (_, i) => g.plinthHeight + (i + 1) * g.floorHeight - ph / 2);
      const ext = pl.kind === "eaves" ? (p.linear?.projection ?? 100) / 1000 : 0.03;
      for (const y of ys) {
        els.push(rect(-ext, y, len + 2 * ext, ph));
        // profile lines suggest the moulding
        for (const f of [0.3, 0.6, 0.8]) els.push(<line key={k++} pathLength={1} x1={X(-ext)} x2={X(len + ext)} y1={Y(y + ph * f)} y2={Y(y + ph * f)} stroke={thin} strokeWidth={0.5} />);
      }
    }
    if ((pl.kind === "window-surround" || pl.kind === "door-surround") && onSide(s)) {
      const f = ph;
      for (const b of openingBoxes(g, side, pl.kind === "window-surround" ? "window" : "door")) {
        els.push(rect(b.left - f, b.top, b.right - b.left + 2 * f, f));
        if (pl.scheme !== "top") {
          els.push(rect(b.left - f, b.bottom - (pl.scheme === "4" ? f : 0), f, b.top - b.bottom + (pl.scheme === "4" ? f : 0)));
          els.push(rect(b.right, b.bottom - (pl.scheme === "4" ? f : 0), f, b.top - b.bottom + (pl.scheme === "4" ? f : 0)));
        }
        if (pl.scheme === "4") els.push(rect(b.left - f, b.bottom - f, b.right - b.left + 2 * f, f));
        if (p.kitIncludes?.length) els.push(keystone(b.o.x, b.top + f * 0.5, k++));
      }
    }
    if (pl.kind === "keystone" && onSide(s)) {
      for (const b of openingBoxes(g, side, pl.openings === "all" ? undefined : pl.openings)) els.push(keystone(b.o.x, b.top, k++));
    }
    if (pl.kind === "quoins") {
      const mod = (p.piece?.moduleHeight ?? 300) / 1000;
      const n = Math.ceil((H - g.plinthHeight) / mod);
      for (const c of pl.corners) {
        const [a, b] = CORNER_SIDES[c];
        const atRight = a === side; // corner at the right end of this side
        const atLeft = b === side;
        if (!atRight && !atLeft) continue;
        for (let i = 0; i < n; i++) {
          const w = i % 2 === 0 ? 0.42 : 0.28;
          const y = g.plinthHeight + i * mod;
          const hh = Math.min(mod - 0.02, H - y - 0.02);
          if (hh <= 0) continue;
          els.push(rect(atRight ? len - w : 0, y, w, hh));
        }
      }
    }
    if (pl.kind === "pilaster" && onSide(s)) {
      const w = (p.dimensions.width ?? p.dimensions.diameter ?? 300) / 1000;
      for (const u of pilasterPositions(g, side, pl.perSide, w)) {
        els.push(rect(u - w / 2, g.plinthHeight, w, H - g.plinthHeight - 0.25));
        els.push(rect(u - w / 2 - 0.04, g.plinthHeight, w + 0.08, 0.18));
        els.push(rect(u - w / 2 - 0.05, H - 0.45, w + 0.1, 0.2));
      }
    }
    if (pl.kind === "column" && side === "front") {
      const d = (p.dimensions.diameter ?? 300) / 1000;
      const h = pl.height ?? g.floorHeight;
      const cols = columnPositions(g, pl.count);
      for (const c of cols) {
        els.push(rect(c.u - d * 0.65, g.plinthHeight, d * 1.3, 0.16));
        els.push(<rect key={k++} className="decor" pathLength={1} x={X(c.u - d / 2)} y={Y(g.plinthHeight + h - 0.2)} width={d * S} height={(h - 0.36) * S} fill={decorFill} stroke={stroke} strokeWidth={0.8} />);
        els.push(rect(c.u - d * 0.7, g.plinthHeight + h - 0.2, d * 1.4, 0.2));
      }
      if (cols.length > 1) els.push(rect(cols[0]!.u - d, g.plinthHeight + h, cols[cols.length - 1]!.u - cols[0]!.u + 2 * d, 0.3));
    }
    if (pl.kind === "brackets" && onSide(s)) {
      for (const u of bracketPositions(len, pl.spacing)) els.push(rect(u - 0.08, H - 0.42, 0.16, 0.22));
    }
  }

  function keystone(cx: number, y: number, key: number) {
    const w1 = 0.14;
    const w2 = 0.2;
    const h = 0.26;
    const pts = [[cx - w1 / 2, y - 0.04], [cx + w1 / 2, y - 0.04], [cx + w2 / 2, y + h], [cx - w2 / 2, y + h]].map(([u, yy]) => `${X(u!)},${Y(yy!)}`).join(" ");
    return <polygon key={key} className="decor" pathLength={1} points={pts} fill={decorFill} stroke={stroke} strokeWidth={0.8} />;
  }

  const wall = getWall(g, side);
  return (
    <svg viewBox={`0 0 ${W * S} ${Ht * S}`} className={className} role="img" aria-label={title ?? "facade elevation"}>
      {title && <title>{title}</title>}
      {tone === "blueprint" && <rect width={W * S} height={Ht * S} fill="#0e1822" />}
      {ink && (
        <defs>
          <pattern id="stone-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#8a857b" strokeWidth="0.6" />
          </pattern>
        </defs>
      )}
      {/* ground */}
      <line pathLength={1} x1={X(-pad * 0.8)} x2={X(len + pad * 0.8)} y1={Y(0)} y2={Y(0)} stroke={stroke} strokeWidth={1.2} />
      {/* roof */}
      <polygon pathLength={1} points={roofPts.map(([u, y]) => `${X(u!)},${Y(y!)}`).join(" ")} fill={tone === "blueprint" || ink ? "transparent" : variant.scene.roofColor} stroke={stroke} strokeWidth={1} />
      {ink && <RoofHatch pts={roofPts.map(([u, y]) => [X(u!), Y(y!)] as [number, number])} />}
      {/* wall + plinth */}
      <rect pathLength={1} x={X(0)} y={Y(H)} width={len * S} height={(H - g.plinthHeight) * S} fill={wallFill} stroke={stroke} strokeWidth={1} />
      <rect pathLength={1} x={X(-0.03)} y={Y(g.plinthHeight)} width={(len + 0.06) * S} height={g.plinthHeight * S} fill={tone === "blueprint" ? "transparent" : ink ? "url(#stone-hatch)" : "#8c857a"} stroke={stroke} strokeWidth={1} />
      {/* openings */}
      {wall.openings.map((op) => {
        const b = openingBoxes(g, side).find((x) => x.o.id === op.id)!;
        const glass = tone === "blueprint" ? "transparent" : ink ? (op.kind === "door" ? "rgba(43,42,39,0.08)" : "rgba(95,141,181,0.07)") : op.kind === "door" ? "#4a3b2e" : variant.scene.lighting === "evening" ? "#f2c879" : "#9fb0ba";
        return (
          <g key={op.id}>
            <rect pathLength={1} x={X(b.left)} y={Y(b.top)} width={op.width * S} height={op.height * S} fill={glass} stroke={stroke} strokeWidth={1} />
            {op.kind === "window" ? (
              <>
                <line pathLength={1} x1={X(op.x)} x2={X(op.x)} y1={Y(b.top)} y2={Y(b.bottom)} stroke={stroke} strokeWidth={0.8} />
                <line pathLength={1} x1={X(b.left)} x2={X(b.right)} y1={Y(b.top - op.height * 0.3)} y2={Y(b.top - op.height * 0.3)} stroke={stroke} strokeWidth={0.8} />
              </>
            ) : (
              <line x1={X(op.x)} x2={X(op.x)} y1={Y(b.top)} y2={Y(b.bottom)} stroke={tone === "blueprint" ? stroke : "#2b221a"} strokeWidth={0.8} />
            )}
          </g>
        );
      })}
      {els}
      {dims && (
        <g fontFamily="Inter, sans-serif" fontSize={11} fill={thin} stroke="none">
          {/* length */}
          <line x1={X(0)} x2={X(len)} y1={Y(-0.55)} y2={Y(-0.55)} stroke={thin} strokeWidth={0.7} />
          <line x1={X(0)} x2={X(0)} y1={Y(-0.35)} y2={Y(-0.7)} stroke={thin} strokeWidth={0.7} />
          <line x1={X(len)} x2={X(len)} y1={Y(-0.35)} y2={Y(-0.7)} stroke={thin} strokeWidth={0.7} />
          <text x={X(len / 2)} y={Y(-0.55) - 4} textAnchor="middle">
            {len.toFixed(2)} m
          </text>
          {/* height */}
          <line x1={X(len + 0.8)} x2={X(len + 0.8)} y1={Y(0)} y2={Y(H)} stroke={thin} strokeWidth={0.7} />
          <line x1={X(len + 0.6)} x2={X(len + 1)} y1={Y(H)} y2={Y(H)} stroke={thin} strokeWidth={0.7} />
          <line x1={X(len + 0.6)} x2={X(len + 1)} y1={Y(0)} y2={Y(0)} stroke={thin} strokeWidth={0.7} />
          <text x={X(len + 0.8) + 6} y={Y(H / 2)} transform={`rotate(-90 ${X(len + 0.8) + 6} ${Y(H / 2)})`} textAnchor="middle" dy={10}>
            {H.toFixed(2)} m
          </text>
          {/* floor lines */}
          {Array.from({ length: g.floors - 1 }, (_, i) => g.plinthHeight + (i + 1) * g.floorHeight).map((y) => (
            <line key={y} x1={X(-0.5)} x2={X(0)} y1={Y(y)} y2={Y(y)} stroke={thin} strokeWidth={0.6} strokeDasharray="3 3" />
          ))}
        </g>
      )}
    </svg>
  );
}

/** Fine diagonal hatching inside the roof outline (drawing style). */
function RoofHatch({ pts }: { pts: [number, number][] }) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const id = `roof-clip-${Math.round(x0)}-${Math.round(y0)}`;
  const lines = [];
  for (let x = x0 - (y1 - y0); x < x1; x += 9) lines.push(<line key={x} x1={x} y1={y1} x2={x + (y1 - y0)} y2={y0} stroke="#8a857b" strokeWidth={0.4} />);
  return (
    <g className="no-draw">
      <clipPath id={id}>
        <polygon points={pts.map((p) => p.join(",")).join(" ")} />
      </clipPath>
      <g clipPath={`url(#${id})`} opacity={0.6}>
        {lines}
      </g>
    </g>
  );
}

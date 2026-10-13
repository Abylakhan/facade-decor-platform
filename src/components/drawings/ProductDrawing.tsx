/** Technical drawing generated from product data: profile section or elevation with dimensions. */
import type { Product } from "@/domain/types";

const dimText = { fontFamily: "Inter, sans-serif", fontSize: 11, fill: "#5b5750" } as const;

export function ProductDrawing({ product, className = "", title }: { product: Product; className?: string; title?: string }) {
  if (product.linear) return <ProfileSection product={product} className={className} title={title} />;
  return <PieceElevation product={product} className={className} title={title} />;
}

function ProfileSection({ product, className, title }: { product: Product; className: string; title?: string }) {
  const { profile, profileHeight: h, projection: p } = product.linear!;
  const scale = 220 / Math.max(h, p);
  const W = p * scale + 140;
  const H = h * scale + 90;
  const ox = 60;
  const oy = 30;
  const pts = profile.map(([x, y]) => `${ox + x * scale},${oy + (h - y) * scale}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={title}>
      {title && <title>{title}</title>}
      <defs>
        <pattern id={`hatch-${product.id}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#c4bbaa" strokeWidth="1" />
        </pattern>
      </defs>
      {/* wall */}
      <rect x={ox - 26} y={oy - 14} width={26} height={h * scale + 28} fill={`url(#hatch-${product.id})`} stroke="#8a857b" strokeWidth={0.8} />
      <polygon points={pts} fill="#efe2cf" stroke="#1b1a18" strokeWidth={1.2} strokeLinejoin="round" />
      {/* height dimension */}
      <g stroke="#8a857b" strokeWidth={0.7}>
        <line x1={ox + p * scale + 24} x2={ox + p * scale + 24} y1={oy} y2={oy + h * scale} />
        <line x1={ox + p * scale + 18} x2={ox + p * scale + 30} y1={oy} y2={oy} />
        <line x1={ox + p * scale + 18} x2={ox + p * scale + 30} y1={oy + h * scale} y2={oy + h * scale} />
        <line x1={ox} x2={ox + p * scale} y1={oy + h * scale + 30} y2={oy + h * scale + 30} />
        <line x1={ox} x2={ox} y1={oy + h * scale + 24} y2={oy + h * scale + 36} />
        <line x1={ox + p * scale} x2={ox + p * scale} y1={oy + h * scale + 24} y2={oy + h * scale + 36} />
      </g>
      <text {...dimText} x={ox + p * scale + 34} y={oy + (h * scale) / 2 + 4}>
        {h}
      </text>
      <text {...dimText} x={ox + (p * scale) / 2} y={oy + h * scale + 50} textAnchor="middle">
        {p}
      </text>
      <text {...dimText} x={W - 8} y={H - 8} textAnchor="end" fontSize={9} letterSpacing={1.5}>
        {product.sku} · MM
      </text>
    </svg>
  );
}

function PieceElevation({ product, className, title }: { product: Product; className: string; title?: string }) {
  const d = product.dimensions;
  const w = d.width ?? d.diameter ?? 400;
  const h = d.height ?? d.diameter ?? 400;
  const scale = 240 / Math.max(w, h);
  const W = w * scale + 120;
  const H = h * scale + 80;
  const ox = 40;
  const oy = 24;
  const isColumn = product.categoryId === "columns" || product.categoryId === "half-columns";
  const isRound = !!d.diameter && !isColumn;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={title}>
      {title && <title>{title}</title>}
      {isRound ? (
        <>
          <circle cx={ox + (w * scale) / 2} cy={oy + (h * scale) / 2} r={(w * scale) / 2} fill="#efe2cf" stroke="#1b1a18" strokeWidth={1.2} />
          <circle cx={ox + (w * scale) / 2} cy={oy + (h * scale) / 2} r={(w * scale) / 3} fill="none" stroke="#1b1a18" strokeWidth={0.8} />
          <circle cx={ox + (w * scale) / 2} cy={oy + (h * scale) / 2} r={(w * scale) / 8} fill="none" stroke="#1b1a18" strokeWidth={0.8} />
        </>
      ) : isColumn ? (
        <g fill="#efe2cf" stroke="#1b1a18" strokeWidth={1.1}>
          <rect x={ox - 6} y={oy + h * scale - 14} width={w * scale + 12} height={14} />
          <path d={`M${ox + 4} ${oy + h * scale - 14} L${ox + 10} ${oy + 22} L${ox + w * scale - 10} ${oy + 22} L${ox + w * scale - 4} ${oy + h * scale - 14} Z`} />
          <rect x={ox - 8} y={oy} width={w * scale + 16} height={10} />
          <rect x={ox} y={oy + 10} width={w * scale} height={12} />
        </g>
      ) : product.categoryId === "keystones" ? (
        <polygon
          points={`${ox + w * scale * 0.18},${oy + h * scale} ${ox + w * scale * 0.82},${oy + h * scale} ${ox + w * scale},${oy} ${ox},${oy}`}
          fill="#efe2cf"
          stroke="#1b1a18"
          strokeWidth={1.2}
        />
      ) : (
        <rect x={ox} y={oy} width={w * scale} height={h * scale} fill="#efe2cf" stroke="#1b1a18" strokeWidth={1.2} />
      )}
      <g stroke="#8a857b" strokeWidth={0.7}>
        <line x1={ox} x2={ox + w * scale} y1={oy + h * scale + 22} y2={oy + h * scale + 22} />
        <line x1={ox + w * scale + 22} x2={ox + w * scale + 22} y1={oy} y2={oy + h * scale} />
      </g>
      <text {...dimText} x={ox + (w * scale) / 2} y={oy + h * scale + 40} textAnchor="middle">
        {d.diameter && isColumn ? `Ø${d.diameter}` : w}
      </text>
      <text {...dimText} x={ox + w * scale + 30} y={oy + (h * scale) / 2 + 4}>
        {h}
      </text>
      <text {...dimText} x={W - 8} y={H - 6} textAnchor="end" fontSize={9} letterSpacing={1.5}>
        {product.sku} · MM
      </text>
    </svg>
  );
}

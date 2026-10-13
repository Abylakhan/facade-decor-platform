"use client";
/**
 * Home hero: an architectural elevation of a demo facade that draws itself
 * (on load, then with scroll), after which the decor elements take on tone and
 * are called out as catalog products. The drawing is generated from the same
 * project model the configurator and calculator use — no stock imagery.
 */
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { heroFacade } from "@/data/presets";
import { lt } from "@/i18n";
import { useI18n } from "@/lib/i18n-context";
import { useCatalog } from "@/lib/catalog-context";
import { computeAnchors, getWall } from "@/domain/calc/geometry";
import { columnPositions } from "@/domain/calc/layout";
import { FacadeElevation, elevationFrame } from "@/components/drawings/FacadeElevation";
import { buttonClass } from "@/components/ui/Button";

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

export function HeroDrawing() {
  const { locale, dict } = useI18n();
  const { product } = useCatalog();
  const section = useRef<HTMLElement>(null);
  const [p, setP] = useState(0); // combined progress 0..1
  const variant = useMemo(() => heroFacade(), []);
  const frame = useMemo(() => elevationFrame(variant), [variant]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setP(1);
      return;
    }
    const start = performance.now();
    let timeP = 0;
    let scrollP = 0;
    let raf = 0;
    const tick = (now: number) => {
      timeP = clamp((now - start) / 2600) * 0.55; // the drawing draws itself on load
      const el = section.current;
      if (el) {
        const total = el.offsetHeight - window.innerHeight;
        scrollP = clamp(-el.getBoundingClientRect().top / Math.max(1, total));
      }
      setP(Math.max(timeP, scrollP > 0 ? 0.3 + scrollP * 0.7 : 0));
      if (timeP < 0.55) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const draw = 1 - ease(clamp(p / 0.55)); // stroke offset 1 → 0
  const tone = ease(clamp((p - 0.5) / 0.25)); // decor fill
  const calloutP = clamp((p - 0.62) / 0.3);

  // callout anchors (SVG units) from the real geometry
  const callouts = useMemo(() => {
    const g = variant.geometry;
    const a = computeAnchors(g);
    const sel = (kind: string) => variant.selections.find((s) => s.placement.kind === kind);
    const out: { x: number; y: number; side: "l" | "r"; sku: string; name: string }[] = [];
    const add = (kind: string, u: number, y: number, side: "l" | "r") => {
      const s = sel(kind);
      const pr = s && product(s.productId);
      if (pr) out.push({ x: frame.X(u), y: frame.Y(y), side, sku: pr.sku, name: lt(pr.name, locale) });
    };
    add("eaves", g.length * 0.9, a.eavesY - 0.15, "r");
    const win = getWall(g, "front").openings.find((o) => o.kind === "window" && o.floor === 1);
    if (win) add("window-surround", win.x - win.width / 2 - 0.1, g.plinthHeight + g.floorHeight + win.sill + win.height * 0.55, "l");
    const col = columnPositions(g, 2)[1];
    if (col) add("column", col.u + 0.15, g.plinthHeight + 1.6, "r");
    add("belt", g.length * 0.08, g.plinthHeight + g.floorHeight, "l");
    add("quoins", g.length - 0.2, g.plinthHeight + g.floorHeight * 1.5, "r");
    add("plinth", g.length * 0.2, g.plinthHeight - 0.1, "l");
    return out;
  }, [variant, product, frame, locale]);

  return (
    <section ref={section} data-hero aria-label={dict.home.heroTitle} className="relative bg-paper lg:h-[240vh]">
      <div className="relative flex flex-col pt-[88px] lg:sticky lg:top-0 lg:h-screen lg:flex-row lg:overflow-hidden">
        {/* paper grid */}
        <div className="paper-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />

        <div className="container-x relative z-10 flex flex-col justify-center pt-8 pb-4 lg:w-[44%] lg:max-w-none lg:pr-0 lg:pb-16">
          <p className="eyebrow">{dict.home.heroKicker}</p>
          <h1 className="mt-5 font-display text-[40px] leading-[1.02] font-light tracking-[-0.02em] text-ink sm:text-[56px] xl:text-[72px]">
            {dict.home.heroTitle}
          </h1>
          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-ink-3">{dict.home.heroLead}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/${locale}/configurator/`} className={buttonClass("primary", "lg")}>
              {dict.home.ctaCreate}
            </Link>
            <Link href={`/${locale}/calculator/`} className={buttonClass("secondary", "lg")}>
              {dict.home.ctaCalc}
            </Link>
          </div>
          <p className="mt-10 hidden items-center gap-3 text-xs text-ink-4 lg:flex" aria-hidden="true">
            <span className="h-px w-10 bg-bronze" />
            {dict.home.scrollHint}
          </p>
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col justify-center px-4 pb-6 lg:px-10 lg:py-10" aria-hidden="true">
          <div className="relative mx-auto w-full" style={{ aspectRatio: `${frame.W} / ${frame.Ht}`, maxWidth: `calc(58vh * ${(frame.W / frame.Ht).toFixed(3)})` }}>
            <div
              className="draw absolute inset-0"
              style={{ ["--draw" as string]: draw.toFixed(3), ["--decor-fill" as string]: `rgba(214, 196, 166, ${(tone * 0.55).toFixed(3)})` }}
            >
              <FacadeElevation variant={variant} product={product} tone="ink" dims={false} className="h-full w-full" />
            </div>
            {/* dimension chain + level marks: thin overlay in the same frame */}
            <svg viewBox={`0 0 ${frame.W} ${frame.Ht}`} className="absolute inset-0 h-full w-full" style={{ opacity: clamp((p - 0.3) / 0.2) }}>
              <g stroke="#8a857b" strokeWidth={0.7} fill="#5b5750" fontFamily="Inter, sans-serif" fontSize={11}>
                <line x1={frame.X(0)} x2={frame.X(frame.len)} y1={frame.Y(-0.7)} y2={frame.Y(-0.7)} />
                {[0, frame.len].map((u) => (
                  <line key={u} x1={frame.X(u) - 5} x2={frame.X(u) + 5} y1={frame.Y(-0.7) + 5} y2={frame.Y(-0.7) - 5} />
                ))}
                <text x={frame.X(frame.len / 2)} y={frame.Y(-0.7) - 6} textAnchor="middle" stroke="none">
                  {(frame.len * 1000).toFixed(0)}
                </text>
                {[0, variant.geometry.plinthHeight, frame.H].map((y) => (
                  <g key={y}>
                    <line x1={frame.X(-1.1)} x2={frame.X(-0.25)} y1={frame.Y(y)} y2={frame.Y(y)} strokeDasharray="3 3" />
                    <path d={`M${frame.X(-1.1)} ${frame.Y(y)} l6 -7 l6 7`} fill="none" />
                    <text x={frame.X(-1.1)} y={frame.Y(y) - 10} stroke="none" fontSize={10}>
                      {y === 0 ? "±0.000" : `+${y.toFixed(3)}`}
                    </text>
                  </g>
                ))}
              </g>
              {/* keyed notes: numbered markers on the decor */}
              {callouts.map((c, i) => {
                const show = clamp(calloutP * callouts.length - i);
                return (
                  <g key={c.sku} opacity={show} transform={`translate(${c.x} ${c.y}) scale(${0.6 + 0.4 * show})`}>
                    <circle r={13} fill="#93653a" />
                    <circle r={17} fill="none" stroke="#93653a" strokeWidth={0.8} opacity={0.5} />
                    <text textAnchor="middle" dy={4.5} fill="#fffdf9" fontSize={13} fontFamily="Inter, sans-serif" fontWeight={600}>
                      {i + 1}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <ol className="mx-auto mt-5 grid w-full max-w-3xl grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            {callouts.map((c, i) => {
              const show = clamp(calloutP * callouts.length - i);
              return (
                <li key={c.sku} className="flex items-start gap-2 text-[11px] leading-tight" style={{ opacity: show, transform: `translateY(${(1 - show) * 8}px)` }}>
                  <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-bronze text-[9px] font-semibold text-white">{i + 1}</span>
                  <span>
                    <span className="block font-semibold tracking-[0.1em] text-bronze">{c.sku}</span>
                    <span className="text-ink-3">{c.name}</span>
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="dim mx-auto mt-4 hidden lg:block" style={{ opacity: clamp((p - 0.3) / 0.2) }}>
            {dict.home.drawingCaption}
          </p>
        </div>
      </div>
    </section>
  );
}

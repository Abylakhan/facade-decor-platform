"use client";
/**
 * Scroll-driven cinematic intro. The 3D scene loads lazily and never blocks the
 * rest of the page. Reduced motion → static final frame, no scroll scrubbing.
 * No WebGL → animated SVG drawing of the facade.
 */
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n-context";
import { buttonClass } from "@/components/ui/Button";
import { FacadeElevation } from "@/components/drawings/FacadeElevation";
import { villaVariant } from "@/data/presets";
import { demoProducts } from "@/data/demo-catalog";
import { hasWebGL, prefersReducedMotion } from "@/components/three/webgl";

const HeroScene = dynamic(() => import("@/components/three/HeroScene"), { ssr: false });
const byId = new Map(demoProducts.map((p) => [p.id, p]));

export function HeroIntro() {
  const { locale, dict } = useI18n();
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [p, setP] = useState(0);
  const [mode, setMode] = useState<"pending" | "3d" | "static3d" | "svg">("pending");
  const variant = useMemo(() => villaVariant(), []);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const gl = hasWebGL();
    setMode(!gl ? "svg" : reduced ? "static3d" : "3d");
    if (reduced) {
      progress.current = 1;
      setP(1);
    }
  }, []);

  useEffect(() => {
    if (mode !== "3d" && mode !== "svg") return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = section.current;
        if (!el) return;
        const total = el.offsetHeight - window.innerHeight;
        const v = Math.min(1, Math.max(0, -el.getBoundingClientRect().top / Math.max(1, total)));
        progress.current = v;
        setP(Math.round(v * 100) / 100);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [mode]);

  const scrubbing = mode === "3d" || mode === "svg";
  const phases = dict.home.phases;
  const phaseIdx = Math.min(phases.length - 1, Math.floor(p * phases.length * 0.999));
  const final = p > 0.86;
  const skip = () => {
    const el = section.current;
    if (el) window.scrollTo({ top: el.offsetTop + el.offsetHeight - window.innerHeight * 0.2, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  return (
    <section ref={section} data-hero aria-label={dict.home.heroTitle} className={`relative bg-blueprint ${scrubbing ? "h-[520vh]" : "h-screen"}`}>
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* coordinate grid */}
        <div className="blueprint-grid pointer-events-none absolute inset-0 transition-opacity duration-700" style={{ opacity: final ? 0 : 1 - p * 0.6 }} aria-hidden="true" />
        {(mode === "3d" || mode === "static3d") && (
          <div className="absolute inset-0" aria-hidden="true">
            <HeroScene progress={progress} />
          </div>
        )}
        {mode === "svg" && (
          <div className="absolute inset-0 flex items-center justify-center p-8" aria-hidden="true">
            <FacadeElevation variant={variant} product={(id) => byId.get(id)} tone="blueprint" className="hero-draw max-h-[70vh] w-full max-w-5xl" decor={p > 0.3} />
          </div>
        )}
        {/* bottom vignette for legible type over the render */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />

        {/* phase rail */}
        {scrubbing && !final && (
          <ol className="absolute top-1/2 left-4 hidden -translate-y-1/2 space-y-3 sm:left-8 md:block" aria-hidden="true">
            {phases.map((ph, i) => (
              <li key={ph} className={`flex items-center gap-3 text-[11px] tracking-[0.2em] uppercase transition-colors ${i === phaseIdx ? "text-white" : "text-white/30"}`}>
                <span className={`h-px transition-all ${i === phaseIdx ? "w-10 bg-bronze-2" : "w-4 bg-white/30"}`} />
                <span className="dim !text-inherit">{String(i + 1).padStart(2, "0")}</span>
                {ph}
              </li>
            ))}
          </ol>
        )}

        {/* opening caption */}
        <div className="pointer-events-none absolute inset-x-0 top-28 text-center transition-opacity duration-500" style={{ opacity: scrubbing ? Math.max(0, 1 - p * 6) : 0 }}>
          <p className="eyebrow !text-white/60">{dict.home.heroKicker}</p>
          <p className="mt-3 text-sm text-white/50">{dict.home.scrollHint} ↓</p>
        </div>

        {/* final title */}
        <div
          className="absolute inset-x-0 bottom-0 transition-all duration-700 ease-[var(--ease-arch)]"
          style={{ opacity: final || !scrubbing ? 1 : 0, transform: final || !scrubbing ? "none" : "translateY(24px)" }}
        >
          <div className="container-x pb-14 sm:pb-20">
            <p className="eyebrow !text-white/70">Atelier Façade</p>
            <h1 className="display-1 mt-4 max-w-4xl !text-white">{dict.home.heroTitle}</h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-white/80">{dict.home.heroLead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/${locale}/configurator/`} className={buttonClass("bronze", "lg")}>
                {dict.nav.configurator}
              </Link>
              <Link href={`/${locale}/catalog/`} className={buttonClass("light", "lg")}>
                {dict.nav.catalog}
              </Link>
              <Link href={`/${locale}/calculator/`} className={buttonClass("light", "lg")}>
                {dict.nav.calculator}
              </Link>
            </div>
          </div>
        </div>

        {scrubbing && !final && (
          <button type="button" onClick={skip} className="absolute right-4 bottom-6 text-xs tracking-[0.18em] text-white/60 uppercase hover:text-white sm:right-8">
            {dict.home.skipIntro} ↓
          </button>
        )}
        {/* progress bar */}
        {scrubbing && <div className="absolute bottom-0 left-0 h-px bg-bronze-2" style={{ width: `${p * 100}%` }} aria-hidden="true" />}
      </div>
    </section>
  );
}

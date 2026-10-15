"use client";
/**
 * Scroll-controlled daylight hero: an architect's pen sketch of the house is
 * drawn in, the photorealistic render fades in beneath its lines, and scrolling
 * then plays the camera move of the same render frame by frame.
 *
 * Footage: Pexels video 37544730 "Modern luxury home exterior with landscape"
 * by Reyd Valencia, Pexels License; natural colours, no grading. The sketch is
 * traced from the first frame of that clip, so lines and photo coincide exactly.
 * See public/assets/LICENSES.md.
 *
 * Why frames, not <video>: seeking a video on scroll is janky on iOS Safari and
 * between keyframes; decoded images give exact, flicker-free frames everywhere.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n-context";
import { asset } from "@/lib/site";
import { buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";

const FRAMES = 101;
const PAPER = "#f4f2ec";
/** Scroll timeline (0..1 of the pinned section). */
const T = { settle: [0.02, 0.2], photo: [0.12, 0.3], camera: [0.3, 0.88], final: [0.86, 0.96] } as const;
const clamp = (x: number) => Math.min(1, Math.max(0, x));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const seg = (p: number, [a, b]: readonly [number, number]) => clamp((p - a) / (b - a));

export function HeroSequence() {
  const { locale, dict } = useI18n();
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const frames = useRef<(HTMLImageElement | null)[]>([]);
  const sketch = useRef<HTMLImageElement | null>(null);
  const progress = useRef(0);
  const introStart = useRef<number | null>(null);
  const [p, setP] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"pending" | "scrub" | "static">("pending");

  // choose set; load the sketch first, then frames progressively (first, every 4th, the rest)
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMode(reduced ? "static" : "scrub");
    if (reduced) return;
    const set = window.matchMedia("(max-width: 767px)").matches ? "m" : "d";
    let cancelled = false;
    const sk = new Image();
    sk.decoding = "async";
    sk.src = asset(`/hero/${set}/sketch.webp`);
    sk.onload = () => {
      if (cancelled) return;
      sketch.current = sk;
      setReady(true);
      // the drawing is plotted on load (time-based), independent of scrolling
      introStart.current = performance.now();
      const run = () => {
        draw();
        if (!cancelled && performance.now() - (introStart.current ?? 0) < 2400) requestAnimationFrame(run);
      };
      requestAnimationFrame(run);
    };
    const order: number[] = [0];
    for (let i = 4; i < FRAMES; i += 4) order.push(i);
    for (let i = 1; i < FRAMES; i++) if (!order.includes(i)) order.push(i);
    let count = 0;
    let next = 0;
    frames.current = new Array(FRAMES).fill(null);
    const loadOne = () => {
      if (cancelled || next >= order.length) return;
      const idx = order[next++]!;
      const img = new Image();
      img.decoding = "async";
      img.src = asset(`/hero/${set}/${String(idx).padStart(3, "0")}.webp`);
      img.onload = () => {
        if (cancelled) return;
        frames.current[idx] = img;
        count++;
        if (count % 8 === 0 || count === FRAMES) setLoaded(count);
        loadOne();
      };
      img.onerror = () => loadOne();
    };
    for (let k = 0; k < 5; k++) loadOne();
    return () => {
      cancelled = true;
      frames.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Nearest loaded frame to the requested one (never shows a blank canvas). */
  const frameAt = (i: number) => {
    const f = frames.current;
    for (let d = 0; d < FRAMES; d++) {
      if (f[i - d]) return f[i - d]!;
      if (f[i + d]) return f[i + d]!;
    }
    return null;
  };

  const draw = () => {
    const c = canvas.current;
    const sk = sketch.current;
    if (!c || !sk) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const pr = progress.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, w, h);

    const settle = easeInOut(seg(pr, T.settle));
    const photo = easeInOut(seg(pr, T.photo));
    const cam = seg(pr, T.camera);
    const iw = sk.naturalWidth;
    const ih = sk.naturalHeight;
    const cover = Math.max(w / iw, h / ih);
    const wide = w > 1024 && w / h > 1.25;
    // wide: the sketch starts smaller and right of the title; narrow/tall: it sits whole below
    // the title on the paper. Either way it then grows to fill the frame as the photo arrives.
    const fit = Math.min(w / iw, (h * 0.62) / ih);
    const start = wide ? cover * 0.86 : Math.min(cover, fit * 1.12);
    const scale = start + (cover - start) * settle;
    const dw = iw * scale;
    const dh = ih * scale;
    const x0 = wide ? (w - dw) / 2 + w * 0.16 : (w - dw) / 2;
    const y0 = wide ? (h - dh) / 2 + h * 0.04 : h - dh - h * 0.04;
    const x = x0 + ((w - dw) / 2 - x0) * settle;
    const y = y0 + ((h - dh) / 2 - y0) * settle;

    // 1 · the sketch, plotted with a soft feathered left-to-right reveal
    const timeReveal = introStart.current === null ? 0 : clamp((performance.now() - introStart.current) / 2200);
    const reveal = easeOut(Math.max(timeReveal, seg(pr, [0, 0.04])));
    if (photo < 1) {
      ctx.drawImage(sk, x, y, dw, dh);
      if (reveal < 1) {
        const edge = x + dw * reveal;
        const feather = Math.max(60, dw * 0.08);
        const mask = ctx.createLinearGradient(edge - feather, 0, edge, 0);
        mask.addColorStop(0, "rgba(244,242,236,0)");
        mask.addColorStop(1, PAPER);
        ctx.fillStyle = mask;
        ctx.fillRect(edge - feather, 0, feather + 1, h);
        ctx.fillStyle = PAPER;
        ctx.fillRect(edge, 0, w - edge + 1, h);
      }
    }

    // 2 · the render appears beneath the lines, then the camera moves on scroll
    const img = frameAt(Math.round(easeInOut(cam) * (FRAMES - 1)));
    if (img && photo > 0) {
      ctx.globalAlpha = photo;
      ctx.drawImage(img, x, y, dw, dh);
      ctx.globalAlpha = 1;
      // the pen lines linger on the print for a moment, then lift off before the camera moves
      const lines = 0.85 * (1 - seg(pr, [0.22, 0.3]));
      if (lines > 0.01) {
        ctx.globalCompositeOperation = "multiply";
        ctx.globalAlpha = lines;
        ctx.drawImage(sk, x, y, dw, dh);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
      }
    }
  };

  // scroll → progress; a single rAF per scroll event
  useEffect(() => {
    if (mode !== "scrub") return;
    let raf = 0;
    let lastP = -1;
    const tick = () => {
      raf = 0;
      const el = section.current;
      if (el) {
        const r = el.getBoundingClientRect();
        progress.current = clamp(-r.top / Math.max(1, r.height - window.innerHeight));
      }
      draw();
      const rounded = Math.round(progress.current * 400) / 400;
      if (rounded !== lastP) {
        lastP = rounded;
        setP(rounded);
      }
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    kick();
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, loaded, ready]);

  const phases = dict.home.phases;
  const scrub = mode !== "static";
  const phaseIdx = !scrub ? phases.length - 1 : p < 0.12 ? 0 : p < 0.3 ? 1 : p < 0.86 ? 2 : 3;
  const introOut = scrub ? seg(p, [0.04, 0.14]) : 1;
  const finalIn = scrub ? seg(p, T.final) : 1;
  const titleWords = dict.home.heroTitle.split(" ");

  const actions = (delay: number, visible: boolean) => (
    <div className="mt-9 flex flex-wrap gap-3">
      {[
        { href: `/${locale}/configurator/`, label: dict.home.ctaCreate, v: "primary" as const },
        { href: `/${locale}/calculator/`, label: dict.home.ctaCalc, v: "secondary" as const },
      ].map((b, i) => (
        <Link
          key={b.href}
          href={b.href}
          tabIndex={visible ? 0 : -1}
          className={`${buttonClass(b.v, "lg")} group transition-[opacity,transform,background-color,border-color] duration-700 ease-[var(--ease-out-expo)]`}
          style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(14px)", transitionDelay: `${delay + i * 120}ms` }}
        >
          {b.label}
          <Icon name="arrow" size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      ))}
    </div>
  );

  return (
    <section ref={section} data-hero aria-label={dict.home.heroTitle} className={`relative bg-blueprint ${scrub ? "h-[460vh]" : "h-screen"}`}>
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* poster under the canvas: instant first paint, no-JS and reduced-motion fallback */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset(mode === "static" ? "/hero/poster-end.webp" : "/hero/poster-start.webp")}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${scrub && ready ? "opacity-0" : ""}`}
          fetchPriority="high"
        />
        {scrub && <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-hidden="true" />}

        {/* soft daylight wash behind the opening title (light, never a dark overlay) */}
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(244,242,236,0.94)_0%,rgba(244,242,236,0.6)_34%,rgba(244,242,236,0)_58%)] lg:bg-[linear-gradient(90deg,rgba(244,242,236,0.96)_0%,rgba(244,242,236,0.7)_32%,rgba(244,242,236,0)_56%)]"
          style={{ opacity: 1 - introOut }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-[linear-gradient(0deg,rgba(246,243,237,0.97)_0%,rgba(246,243,237,0.8)_40%,rgba(246,243,237,0)_100%)]"
          style={{ opacity: finalIn }}
          aria-hidden="true"
        />

        {/* opening title (over the sketch) */}
        <div className="absolute inset-x-0 top-0 pt-32 sm:pt-40" style={{ opacity: 1 - introOut, transform: `translateY(${-introOut * 40}px)`, pointerEvents: introOut < 0.5 ? "auto" : "none" }}>
          <div className="container-x">
            <p className="eyebrow hero-in" style={{ animationDelay: "100ms" }}>
              {dict.home.heroKicker}
            </p>
            <h1 className="mt-5 max-w-3xl font-display text-[40px] leading-[1.04] font-light tracking-[-0.015em] text-ink sm:text-[60px] lg:text-[76px]">
              {titleWords.map((w, i) => (
                <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-top">
                  <span className="hero-word inline-block" style={{ animationDelay: `${250 + i * 70}ms` }}>
                    {w}&nbsp;
                  </span>
                </span>
              ))}
            </h1>
            <p className="hero-in mt-6 max-w-md text-[17px] leading-relaxed text-ink-3" style={{ animationDelay: `${400 + titleWords.length * 70}ms` }}>
              {dict.home.heroLead}
            </p>
            <div className="hero-in" style={{ animationDelay: `${600 + titleWords.length * 70}ms` }}>
              {actions(0, introOut < 0.5)}
            </div>
          </div>
        </div>

        {/* final title over the finished house */}
        {scrub && (
          <div className="absolute inset-x-0 bottom-0 pb-14 sm:pb-20" style={{ opacity: finalIn, pointerEvents: finalIn > 0.5 ? "auto" : "none" }}>
            <div className="container-x">
              <p className="eyebrow" style={{ transform: `translateY(${(1 - finalIn) * 20}px)` }}>
                Atelier Façade
              </p>
              <h2
                className="mt-3 max-w-3xl font-display text-[34px] leading-[1.05] font-light text-ink sm:text-[52px]"
                style={{ transform: `translateY(${(1 - finalIn) * 30}px)`, clipPath: `inset(0 0 ${(1 - finalIn) * 100}% 0)` }}
              >
                {dict.home.heroTitle}
              </h2>
              {actions(150, finalIn > 0.5)}
            </div>
          </div>
        )}

        {/* phase rail */}
        {scrub && (
          <ol className="absolute top-1/2 right-4 hidden -translate-y-1/2 space-y-4 bg-paper/75 px-4 py-3 text-right backdrop-blur-sm sm:right-8 md:block" aria-hidden="true" style={{ opacity: 1 - finalIn }}>
            {phases.map((ph, i) => (
              <li key={ph} className={`flex items-center justify-end gap-3 text-[11px] tracking-[0.22em] uppercase transition-colors duration-500 ${i === phaseIdx ? "text-ink" : "text-ink-4"}`}>
                {ph}
                <span className="dim !text-inherit">{String(i + 1).padStart(2, "0")}</span>
                <span className={`h-px transition-all duration-500 ${i === phaseIdx ? "w-12 bg-bronze" : "w-5 bg-ink-4/50"}`} />
              </li>
            ))}
          </ol>
        )}

        {/* scroll indicator */}
        {scrub && (
          <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 text-[10px] tracking-[0.3em] text-ink-3 uppercase" style={{ opacity: 1 - seg(p, [0, 0.06]) }} aria-hidden="true">
            {dict.home.scrollHint}
            <span className="relative h-12 w-px overflow-hidden bg-ink/15">
              <span className="scroll-cue absolute inset-x-0 top-0 h-1/2 bg-bronze" />
            </span>
          </div>
        )}

        {/* progress + loading */}
        {scrub && <div className="absolute bottom-0 left-0 h-px bg-bronze" style={{ width: `${p * 100}%` }} aria-hidden="true" />}
        {scrub && loaded < FRAMES && (
          <p className="absolute top-24 right-4 text-[10px] tracking-[0.2em] text-ink-4 uppercase sm:right-8" aria-hidden="true">
            {Math.round((loaded / FRAMES) * 100)}%
          </p>
        )}
        <p className="absolute right-4 bottom-3 text-[9px] text-ink-4 sm:right-8">{dict.home.mediaCredit}</p>
      </div>
    </section>
  );
}

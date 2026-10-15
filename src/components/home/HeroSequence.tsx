"use client";
/**
 * Scroll-controlled hero: an image sequence (drawing → wireframe → finished
 * two-storey house) painted on a canvas according to scroll progress.
 *
 * Footage: Pixabay videos 31290 and 31289 (same author, scene and camera),
 * Pixabay Content License. The blueprint stage is extracted from the wireframe
 * footage itself, so geometry never jumps between stages. See public/assets/LICENSES.md.
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

const FRAMES = 124;
const clamp = (x: number) => Math.min(1, Math.max(0, x));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));

export function HeroSequence() {
  const { locale, dict } = useI18n();
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const frames = useRef<(HTMLImageElement | null)[]>([]);
  const progress = useRef(0);
  const introStart = useRef<number | null>(null);
  const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const [p, setP] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [mode, setMode] = useState<"pending" | "scrub" | "static">("pending");

  // choose set, preload progressively (first frame first, then every 4th, then the rest)
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMode(reduced ? "static" : "scrub");
    if (reduced) return;
    const set = window.matchMedia("(max-width: 767px)").matches ? "m" : "d";
    const order: number[] = [0];
    for (let i = 4; i < FRAMES; i += 4) order.push(i);
    for (let i = 1; i < FRAMES; i++) if (!order.includes(i)) order.push(i);
    let cancelled = false;
    let count = 0;
    frames.current = new Array(FRAMES).fill(null);
    let next = 0;
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
        if (idx === 0) {
          // plot the drawing on load (time-based), independent of scrolling
          introStart.current = performance.now();
          const run = () => {
            draw();
            if (performance.now() - (introStart.current ?? 0) < 2000 && !cancelled) requestAnimationFrame(run);
          };
          requestAnimationFrame(run);
        }
        loadOne();
      };
      img.onerror = () => loadOne();
    };
    for (let k = 0; k < 6; k++) loadOne(); // a few parallel requests
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
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const pr = progress.current;
    const t = easeInOut(seg(pr, 0.08, 0.82));
    const idx = Math.round(t * (FRAMES - 1));
    const img = frameAt(idx);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0a1018";
    ctx.fillRect(0, 0, w, h);
    if (!img) return;
    // camera: slow push-in towards the house at the end + subtle pointer parallax
    const zoom = 1.0 + 0.12 * easeInOut(seg(pr, 0.72, 1));
    const ptr = pointer.current;
    const cover = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const portrait = h > w * 1.1;
    // portrait phones: show the whole house (fit by width, slightly enlarged) over a dimmed cover copy
    const scale = (portrait ? Math.min(cover, (w / img.naturalWidth) * 1.7) : cover) * zoom;
    if (portrait) {
      const cw = img.naturalWidth * cover;
      const ch = img.naturalHeight * cover;
      ctx.drawImage(img, (w - cw) / 2, (h - ch) / 2, cw, ch);
      ctx.fillStyle = "rgba(8,8,7,0.62)";
      ctx.fillRect(0, 0, w, h);
    }
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    // on wide screens the house starts right of the title, then settles in the centre
    const shift = w > 1024 ? w * 0.21 * (1 - easeInOut(seg(pr, 0.04, 0.3))) : 0;
    const x = (w - dw) / 2 + shift + ptr.x * 14;
    const y = (h - dh) / 2 + 0.035 * dh * easeInOut(seg(pr, 0.72, 1)) + ptr.y * 10;
    // blueprint stage: the drawing is "plotted" with a sweeping reveal
    const timeReveal = introStart.current === null ? 0 : clamp((performance.now() - introStart.current) / 1800);
    const reveal = Math.max(timeReveal, seg(pr, 0, 0.05));
    if (reveal < 1) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w * (0.08 + 0.92 * easeInOut(reveal)), h);
      ctx.clip();
      ctx.drawImage(img, x, y, dw, dh);
      ctx.restore();
      const sx = w * (0.08 + 0.92 * easeInOut(reveal));
      const grad = ctx.createLinearGradient(sx - 80, 0, sx, 0);
      grad.addColorStop(0, "rgba(212,162,111,0)");
      grad.addColorStop(1, "rgba(212,162,111,0.55)");
      ctx.fillStyle = grad;
      ctx.fillRect(sx - 80, 0, 80, h);
    } else {
      ctx.drawImage(img, x, y, dw, dh);
    }
  };

  // scroll → progress; pointer → eased parallax; single rAF loop only while needed
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
      const ptr = pointer.current;
      ptr.x += (ptr.tx - ptr.x) * 0.08;
      ptr.y += (ptr.ty - ptr.y) * 0.08;
      draw();
      const rounded = Math.round(progress.current * 400) / 400;
      if (rounded !== lastP) {
        lastP = rounded;
        setP(rounded);
      }
      if (Math.abs(ptr.tx - ptr.x) > 0.002 || Math.abs(ptr.ty - ptr.y) > 0.002) raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointer.current.tx = e.clientX / window.innerWidth - 0.5;
      pointer.current.ty = e.clientY / window.innerHeight - 0.5;
      kick();
    };
    kick();
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
      window.removeEventListener("pointermove", onMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, loaded]);

  const phases = dict.home.phases;
  const scrub = mode !== "static";
  const phaseIdx = Math.min(phases.length - 1, Math.floor(seg(p, 0.02, 0.85) * phases.length * 0.999));
  const introOut = scrub ? seg(p, 0.03, 0.12) : 1; // opening title leaves
  const finalIn = scrub ? seg(p, 0.84, 0.95) : 1; // final title arrives over the finished house
  const titleWords = dict.home.heroTitle.split(" ");

  const actions = (delay: number, visible: boolean) => (
    <div className="mt-9 flex flex-wrap gap-3">
      {[
        { href: `/${locale}/configurator/`, label: dict.home.ctaCreate, v: "bronze" as const },
        { href: `/${locale}/calculator/`, label: dict.home.ctaCalc, v: "light" as const },
      ].map((b, i) => (
        <Link
          key={b.href}
          href={b.href}
          tabIndex={visible ? 0 : -1}
          className={`${buttonClass(b.v, "lg")} group transition-[opacity,transform,background-color] duration-700 ease-[var(--ease-out-expo)]`}
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
          className="absolute inset-0 h-full w-full object-cover"
          fetchPriority="high"
        />
        {scrub && <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-hidden="true" />}

        {/* blueprint grid, fades as the drawing turns into the building */}
        <div className="blueprint-grid pointer-events-none absolute inset-0" style={{ opacity: scrub ? 0.9 * (1 - seg(p, 0.3, 0.5)) : 0 }} aria-hidden="true" />
        {/* cinematic vignette and bottom fade into the dark page */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(5,5,4,0.65)_100%)]" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-paper via-paper/60 to-transparent" style={{ opacity: scrub ? 0.35 + 0.65 * finalIn : 1 }} aria-hidden="true" />

        {/* opening title (over the drawing) */}
        <div className="absolute inset-x-0 top-0 pt-32 sm:pt-40" style={{ opacity: 1 - introOut, transform: `translateY(${-introOut * 40}px)` }}>
          <div className="container-x">
            <p className="eyebrow !text-white/60 hero-in" style={{ animationDelay: "100ms" }}>
              {dict.home.heroKicker}
            </p>
            <h1 className="mt-5 max-w-4xl font-display text-[42px] leading-[1.02] font-light tracking-[-0.02em] text-white sm:text-[64px] lg:text-[84px]">
              {titleWords.map((w, i) => (
                <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-top">
                  <span className="hero-word inline-block" style={{ animationDelay: `${250 + i * 70}ms` }}>
                    {w}&nbsp;
                  </span>
                </span>
              ))}
            </h1>
            <p className="hero-in mt-6 max-w-lg text-[17px] leading-relaxed text-white/70" style={{ animationDelay: `${400 + titleWords.length * 70}ms` }}>
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
              <p className="eyebrow !text-sand" style={{ transform: `translateY(${(1 - finalIn) * 20}px)` }}>
                Atelier Façade
              </p>
              <h2
                className="mt-3 max-w-3xl font-display text-[34px] leading-[1.05] font-light text-white sm:text-[52px]"
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
          <ol className="absolute top-1/2 right-4 hidden -translate-y-1/2 space-y-4 text-right sm:right-8 md:block" aria-hidden="true" style={{ opacity: 1 - finalIn }}>
            {phases.map((ph, i) => (
              <li key={ph} className={`flex items-center justify-end gap-3 text-[11px] tracking-[0.22em] uppercase transition-colors duration-500 ${i === phaseIdx ? "text-white" : "text-white/30"}`}>
                {ph}
                <span className="dim !text-inherit">{String(i + 1).padStart(2, "0")}</span>
                <span className={`h-px transition-all duration-500 ${i === phaseIdx ? "w-12 bg-bronze-2" : "w-5 bg-white/30"}`} />
              </li>
            ))}
          </ol>
        )}

        {/* scroll indicator */}
        {scrub && (
          <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 text-[10px] tracking-[0.3em] text-white/60 uppercase" style={{ opacity: 1 - seg(p, 0.0, 0.06) }} aria-hidden="true">
            {dict.home.scrollHint}
            <span className="relative h-12 w-px overflow-hidden bg-white/20">
              <span className="scroll-cue absolute inset-x-0 top-0 h-1/2 bg-bronze-2" />
            </span>
          </div>
        )}

        {/* progress + loading */}
        {scrub && <div className="absolute bottom-0 left-0 h-px bg-bronze-2" style={{ width: `${p * 100}%` }} aria-hidden="true" />}
        {scrub && loaded < FRAMES && (
          <p className="absolute top-24 right-4 text-[10px] tracking-[0.2em] text-white/40 uppercase sm:right-8" aria-hidden="true">
            {Math.round((loaded / FRAMES) * 100)}%
          </p>
        )}
        <p className="absolute right-4 bottom-3 text-[9px] text-white/35 sm:right-8">{dict.home.mediaCredit}</p>
      </div>
    </section>
  );
}

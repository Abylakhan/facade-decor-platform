"use client";
/** Scroll-driven sections of the home page (transform/opacity only, rAF-throttled). */
import Link from "next/link";
import { useRef } from "react";
import type { Product } from "@/domain/types";
import { lt } from "@/i18n";
import { useI18n } from "@/lib/i18n-context";
import { useCatalog } from "@/lib/catalog-context";
import { productImage } from "@/lib/renders";
import { useScrollProgress, seg } from "@/components/motion/useScrollProgress";
import { Price } from "@/components/catalog/Price";
import { Icon } from "@/components/ui/icons";

/** Pinned horizontal track of signature products (desktop); swipeable row on mobile. */
export function HorizontalShowcase() {
  const { locale, dict } = useI18n();
  const { product } = useCatalog();
  const ref = useRef<HTMLElement>(null);
  const p = useScrollProgress(ref, "pin");
  const items = ["p-k300", "p-w180k", "p-bl", "p-c300", "p-b1", "p-rs1", "p-ks1", "p-p300"].map(product).filter((x): x is Product => !!x);
  const n = items.length;
  return (
    <section ref={ref} className="relative bg-deep text-white lg:h-[340vh]">
      <div className="flex flex-col py-20 lg:sticky lg:top-0 lg:h-screen lg:flex-row lg:items-center lg:overflow-hidden lg:py-0">
        <div className="container-x relative z-10 shrink-0 lg:w-[34vw] lg:max-w-none">
          <p className="eyebrow !text-sand">02 · {dict.nav.catalog}</p>
          <h2 className="mt-5 font-display text-[40px] leading-[1.02] font-light sm:text-[56px]">{dict.home.detailsTitle}</h2>
          <p className="mt-5 max-w-sm text-white/60">{dict.home.detailsText}</p>
          <div className="mt-8 hidden items-center gap-4 lg:flex">
            <span className="num font-display text-3xl text-bronze-2">{String(Math.min(n, 1 + Math.floor(p * n * 0.999))).padStart(2, "0")}</span>
            <span className="relative h-px w-40 bg-white/15">
              <span className="absolute inset-y-0 left-0 bg-bronze-2" style={{ width: `${p * 100}%` }} />
            </span>
            <span className="num text-sm text-white/40">{String(n).padStart(2, "0")}</span>
          </div>
          <Link href={`/${locale}/catalog/`} className="u-line mt-8 inline-flex items-center gap-2 text-sm text-white/80 hover:text-white">
            {dict.nav.catalog} <Icon name="arrow" size={15} />
          </Link>
        </div>
        <div className="mt-10 min-w-0 overflow-x-auto pb-4 lg:mt-0 lg:flex-1 lg:overflow-hidden lg:pb-0">
          <ul
            className="flex w-max snap-x snap-mandatory gap-6 px-4 sm:px-6 lg:gap-10 lg:px-0 lg:will-change-transform lg:[transform:var(--tx)]"
            style={{ ["--tx" as string]: `translate3d(calc(${(-p).toFixed(4)} * (100% - 66vw + 4rem)), 0, 0)` }}
          >
            {items.map((it, i) => {
              // each card drifts slightly against the track for depth
              const local = p * (n - 1) - i;
              return (
                <li key={it.id} className="w-[78vw] shrink-0 snap-start sm:w-[46vw] lg:w-[30vw]">
                  <Link href={`/${locale}/product/${it.slug}/`} className="group block">
                    <div className="relative aspect-[4/5] overflow-hidden bg-[#d6cfc3]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={productImage(it)}
                        alt={lt(it.name, locale)}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.06]"
                        style={{ objectPosition: `${50 + Math.max(-12, Math.min(12, local * 8))}% 50%` }}
                      />
                      <span className="absolute top-3 left-3 bg-black/60 px-2 py-1 text-[10px] tracking-[0.18em] text-white uppercase">3D · DEMO</span>
                      <span className="absolute right-3 bottom-3 flex h-10 w-10 translate-y-2 items-center justify-center bg-bronze text-white opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                        <Icon name="arrow" size={16} />
                      </span>
                    </div>
                    <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-white/10 pt-4">
                      <div>
                        <p className="text-[11px] tracking-[0.18em] text-sand uppercase">{it.sku}</p>
                        <p className="mt-1 font-display text-2xl leading-tight">{lt(it.name, locale)}</p>
                      </div>
                      <Price product={it} className="shrink-0 text-sm text-white/60" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** A statement whose words light up as it scrolls through the viewport. */
export function ScrollText({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const p = useScrollProgress(ref, "pass");
  const words = text.split(" ");
  const lit = seg(p, 0.15, 0.6) * words.length;
  return (
    <p ref={ref} className="max-w-5xl font-display text-[30px] leading-[1.18] font-light sm:text-[44px] lg:text-[54px]">
      {words.map((w, i) => (
        <span key={i} className="lit-word" style={{ color: i < lit ? "var(--color-ink)" : "color-mix(in srgb, var(--color-ink) 18%, transparent)" }}>
          {w}{" "}
        </span>
      ))}
    </p>
  );
}

/** Process steps connected by a line that fills with scroll. */
export function ProcessTimeline() {
  const { dict } = useI18n();
  const ref = useRef<HTMLOListElement>(null);
  const p = useScrollProgress(ref, "pass");
  const fill = seg(p, 0.2, 0.65);
  const steps = dict.home.how;
  return (
    <ol ref={ref} className="relative mt-16 grid gap-12 md:grid-cols-4 md:gap-8">
      <span className="absolute top-0 left-0 hidden h-px w-full bg-line md:block" aria-hidden="true" />
      <span className="absolute top-0 left-0 hidden h-px bg-bronze-2 md:block" style={{ width: `${fill * 100}%` }} aria-hidden="true" />
      {steps.map((s, i) => {
        const on = fill >= (i + 0.2) / steps.length;
        return (
          <li key={s.title} className="relative pt-8 transition-[opacity,transform] duration-700 ease-[var(--ease-out-expo)]" style={{ opacity: on ? 1 : 0.35, transform: on ? "none" : "translateY(16px)" }}>
            <span className={`absolute -top-[5px] left-0 hidden h-[10px] w-[10px] rounded-full border transition-colors duration-500 md:block ${on ? "border-bronze-2 bg-bronze-2" : "border-line-strong bg-paper"}`} aria-hidden="true" />
            <span className={`font-display text-7xl font-light transition-colors duration-500 ${on ? "text-bronze-2" : "text-ink-4"}`}>{i + 1}</span>
            <h3 className="mt-4 text-lg font-medium">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-3">{s.text}</p>
          </li>
        );
      })}
    </ol>
  );
}

/** Scroll-scaled call to action with drifting architectural grid. */
export function CtaScroll({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const p = useScrollProgress(ref, "pass");
  const k = seg(p, 0.1, 0.5);
  return (
    <section ref={ref} className="relative overflow-hidden bg-deep py-32 text-white sm:py-44">
      <div className="blueprint-grid pointer-events-none absolute -inset-20 opacity-50" style={{ transform: `translate3d(0, ${(0.5 - p) * 80}px, 0)` }} aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,rgba(185,135,90,0.22),transparent_60%)]" aria-hidden="true" />
      <div className="container-x relative">
        <h2 className="max-w-4xl font-display text-[42px] leading-[1.02] font-light sm:text-[64px] lg:text-[80px]" style={{ opacity: 0.2 + 0.8 * k, transform: `translate3d(0, ${(1 - k) * 40}px, 0) scale(${0.96 + 0.04 * k})`, transformOrigin: "left bottom" }}>
          {title}
        </h2>
        <p className="mt-6 max-w-xl text-white/65" style={{ opacity: k }}>
          {text}
        </p>
        <div className="mt-10" style={{ opacity: seg(p, 0.25, 0.55), transform: `translateY(${(1 - seg(p, 0.25, 0.55)) * 20}px)` }}>
          {children}
        </div>
      </div>
    </section>
  );
}

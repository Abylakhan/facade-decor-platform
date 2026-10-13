"use client";
import { useId, useState } from "react";
import type { Variant } from "@/domain/types";
import { useCatalog } from "@/lib/catalog-context";
import { FacadeElevation } from "@/components/drawings/FacadeElevation";
import { withoutDecor } from "@/data/presets";

/** Before/after comparison: the same facade without and with the chosen decor. */
export function BeforeAfter({ variant, labels }: { variant: Variant; labels: { before: string; after: string; slider: string } }) {
  const { product } = useCatalog();
  const [pos, setPos] = useState(50);
  const id = useId();
  return (
    <figure className="relative select-none overflow-hidden border border-line bg-stone">
      <FacadeElevation variant={withoutDecor(variant)} product={product} className="block w-full" dims={false} />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
        <FacadeElevation variant={variant} product={product} className="block w-full bg-stone" dims={false} />
      </div>
      <div className="pointer-events-none absolute inset-y-0 w-px bg-ink" style={{ left: `${pos}%` }}>
        <span className="absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-ink bg-paper text-xs">⟷</span>
      </div>
      <span className="absolute top-3 left-3 bg-ink/80 px-2 py-1 text-[10px] tracking-[0.18em] text-white uppercase">{labels.before}</span>
      <span className="absolute top-3 right-3 bg-bronze px-2 py-1 text-[10px] tracking-[0.18em] text-white uppercase">{labels.after}</span>
      <label htmlFor={id} className="sr-only">
        {labels.slider}
      </label>
      <input id={id} type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
    </figure>
  );
}

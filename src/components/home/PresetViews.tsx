"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { presets } from "@/data/presets";
import { buildEstimate } from "@/domain/calc/estimate";
import { createProject } from "@/domain/project";
import { fmtMoney, fmtNumber, lt } from "@/i18n";
import { useI18n } from "@/lib/i18n-context";
import { useCatalog } from "@/lib/catalog-context";
import { saveProject } from "@/lib/project-actions";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/feedback";
import { FacadeElevation } from "@/components/drawings/FacadeElevation";
import { BeforeAfter } from "./BeforeAfter";

export function PresetGrid() {
  const { locale, dict } = useI18n();
  const { product } = useCatalog();
  const built = useMemo(() => presets.map((p) => ({ p, v: p.build() })), []);
  return (
    <ul className="grid gap-6 md:grid-cols-2">
      {built.map(({ p, v }) => (
        <li key={p.slug} className="group relative border border-line bg-surface">
          <div className="paper-grid border-b border-line bg-paper p-4">
            <FacadeElevation variant={v} product={product} className="h-64 w-full" dims={false} />
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2">
              <Badge tone="demo">DEMO</Badge>
              <span className="dim">{dict.building[p.buildingType]}</span>
            </div>
            <h2 className="mt-3 font-display text-3xl">
              <Link href={`/${locale}/portfolio/${p.slug}/`} className="after:absolute after:inset-0">
                {lt(p.title, locale)}
              </Link>
            </h2>
            <p className="mt-2 text-sm text-ink-3">{lt(p.summary, locale)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PresetDetail({ slug }: { slug: string }) {
  const { locale, dict } = useI18n();
  const { product, prices } = useCatalog();
  const router = useRouter();
  const preset = presets.find((p) => p.slug === slug)!;
  const v = useMemo(() => preset.build(), [preset]);
  const e = useMemo(() => buildEstimate(v, product, prices), [v, product, prices]);
  const [busy, setBusy] = useState(false);
  const [before, after] = locale === "kk" ? ["Дейін", "Кейін"] : ["До", "После"];
  const g = v.geometry;
  return (
    <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-6">
        <BeforeAfter variant={v} labels={{ before, after, slider: dict.home.beforeAfter }} />
        <div className="grid gap-4 sm:grid-cols-2">
          {(["right", "back"] as const).map((s) => (
            <figure key={s} className="border border-line bg-surface p-2">
              <figcaption className="dim mb-1">{dict.sides[s]}</figcaption>
              <FacadeElevation variant={v} product={product} side={s} className="w-full" />
            </figure>
          ))}
        </div>
      </div>
      <div className="space-y-6">
        <p className="text-ink-3">{lt(preset.summary, locale)}</p>
        <div>
          <h2 className="eyebrow mb-2">{dict.portfolio.facts}</h2>
          <dl className="divide-y divide-line border-y border-line text-sm">
            {[
              [dict.estimate.dimensions, `${g.length} × ${g.depth} ${dict.units.m}`],
              [dict.fields.floors, String(g.floors)],
              [dict.configurator.roofType, dict.roof[g.roof.type]],
              [dict.calc.netArea, `${fmtNumber(e.metrics.netArea, locale)} ${dict.units.m2}`],
              [dict.calc.total, fmtMoney(e.totals.total, locale)],
            ].map(([k, val]) => (
              <div key={k} className="flex justify-between py-2">
                <dt className="text-ink-3">{k}</dt>
                <dd className="num">{val}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h2 className="eyebrow mb-2">{dict.portfolio.decor}</h2>
          <ul className="space-y-1 text-sm">
            {v.selections.map((s) => (
              <li key={s.id}>
                {dict.placement[s.placement.kind]} — <span className="text-ink-3">{product(s.productId)?.sku}</span>
              </li>
            ))}
          </ul>
        </div>
        <Button
          size="lg"
          variant="bronze"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            const p = await saveProject(createProject(lt(preset.title, locale), preset.buildingType, preset.build()));
            router.push(`/${locale}/configurator/?project=${p.id}`);
          }}
        >
          {dict.portfolio.open}
        </Button>
      </div>
    </div>
  );
}

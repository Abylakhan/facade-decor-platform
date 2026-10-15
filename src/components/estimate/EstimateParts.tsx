"use client";
import { Fragment, useState } from "react";
import type { CalcMessage, CalcStep, Estimate, EstimateLine } from "@/domain/types";
import { fmtDate, fmtMoney, fmtNumber, lt } from "@/i18n";
import { useI18n } from "@/lib/i18n-context";
import { useCatalog } from "@/lib/catalog-context";
import { useCalcMessage } from "@/lib/use-messages";
import { Icon } from "@/components/ui/icons";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { NumberInput } from "@/components/ui/form";

export function StepList({ steps }: { steps: CalcStep[] }) {
  const { locale, dict } = useI18n();
  return (
    <dl className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
      {steps.map((s, i) => (
        <div key={i} className="flex justify-between gap-3 border-b border-dotted border-line py-1">
          <dt className="text-ink-3">{(dict.calc.step as Record<string, string>)[s.k] ?? s.k}</dt>
          <dd className="num text-ink">
            {typeof s.v === "number" ? fmtNumber(s.v, locale, 3) : s.k === "scheme" ? dict.scheme[s.v as "4"] ?? s.v : s.v}
            {s.unit && ` ${s.unit === "pcs" ? dict.units.pcs : s.unit === "m2" ? dict.units.m2 : s.unit === "m" ? dict.units.m : s.unit === "mm" ? dict.units.mm : s.unit === "kg" ? dict.units.kg : s.unit}`}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Messages({ estimate, className = "" }: { estimate: Estimate; className?: string }) {
  const { dict } = useI18n();
  const msg = useCalcMessage();
  const item = (m: CalcMessage, i: number) => (
    <li key={i} className={`flex gap-2 text-[13px] ${m.severity === "error" ? "text-danger" : m.severity === "warn" ? "text-warn" : "text-ink-3"}`}>
      <Icon name={m.severity === "info" ? "info" : "warn"} size={15} className="mt-0.5 shrink-0" />
      <span>{msg(m)}</span>
    </li>
  );
  return (
    <div className={`grid gap-6 md:grid-cols-2 ${className}`}>
      <div>
        <h3 className="eyebrow mb-2">{dict.calc.warnings}</h3>
        {estimate.warnings.length ? <ul className="space-y-1.5">{estimate.warnings.map(item)}</ul> : <p className="text-[13px] text-ink-4">{dict.calc.noWarnings}</p>}
      </div>
      <div>
        <h3 className="eyebrow mb-2">{dict.calc.assumptions}</h3>
        <ul className="space-y-1.5">
          <li className="flex gap-2 text-[13px] text-ink-3">
            <Icon name="info" size={15} className="mt-0.5 shrink-0" />
            {dict.calc.approx}
          </li>
          {estimate.assumptions.map(item)}
        </ul>
      </div>
    </div>
  );
}

export function Totals({ estimate, large = false }: { estimate: Estimate; large?: boolean }) {
  const { locale, dict } = useI18n();
  const t = estimate.totals;
  const row = (label: string, v: number, neg = false) => (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-ink-3">{label}</span>
      <span className="num">
        {neg && v ? "−" : ""}
        <AnimatedNumber value={v} format={(n) => fmtMoney(n, locale)} />
      </span>
    </div>
  );
  return (
    <div>
      {row(dict.calc.materials, t.materials)}
      {row(dict.calc.labour, t.labour)}
      {row(dict.calc.delivery, t.delivery)}
      {t.extras !== 0 && row(dict.calc.extras, t.extras)}
      {t.discount !== 0 && row(dict.calc.discount, t.discount, true)}
      <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-ink pt-3">
        <span className="text-sm font-medium">{t.hasUnpriced ? dict.calc.totalPartial : dict.calc.total}</span>
        <span className={`num px-1 font-display ${large ? "text-4xl" : "text-3xl"}`} aria-live="polite">
          <AnimatedNumber value={t.total} format={(n) => fmtMoney(n, locale)} />
        </span>
      </div>
      <p className="mt-2 text-[11px] text-ink-4">
        {dict.calc.priceVersion}: {estimate.priceListVersion} · {dict.calc.calculatedAt}: {fmtDate(estimate.calculatedAt, locale)}
      </p>
    </div>
  );
}

export function Metrics({ estimate }: { estimate: Estimate }) {
  const { locale, dict } = useI18n();
  const m = estimate.metrics;
  const items: [string, string][] = [
    [dict.calc.wallHeight, `${fmtNumber(m.wallHeight, locale)} ${dict.units.m}`],
    [dict.calc.perimeter, `${fmtNumber(m.perimeter, locale)} ${dict.units.m}`],
    [dict.calc.grossArea, `${fmtNumber(m.grossArea, locale)} ${dict.units.m2}`],
    [dict.calc.openingsArea, `${fmtNumber(m.openingsArea, locale)} ${dict.units.m2}`],
    [dict.calc.netArea, `${fmtNumber(m.netArea, locale)} ${dict.units.m2}`],
    [dict.calc.windows, String(m.windows)],
    [dict.calc.doors, String(m.doors)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
      {items.map(([k, v]) => (
        <div key={k} className="bg-surface p-3">
          <dt className="dim">{k}</dt>
          <dd className="num mt-1 text-lg">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Full specification. With `onOverride`, quantities are editable (pro mode). */
export function EstimateTable({
  estimate,
  onOverride,
  showSteps = true,
}: {
  estimate: Estimate;
  onOverride?: (line: EstimateLine, qty: number | null) => void;
  showSteps?: boolean;
}) {
  const { locale, dict } = useI18n();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  if (!estimate.lines.length) return <p className="py-6 text-sm text-ink-4">{dict.configurator.noDecor}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="table-base min-w-[640px]">
        <thead>
          <tr>
            <th>{dict.calc.sku}</th>
            <th>{dict.calc.item}</th>
            <th className="text-right">{dict.calc.measure}</th>
            <th className="text-right">{dict.calc.qty}</th>
            <th className="text-right">{dict.calc.unitPrice}</th>
            <th className="text-right">{dict.calc.sum}</th>
          </tr>
        </thead>
        <tbody>
          {estimate.lines.map((l) => (
            <Fragment key={l.key}>
              <tr className="print-avoid">
                <td className="num text-xs whitespace-nowrap text-ink-3">{l.sku}</td>
                <td>
                  <span className="block">{lt(l.name, locale)}</span>
                  <span className="flex flex-wrap gap-2 text-[11px] text-ink-4">
                    {l.isConsumable && <span>{dict.calc.consumable}</span>}
                    {l.minOrderApplied && <span>{dict.calc.minOrder}</span>}
                    {l.overridden && <span className="text-bronze">{dict.calc.overridden} ({fmtNumber(l.computedQuantity, locale)})</span>}
                    {showSteps && l.steps.length > 0 && (
                      <button type="button" className="no-print underline underline-offset-2 hover:text-ink" aria-expanded={!!open[l.key]} onClick={() => setOpen((o) => ({ ...o, [l.key]: !o[l.key] }))}>
                        {dict.calc.howCalculated}
                      </button>
                    )}
                  </span>
                </td>
                <td className="num text-right text-xs whitespace-nowrap text-ink-3">
                  {l.measure ? `${fmtNumber(l.measure.value, locale)} ${l.measure.unit === "m2" ? dict.units.m2 : l.measure.unit === "m" ? dict.units.m : dict.units.pcs}` : "—"}
                </td>
                <td className="num text-right whitespace-nowrap">
                  {onOverride ? (
                    <div className="ml-auto w-24">
                      <NumberInput
                        aria-label={`${dict.calc.qty}: ${l.sku}`}
                        value={l.quantity}
                        onValue={(v) => onOverride(l, v)}
                        unit={dict.units[l.unit]}
                        min={0}
                        step={1}
                      />
                    </div>
                  ) : (
                    <>
                      {fmtNumber(l.quantity, locale)} {dict.units[l.unit]}
                    </>
                  )}
                </td>
                <td className="num text-right whitespace-nowrap">{l.unitPrice === null ? <span className="text-xs text-ink-4">{dict.common.priceOnRequest}</span> : fmtMoney(l.unitPrice, locale)}</td>
                <td className="num text-right whitespace-nowrap">{l.total === null ? "—" : fmtMoney(l.total, locale)}</td>
              </tr>
              {(open[l.key] || !showSteps) && l.steps.length > 0 && showSteps && (
                <tr>
                  <td />
                  <td colSpan={5} className="bg-paper">
                    <StepList steps={l.steps} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LabourTable({ estimate }: { estimate: Estimate }) {
  const { locale, dict } = useI18n();
  const { product } = useCatalog();
  if (!estimate.labour.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="table-base min-w-[520px]">
        <thead>
          <tr>
            <th>{dict.calc.item}</th>
            <th className="text-right">{dict.calc.measure}</th>
            <th className="text-right">{dict.calc.labourRate}</th>
            <th className="text-right">{dict.calc.sum}</th>
          </tr>
        </thead>
        <tbody>
          {estimate.labour.map((l) => (
            <tr key={l.key}>
              <td>
                {dict.placement[l.placement]} <span className="text-xs text-ink-4">· {product(l.productId)?.sku}</span>
              </td>
              <td className="num text-right">
                {fmtNumber(l.measure, locale)} {l.unit === "m2" ? dict.units.m2 : l.unit === "m" ? dict.units.m : dict.units.pcs}
              </td>
              <td className="num text-right">{fmtMoney(l.rate, locale)}</td>
              <td className="num text-right">{fmtMoney(l.total, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

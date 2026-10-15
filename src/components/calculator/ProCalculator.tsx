"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { DeliveryZone, PackageOption, Project } from "@/domain/types";
import { SIDES } from "@/domain/types";
import { getWall, netWallArea, wallArea, wallHeight, wallLength } from "@/domain/calc/geometry";
import { fmtDate, fmtMoney, fmtNumber } from "@/i18n";
import { projectProvider } from "@/lib/projects";
import { loadCurrentProject } from "@/lib/project-actions";
import { useProjectState } from "@/lib/use-project";
import { useI18n } from "@/lib/i18n-context";
import { useCatalog } from "@/lib/catalog-context";
import { Button, buttonClass } from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { Field, Input, NumberInput, Segmented, Select } from "@/components/ui/form";
import { Icon } from "@/components/ui/icons";
import { GeometryEditor } from "@/components/project/GeometryEditor";
import { OpeningsEditor } from "@/components/project/OpeningsEditor";
import { AddDecor, SelectionEditor, messagesFor } from "@/components/project/SelectionEditor";
import { EstimateTable, LabourTable, Messages, Metrics, Totals } from "@/components/estimate/EstimateParts";
import { LeadModalButton } from "@/components/forms/LeadModalButton";

export function ProCalculator() {
  const { locale, dict } = useI18n();
  const { product, prices } = useCatalog();
  const sp = useSearchParams();
  const [initial, setInitial] = useState<Project | null | undefined>(undefined);
  const { project, variant, estimate, updateVariant, updateProject, status } = useProjectState(initial ?? null);
  const k = dict.calculator;

  useEffect(() => {
    (async () => {
      const id = sp.get("project");
      setInitial((id ? await projectProvider().get(id) : null) ?? (await loadCurrentProject()));
    })();
  }, [sp]);

  if (initial === undefined) return <Skeleton className="h-96" />;
  if (!project || !variant || !estimate) {
    return (
      <EmptyState
        title={dict.projects.empty}
        text={k.noProject}
        action={
          <div className="flex gap-2">
            <Link href={`/${locale}/calculator/`} className={buttonClass("primary")}>
              {k.quick}
            </Link>
            <Link href={`/${locale}/configurator/`} className={buttonClass("secondary")}>
              {dict.nav.configurator}
            </Link>
          </div>
        }
      />
    );
  }
  const g = variant.geometry;
  const H = wallHeight(g);
  const opts = variant.options;

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-end gap-4 border-b border-line pb-6">
        <Field label={dict.estimate.project}>
          {({ id }) => <Input id={id} value={project.name} onChange={(e) => updateProject((p) => ({ ...p, name: e.target.value.slice(0, 120) || p.name }))} className="min-w-64" />}
        </Field>
        <Field label={dict.estimate.variant}>
          {({ id }) => (
            <Select id={id} value={project.activeVariantId} onChange={(e) => updateProject((p) => ({ ...p, activeVariantId: e.target.value }))}>
              {project.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <span className="pb-2 text-xs text-ink-4" role="status">
          {status === "error" ? k.missing : dict.configurator.autosaved}
        </span>
        <div className="ml-auto flex flex-wrap gap-2 pb-0.5">
          <Link href={`/${locale}/configurator/?project=${project.id}`} className={buttonClass("secondary")}>
            <Icon name="cube" size={16} />
            {k.toConfigurator}
          </Link>
          <Link href={`/${locale}/estimate/?project=${project.id}&variant=${variant.id}`} className={buttonClass("primary")}>
            <Icon name="print" size={16} />
            {dict.common.printPdf}
          </Link>
        </div>
      </div>

      {/* walls */}
      <section className="grid gap-8 lg:grid-cols-[360px_1fr]">
        <div>
          <h2 className="display-3 mb-4">{k.walls}</h2>
          <GeometryEditor g={g} onChange={(ng, msg) => updateVariant((v) => ({ ...v, geometry: ng }), msg)} />
          <p className="mt-4 text-xs leading-relaxed text-ink-4">{k.zonesNote}</p>
        </div>
        <div className="space-y-6">
          <div className="overflow-x-auto">
            <table className="table-base min-w-[560px]">
              <thead>
                <tr>
                  <th>{k.wall}</th>
                  <th className="text-right">{k.wallLength}</th>
                  <th className="text-right">{dict.calc.wallHeight}</th>
                  <th className="text-right">{dict.calc.grossArea}</th>
                  <th className="text-right">{dict.calc.openingsArea}</th>
                  <th className="text-right">{dict.calc.netArea}</th>
                </tr>
              </thead>
              <tbody>
                {SIDES.map((s) => {
                  const w = getWall(g, s);
                  const valid = Number.isFinite(wallArea(g, s));
                  return (
                    <tr key={s} className={w.included ? "" : "text-ink-4"}>
                      <td>
                        {dict.sides[s]} {!w.included && <span className="text-[11px]">({dict.common.no})</span>}
                      </td>
                      <td className="num text-right">{fmtNumber(wallLength(g, s), locale)}</td>
                      <td className="num text-right">{valid ? fmtNumber(H, locale) : "—"}</td>
                      <td className="num text-right">{valid ? fmtNumber(wallArea(g, s), locale) : "—"}</td>
                      <td className="num text-right">{fmtNumber(w.openings.reduce((a, o) => a + o.width * o.height, 0), locale)}</td>
                      <td className="num text-right">{valid ? fmtNumber(netWallArea(g, s), locale) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <OpeningsEditor g={g} onChange={(ng, msg) => updateVariant((v) => ({ ...v, geometry: ng }), msg)} />
        </div>
      </section>

      {/* decor */}
      <section>
        <h2 className="display-3 mb-4">{dict.configurator.tabs.decor}</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {variant.selections.map((s) => (
            <SelectionEditor
              key={s.id}
              pro
              sel={s}
              g={g}
              messages={messagesFor(product(s.productId)?.sku, [...estimate.warnings, ...estimate.assumptions])}
              onChange={(ns, msg) => updateVariant((v) => ({ ...v, selections: v.selections.map((x) => (x.id === s.id ? ns : x)) }), msg)}
              onRemove={() => updateVariant((v) => ({ ...v, selections: v.selections.filter((x) => x.id !== s.id) }), `− ${product(s.productId)?.sku}`)}
            />
          ))}
          <AddDecor g={g} onAdd={(s) => updateVariant((v) => ({ ...v, selections: [...v.selections, s] }), `+ ${product(s.productId)?.sku}`)} />
        </div>
      </section>

      {/* commercial + extras */}
      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="display-3">{k.package}</h2>
          <Select
            aria-label={k.package}
            value={opts.package}
            onChange={(e) => updateVariant((v) => ({ ...v, options: { ...v.options, package: e.target.value as PackageOption } }), `${k.package}: ${dict.package[e.target.value as PackageOption]}`)}
          >
            {(Object.keys(dict.package) as PackageOption[]).map((p) => (
              <option key={p} value={p} disabled={p === "turnkey" && !prices.turnkeyAvailable}>
                {dict.package[p]}
              </option>
            ))}
          </Select>
          <Segmented<DeliveryZone>
            name="pro-zone"
            label={k.deliveryZone}
            value={opts.deliveryZone}
            onChange={(z) => updateVariant((v) => ({ ...v, options: { ...v.options, deliveryZone: z } }), `${k.deliveryZone}: ${dict.deliveryZone[z]}`)}
            options={(Object.keys(dict.deliveryZone) as DeliveryZone[]).map((z) => ({ value: z, label: dict.deliveryZone[z] }))}
          />
          {opts.deliveryZone === "region" && (
            <label className="flex max-w-48 flex-col gap-1 text-xs text-ink-3">
              {k.distance}
              <NumberInput value={opts.distanceKm ?? null} onValue={(d) => updateVariant((v) => ({ ...v, options: { ...v.options, distanceKm: d ?? undefined } }))} unit="km" min={0} />
            </label>
          )}
        </div>
        <div className="space-y-3">
          <h2 className="display-3">{k.extras}</h2>
          {variant.extras.map((x) => (
            <div key={x.id} className="flex items-center gap-2">
              <Input
                aria-label={k.extraLabel}
                value={x.label}
                onChange={(e) => updateVariant((v) => ({ ...v, extras: v.extras.map((y) => (y.id === x.id ? { ...y, label: e.target.value } : y)) }))}
                className="flex-1"
              />
              <div className="w-40">
                <NumberInput
                  aria-label={k.extraAmount}
                  value={x.amount}
                  onValue={(a) => updateVariant((v) => ({ ...v, extras: v.extras.map((y) => (y.id === x.id ? { ...y, amount: a ?? 0 } : y)) }))}
                  unit="₸"
                />
              </div>
              <button
                type="button"
                onClick={() => updateVariant((v) => ({ ...v, extras: v.extras.filter((y) => y.id !== x.id) }), `− ${x.label}`)}
                aria-label={`${dict.common.delete}: ${x.label}`}
                className="inline-flex h-10 w-10 items-center justify-center hover:text-danger"
              >
                <Icon name="trash" size={16} />
              </button>
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            icon="plus"
            onClick={() => updateVariant((v) => ({ ...v, extras: [...v.extras, { id: `x-${Date.now().toString(36)}`, label: k.extraLabel, amount: 0 }] }), `+ ${k.extras}`)}
          >
            {k.addExtra}
          </Button>
        </div>
      </section>

      {/* estimate */}
      <section className="space-y-6">
        <h2 className="display-3">{dict.estimate.specification}</h2>
        <Metrics estimate={estimate} />
        <p className="text-xs text-ink-4">{k.overrideHint}</p>
        <EstimateTable
          estimate={estimate}
          onOverride={(line, qty) =>
            updateVariant((v) => {
              const overrides = { ...v.overrides };
              if (qty === null || qty === line.computedQuantity) delete overrides[line.key];
              else overrides[line.key] = Math.max(0, qty);
              return { ...v, overrides };
            }, `${line.sku}: ${dict.calc.qty} ${qty ?? line.computedQuantity}`)
          }
        />
        {Object.keys(variant.overrides).length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => updateVariant((v) => ({ ...v, overrides: {} }), k.resetOverride)}>
            {k.resetOverride}
          </Button>
        )}
        {estimate.labour.length > 0 && (
          <>
            <h3 className="eyebrow">{dict.estimate.labourTitle}</h3>
            <LabourTable estimate={estimate} />
          </>
        )}
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <Messages estimate={estimate} />
          <div className="space-y-4 border border-line bg-surface p-5">
            <Totals estimate={estimate} large />
            <LeadModalButton label={dict.common.sendToManager} project={project} estimate={estimate} variant="bronze" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="display-3 mb-4 flex items-center gap-2">
          <Icon name="history" /> {k.history}
        </h2>
        {variant.history.length === 0 ? (
          <p className="text-sm text-ink-4">{k.historyEmpty}</p>
        ) : (
          <ol className="max-h-72 divide-y divide-line overflow-auto border-y border-line text-sm">
            {[...variant.history].reverse().map((h, i) => (
              <li key={i} className="flex gap-4 py-2">
                <span className="num w-36 shrink-0 text-xs text-ink-4">{fmtDate(h.at, locale)}</span>
                <span>{h.message}</span>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-3 text-xs text-ink-4">
          {dict.calc.total}: {fmtMoney(estimate.totals.total, locale)}
        </p>
      </section>
    </div>
  );
}

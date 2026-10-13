"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { BuildingType, Lighting, Project, SceneSettings, Side, Variant, WallMaterial } from "@/domain/types";
import { SIDES } from "@/domain/types";
import { buildEstimate } from "@/domain/calc/estimate";
import { duplicateVariant, starterSelections } from "@/domain/project";
import { newSelection } from "@/domain/placement-defaults";
import { projectProvider } from "@/lib/projects";
import { loadCurrentProject, newTypicalProject, saveProject } from "@/lib/project-actions";
import { useProjectState } from "@/lib/use-project";
import { useSessionState } from "@/lib/session-state";
import { useCatalog } from "@/lib/catalog-context";
import { useI18n } from "@/lib/i18n-context";
import { fmtMoney, format, lt } from "@/i18n";
import { Tabs } from "@/components/ui/Tabs";
import { Button, buttonClass } from "@/components/ui/Button";
import { Alert, Badge, Skeleton } from "@/components/ui/feedback";
import { Field, Input, Segmented, Select } from "@/components/ui/form";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import { GeometryEditor } from "@/components/project/GeometryEditor";
import { OpeningsEditor } from "@/components/project/OpeningsEditor";
import { AddDecor, SelectionEditor, messagesFor } from "@/components/project/SelectionEditor";
import { Messages, Totals } from "@/components/estimate/EstimateParts";
import { LeadModalButton } from "@/components/forms/LeadModalButton";
import { FacadeElevation } from "@/components/drawings/FacadeElevation";
import { hasWebGL } from "@/components/three/webgl";
import type { ViewPreset } from "@/components/three/FacadeScene";

const FacadeScene = dynamic(() => import("@/components/three/FacadeScene").then((m) => m.FacadeScene), { ssr: false, loading: () => <Skeleton className="h-full w-full" /> });

const FACADE = ["#ebe3d4", "#f1ede6", "#d9cbb4", "#c9c4bb", "#b9a58a", "#a4998a", "#6f675d", "#3f3d3a"];
const DECOR = ["#f8f4ec", "#ffffff", "#e2d6c2", "#cfc3ad", "#9c8f7b", "#3a3734"];
const ROOF = ["#2e2b28", "#3d4a52", "#5a3d32", "#6b6359", "#8a4b36"];

type Tab = "house" | "decor" | "view" | "variants";

export function ConfiguratorApp() {
  const { locale, dict } = useI18n();
  const { product, prices } = useCatalog();
  const toast = useToast();
  const router = useRouter();
  const sp = useSearchParams();
  const [initial, setInitial] = useState<Project | null>(null);
  const [typical, setTypical] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const { project, variant, estimate, updateVariant, updateProject, status } = useProjectState(initial);
  const [tab, setTab] = useSessionState<Tab>("fd.cfg.tab", "decor");
  const [view, setView] = useSessionState<ViewPreset>("fd.cfg.view", "iso");
  const [viewNonce, setViewNonce] = useState(0);
  const [gl, setGl] = useState<boolean | null>(null);
  const [specOpen, setSpecOpen] = useState(true);
  const c = dict.configurator;

  useEffect(() => {
    setGl(hasWebGL());
    setSpecOpen(window.matchMedia("(min-width: 1024px)").matches);
  }, []);

  // load: ?project=id → current project → new typical house
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const id = sp.get("project");
        let p = id ? await projectProvider().get(id) : await loadCurrentProject();
        let isTypical = false;
        if (!p) {
          p = newTypicalProject(dict.projects.defaultName);
          const v = p.variants[0]!;
          v.selections = starterSelections(SIDES as Side[]);
          isTypical = true;
          p = await saveProject(p);
        }
        const add = sp.get("add");
        const prod = add ? product(add) : undefined;
        if (prod) {
          const v = p.variants.find((x) => x.id === p!.activeVariantId)!;
          v.selections = [...v.selections, newSelection(prod, v.geometry)];
          p = await saveProject(p);
          toast(format(c.addedFromCatalog, { sku: prod.sku }));
          router.replace(`/${locale}/configurator/?project=${p.id}`, { scroll: false });
        }
        if (!cancelled) {
          setTypical(isTypical);
          setInitial(p);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // load once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const variantTotals = useMemo(
    () => (project ? project.variants.map((v) => ({ v, e: v.id === variant?.id && estimate ? estimate : buildEstimate(v, product, prices) })) : []),
    [project, variant, estimate, product, prices],
  );

  if (loadError) return <Alert tone="danger" className="m-6">{dict.pages.errorText}</Alert>;
  if (!project || !variant || !estimate) {
    return (
      <div className="grid h-[calc(100dvh-88px)] lg:grid-cols-[400px_1fr]" aria-busy="true">
        <div className="space-y-3 p-5">
          <Skeleton className="h-10" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-full" />
      </div>
    );
  }

  const setScene = (patch: Partial<SceneSettings>, msg?: string) => updateVariant((v) => ({ ...v, scene: { ...v.scene, ...patch } }), msg);
  const goView = (v: ViewPreset) => {
    setView(v);
    setViewNonce((n) => n + 1);
  };
  const errors = estimate.warnings.filter((w) => w.severity === "error").length;

  const panel = (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-line p-4">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="pname" className="sr-only">
            {c.projectName}
          </label>
          <input
            id="pname"
            value={project.name}
            onChange={(e) => updateProject((p) => ({ ...p, name: e.target.value.slice(0, 120) || p.name }))}
            className="min-w-0 flex-1 bg-transparent font-display text-2xl outline-none focus:underline"
          />
          <span className="flex items-center gap-1 text-[11px] text-ink-4" role="status">
            {status === "saving" ? <span className="h-2 w-2 animate-pulse rounded-full bg-warn" /> : status === "error" ? <Icon name="warn" size={13} className="text-danger" /> : <Icon name="check" size={13} />}
            {status === "error" ? dict.calculator.missing : c.autosaved}
          </span>
        </div>
        <p className="text-[11px] text-ink-4">
          {dict.common.browserOnly} ·{" "}
          <Link className="link" href={`/${locale}/projects/`}>
            {dict.nav.projects}
          </Link>
        </p>
      </div>
      <Tabs<Tab>
        label={c.title}
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "house", label: c.tabs.house },
          { id: "decor", label: `${c.tabs.decor} · ${variant.selections.length}` },
          { id: "view", label: c.tabs.view },
          { id: "variants", label: `${c.tabs.variants} · ${project.variants.length}` },
        ]}
      />
      <div className="flex-1 space-y-5 overflow-y-auto p-4" role="tabpanel">
        {typical && tab !== "view" && (
          <Alert tone="warn">
            {c.typicalNotice}{" "}
            <button type="button" className="link" onClick={() => setTab("house")}>
              {c.tabs.house} →
            </button>
          </Alert>
        )}
        {tab === "house" && (
          <>
            <Field label={c.buildingType}>
              {({ id }) => (
                <Select id={id} value={project.buildingType} onChange={(e) => updateProject((p) => ({ ...p, buildingType: e.target.value as BuildingType }))}>
                  {(Object.keys(dict.building) as BuildingType[]).map((b) => (
                    <option key={b} value={b}>
                      {dict.building[b]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <h3 className="eyebrow">{c.dimensions}</h3>
            <GeometryEditor
              g={variant.geometry}
              onChange={(g, msg) => {
                setTypical(false);
                updateVariant((v) => ({ ...v, geometry: g }), msg);
              }}
            />
            <h3 className="eyebrow pt-2">{c.openings}</h3>
            <OpeningsEditor
              g={variant.geometry}
              onChange={(g, msg) => {
                setTypical(false);
                updateVariant((v) => ({ ...v, geometry: g }), msg);
              }}
            />
          </>
        )}
        {tab === "decor" && (
          <>
            {variant.selections.length === 0 && <p className="text-sm text-ink-3">{c.noDecor}</p>}
            {variant.selections.map((s) => (
              <SelectionEditor
                key={s.id}
                sel={s}
                g={variant.geometry}
                messages={messagesFor(product(s.productId)?.sku, [...estimate.warnings, ...estimate.assumptions])}
                onChange={(ns, msg) => updateVariant((v) => ({ ...v, selections: v.selections.map((x) => (x.id === s.id ? ns : x)) }), msg)}
                onRemove={() => updateVariant((v) => ({ ...v, selections: v.selections.filter((x) => x.id !== s.id) }), `− ${product(s.productId)?.sku}`)}
              />
            ))}
            <AddDecor g={variant.geometry} onAdd={(s) => updateVariant((v) => ({ ...v, selections: [...v.selections, s] }), `+ ${product(s.productId)?.sku}`)} />
          </>
        )}
        {tab === "view" && (
          <>
            <Field label={c.camera}>
              {() => (
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.keys(c.views) as ViewPreset[]).map((v) => (
                    <Button key={v} size="sm" variant={view === v ? "primary" : "secondary"} onClick={() => goView(v)}>
                      {c.views[v]}
                    </Button>
                  ))}
                </div>
              )}
            </Field>
            <Field label={c.lighting}>
              {() => (
                <Segmented<Lighting>
                  name="lighting"
                  label={c.lighting}
                  value={variant.scene.lighting}
                  onChange={(l) => setScene({ lighting: l })}
                  options={[
                    { value: "day", label: dict.lighting.day },
                    { value: "evening", label: dict.lighting.evening },
                  ]}
                />
              )}
            </Field>
            <Swatches label={c.facadeColor} colors={FACADE} value={variant.scene.facadeColor} onChange={(x) => setScene({ facadeColor: x })} />
            <Field label={c.wallMaterial}>
              {() => (
                <Segmented<WallMaterial>
                  name="wallmat"
                  label={c.wallMaterial}
                  size="sm"
                  value={variant.scene.wallMaterial}
                  onChange={(m) => setScene({ wallMaterial: m })}
                  options={(Object.keys(dict.wallMaterial) as WallMaterial[]).map((m) => ({ value: m, label: dict.wallMaterial[m] }))}
                />
              )}
            </Field>
            <Swatches label={c.decorColor} colors={DECOR} value={variant.scene.decorColor} onChange={(x) => setScene({ decorColor: x })} />
            <Swatches label={c.roofColor} colors={ROOF} value={variant.scene.roofColor} onChange={(x) => setScene({ roofColor: x })} />
            <p className="text-xs leading-relaxed text-ink-4">{c.rotateHint}</p>
          </>
        )}
        {tab === "variants" && (
          <>
            <ul className="space-y-2">
              {variantTotals.map(({ v, e }) => (
                <VariantRow
                  key={v.id}
                  v={v}
                  total={e.totals.total}
                  active={v.id === project.activeVariantId}
                  canDelete={project.variants.length > 1}
                  onSelect={() => updateProject((p) => ({ ...p, activeVariantId: v.id }))}
                  onRename={(name) => updateProject((p) => ({ ...p, variants: p.variants.map((x) => (x.id === v.id ? { ...x, name } : x)) }))}
                  onDuplicate={() =>
                    updateProject((p) => {
                      const copy = duplicateVariant(v, `${v.name} · ${p.variants.length + 1}`);
                      return { ...p, variants: [...p.variants, copy], activeVariantId: copy.id };
                    })
                  }
                  onDelete={() => {
                    if (!window.confirm(`${dict.common.delete}: «${v.name}»?`)) return;
                    updateProject((p) => {
                      const rest = p.variants.filter((x) => x.id !== v.id);
                      return { ...p, variants: rest, activeVariantId: p.activeVariantId === v.id ? rest[0]!.id : p.activeVariantId };
                    });
                  }}
                />
              ))}
            </ul>
            <Button
              variant="secondary"
              icon="plus"
              disabled={project.variants.length >= 20}
              onClick={() =>
                updateProject((p) => {
                  const copy = duplicateVariant(variant, `${c.newVariant} ${p.variants.length + 1}`);
                  return { ...p, variants: [...p.variants, copy], activeVariantId: copy.id };
                })
              }
            >
              {c.newVariant}
            </Button>
            {project.variants.length > 1 && (
              <div>
                <h3 className="eyebrow mb-2">{c.compareVariants}</h3>
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>{dict.estimate.variant}</th>
                      <th className="text-right">{dict.calc.materials}</th>
                      <th className="text-right">{dict.calc.total}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variantTotals.map(({ v, e }) => (
                      <tr key={v.id}>
                        <td>{v.name}</td>
                        <td className="num text-right">{fmtMoney(e.totals.materials, locale)}</td>
                        <td className="num text-right">{fmtMoney(e.totals.total, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Link href={`/${locale}/projects/?compare=${project.id}`} className="link mt-2 inline-block text-xs">
                  {dict.common.details} →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:grid lg:h-[calc(100dvh-88px)] lg:grid-cols-[400px_1fr]">
      <aside className="order-2 border-r border-line bg-paper lg:order-1 lg:h-full lg:overflow-hidden" aria-label={c.title}>
        {panel}
      </aside>
      <section className="relative order-1 h-[52vh] min-h-[320px] bg-stone lg:order-2 lg:h-full" aria-label={c.title}>
        {gl === null ? (
          <Skeleton className="h-full w-full" />
        ) : gl ? (
          <FacadeScene variant={variant} product={product} view={view} viewNonce={viewNonce} className="h-full w-full" />
        ) : (
          <div className="h-full overflow-auto p-4">
            <Alert tone="info">{c.webglFallback}</Alert>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {SIDES.map((s) => (
                <figure key={s} className="border border-line bg-white p-2">
                  <figcaption className="dim mb-1">{dict.sides[s]}</figcaption>
                  <FacadeElevation variant={variant} product={product} side={s} className="w-full" />
                </figure>
              ))}
            </div>
          </div>
        )}
        {/* quick camera bar */}
        {gl && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-1" role="group" aria-label={c.camera}>
            {(["front", "iso", "left", "right", "back", "top"] as ViewPreset[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => goView(v)}
                aria-pressed={view === v}
                className={`h-8 px-2.5 text-xs backdrop-blur transition-colors ${view === v ? "bg-ink text-white" : "bg-white/80 text-ink hover:bg-white"}`}
              >
                {c.views[v]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setScene({ lighting: variant.scene.lighting === "day" ? "evening" : "day" })}
              aria-label={c.lighting}
              title={c.lighting}
              className="inline-flex h-8 w-8 items-center justify-center bg-white/80 backdrop-blur hover:bg-white"
            >
              <Icon name={variant.scene.lighting === "day" ? "moon" : "sun"} size={16} />
            </button>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <Badge tone="demo">DEMO</Badge>
        </div>
        {/* specification card */}
        <div className="no-print absolute right-3 bottom-3 left-3 max-h-[70%] overflow-auto border border-line bg-paper/96 shadow-[var(--shadow-lift)] backdrop-blur sm:left-auto sm:w-[380px]">
          <button type="button" onClick={() => setSpecOpen((o) => !o)} aria-expanded={specOpen} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
            <span>
              <span className="eyebrow block">
                {c.spec} · {c.preliminary}
              </span>
              <span className="num font-display text-2xl">{fmtMoney(estimate.totals.total, locale)}</span>
            </span>
            <span className="flex items-center gap-2">
              {errors > 0 && <Badge tone="danger">{errors}</Badge>}
              <Icon name="chevronDown" className={`transition-transform ${specOpen ? "rotate-180" : ""}`} />
            </span>
          </button>
          {specOpen && (
            <div className="space-y-4 border-t border-line px-4 py-3">
              <ul className="divide-y divide-line text-[13px]">
                {estimate.lines.map((l) => (
                  <li key={l.key} className="flex justify-between gap-3 py-1.5">
                    <span className="min-w-0 truncate">
                      <span className="text-ink-4">{l.sku}</span> {lt(l.name, locale)}
                    </span>
                    <span className="num shrink-0">
                      {l.quantity} {dict.units[l.unit]}
                    </span>
                  </li>
                ))}
                {!estimate.lines.length && <li className="py-2 text-ink-4">{c.noDecor}</li>}
              </ul>
              <Totals estimate={estimate} />
              {(estimate.warnings.length > 0) && (
                <details>
                  <summary className="cursor-pointer text-xs text-warn">
                    {dict.calc.warnings}: {estimate.warnings.length}
                  </summary>
                  <Messages estimate={estimate} className="mt-2 !grid-cols-1" />
                </details>
              )}
              <div className="flex flex-wrap gap-2">
                <Link href={`/${locale}/estimate/?project=${project.id}&variant=${variant.id}`} className={buttonClass("primary", "sm")}>
                  <Icon name="print" size={15} />
                  {c.openEstimate}
                </Link>
                <Link href={`/${locale}/calculator/?mode=pro&project=${project.id}`} className={buttonClass("secondary", "sm")}>
                  {dict.calculator.pro}
                </Link>
                <LeadModalButton label={dict.common.sendToManager} project={project} estimate={estimate} variant="bronze" size="sm" />
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Swatches({ label, colors, value, onChange }: { label: string; colors: string[]; value: string; onChange: (c: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-[13px] font-medium text-ink-2">{label}</legend>
      <div className="flex flex-wrap items-center gap-1.5">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={c}
            aria-pressed={value === c}
            className={`h-8 w-8 border transition-transform hover:scale-110 ${value === c ? "border-ink ring-2 ring-bronze ring-offset-2" : "border-line-strong"}`}
            style={{ background: c }}
          />
        ))}
        <label className="relative inline-flex h-8 w-8 cursor-pointer items-center justify-center border border-dashed border-line-strong" title={label}>
          <Icon name="plus" size={14} />
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={label} />
        </label>
      </div>
    </fieldset>
  );
}

function VariantRow({
  v,
  total,
  active,
  canDelete,
  onSelect,
  onRename,
  onDuplicate,
  onDelete,
}: {
  v: Variant;
  total: number;
  active: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onRename: (n: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { locale, dict } = useI18n();
  return (
    <li className={`border p-3 ${active ? "border-ink bg-white" : "border-line bg-white/60"}`}>
      <div className="flex items-center gap-2">
        <input type="radio" name="active-variant" checked={active} onChange={onSelect} aria-label={`${dict.configurator.active}: ${v.name}`} className="accent-[var(--color-bronze)]" />
        <Input value={v.name} onChange={(e) => onRename(e.target.value.slice(0, 120) || v.name)} aria-label={dict.common.rename} className="h-8 flex-1" />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="num text-sm">{fmtMoney(total, locale)}</span>
        <span className="flex gap-1">
          <button type="button" onClick={onDuplicate} aria-label={dict.common.duplicate} title={dict.common.duplicate} className="inline-flex h-8 w-8 items-center justify-center hover:bg-stone">
            <Icon name="copy" size={15} />
          </button>
          {canDelete && (
            <button type="button" onClick={onDelete} aria-label={dict.common.delete} title={dict.common.delete} className="inline-flex h-8 w-8 items-center justify-center hover:bg-stone hover:text-danger">
              <Icon name="trash" size={15} />
            </button>
          )}
        </span>
      </div>
    </li>
  );
}

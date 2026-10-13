"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { BuildingType, CommercialOptions, DecorSelection, DeliveryZone, PackageOption, PlacementKind, Project, Side } from "@/domain/types";
import { SIDES } from "@/domain/types";
import { buildEstimate } from "@/domain/calc/estimate";
import { createProject, createVariant, generateGeometry, typicalHouse, uid, type SimpleHouseInput } from "@/domain/project";
import { defaultPlacement, productsFor } from "@/domain/placement-defaults";
import { lt } from "@/i18n";
import { useI18n } from "@/lib/i18n-context";
import { useCatalog } from "@/lib/catalog-context";
import { saveProject } from "@/lib/project-actions";
import { Button, buttonClass } from "@/components/ui/Button";
import { Alert } from "@/components/ui/feedback";
import { Checkbox, Field, Input, NumberInput, Segmented, Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/Toast";
import { FacadeElevation } from "@/components/drawings/FacadeElevation";
import { EstimateTable, LabourTable, Messages, Metrics, Totals } from "@/components/estimate/EstimateParts";
import { LeadModalButton } from "@/components/forms/LeadModalButton";

type Num = number | null;
type Geo = { [K in keyof SimpleHouseInput]: Num };
const EMPTY: Geo = {
  length: null,
  depth: null,
  floors: null,
  floorHeight: null,
  plinthHeight: null,
  facadeSides: null,
  windowsPerFloorFront: null,
  windowsPerFloorSide: null,
  windowWidth: null,
  windowHeight: null,
  doorWidth: null,
  doorHeight: null,
};

const DECOR_KINDS: PlacementKind[] = ["eaves", "window-surround", "door-surround", "belt", "plinth", "quoins", "pilaster", "column", "keystone", "brackets", "manual-count"];

/** Five-step wizard. Nothing is pre-filled silently: typical values only via an explicit button. */
export function QuickCalculator() {
  const { locale, dict } = useI18n();
  const { products, product, prices } = useCatalog();
  const router = useRouter();
  const toast = useToast();
  const k = dict.calculator;
  const [step, setStep] = useState(0);
  const [name, setName] = useState(dict.projects.defaultName);
  const [type, setType] = useState<BuildingType>("private-house");
  const [geo, setGeo] = useState<Geo>(EMPTY);
  const [usedTypical, setUsedTypical] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [decor, setDecor] = useState<Partial<Record<PlacementKind, string>>>({});
  const [opts, setOpts] = useState<CommercialOptions>({ package: "materials", deliveryZone: "city" });
  const [saved, setSaved] = useState<Project | null>(null);

  const missing = (Object.keys(EMPTY) as (keyof Geo)[]).filter((key) => {
    const v = geo[key];
    if (v === null || !Number.isFinite(v)) return true;
    if (key === "plinthHeight" || key.startsWith("windowsPer") || key.startsWith("door")) return v < 0;
    return v <= 0;
  });

  const project = useMemo(() => {
    if (missing.length) return null;
    const input = geo as SimpleHouseInput;
    const g = generateGeometry({ ...input, floors: Math.round(input.floors), facadeSides: Math.min(4, Math.max(1, Math.round(input.facadeSides))) });
    const included = SIDES.slice(0, Math.min(4, Math.max(1, Math.round(input.facadeSides)))) as Side[];
    const selections: DecorSelection[] = DECOR_KINDS.filter((kind) => decor[kind]).map((kind) => {
      const p = product(decor[kind]!)!;
      const placement = defaultPlacement(kind, g, p);
      if ("sides" in placement && kind !== "door-surround" && kind !== "pilaster") placement.sides = included;
      return { id: uid("s"), productId: p.id, enabled: true, placement };
    });
    const v = createVariant("A", g, selections);
    v.options = opts;
    return createProject(name || dict.projects.defaultName, type, v);
  }, [geo, decor, opts, name, type, missing.length, product, dict.projects.defaultName]);

  const estimate = useMemo(() => (project ? buildEstimate(project.variants[0]!, product, prices) : null), [project, product, prices]);

  const persist = async () => {
    if (!project) return null;
    const p = await saveProject(saved ? { ...project, id: saved.id, createdAt: saved.createdAt } : project);
    setSaved(p);
    return p;
  };

  const fillTypical = () => {
    setGeo({ ...typicalHouse });
    setUsedTypical(true);
  };
  const g = (key: keyof Geo, label: string, unit?: string, step = 0.05, hint?: string) => (
    <Field label={label} required hint={hint} error={showErrors && missing.includes(key) ? k.missing : null}>
      {({ id, describedBy, invalid }) => (
        <NumberInput id={id} describedBy={describedBy} invalid={invalid} value={geo[key]} onValue={(v) => setGeo((x) => ({ ...x, [key]: v }))} unit={unit} min={0} step={step} />
      )}
    </Field>
  );

  const next = () => {
    if (step === 1 && missing.length) {
      setShowErrors(true);
      return;
    }
    setStep((s) => Math.min(4, s + 1));
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
      <ol className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-0" aria-label={k.quick}>
        {k.steps.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => (i <= 1 || !missing.length ? setStep(i) : setShowErrors(true))}
              aria-current={step === i ? "step" : undefined}
              className={`flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left text-sm whitespace-nowrap transition-colors ${
                step === i ? "border-bronze text-ink" : i < step ? "border-ink text-ink-3" : "border-line text-ink-4"
              }`}
            >
              <span className="num font-display text-xl">{i + 1}</span>
              {label}
            </button>
          </li>
        ))}
      </ol>

      <div className="min-w-0">
        {step === 0 && (
          <div className="space-y-6">
            <Field label={dict.configurator.projectName}>
              {({ id }) => <Input id={id} value={name} onChange={(e) => setName(e.target.value.slice(0, 120))} />}
            </Field>
            <fieldset>
              <legend className="mb-3 text-[13px] font-medium">{dict.configurator.buildingType}</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {(Object.keys(dict.building) as BuildingType[]).map((b) => (
                  <label key={b} className={`cursor-pointer border p-4 transition-colors has-[:checked]:border-ink has-[:checked]:bg-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-bronze ${type === b ? "" : "border-line hover:border-line-strong"}`}>
                    <input type="radio" name="btype" className="sr-only" checked={type === b} onChange={() => setType(b)} />
                    <span className="font-display text-xl">{dict.building[b]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={fillTypical}>
                {k.fillTypical}
              </Button>
              {usedTypical && <span className="text-xs text-warn">{k.typicalAssumption}</span>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g("length", dict.fields.length, dict.units.m)}
              {g("depth", dict.fields.depth, dict.units.m)}
              {g("floors", dict.fields.floors, undefined, 1)}
              {g("floorHeight", dict.fields.floorHeight, dict.units.m)}
              {g("plinthHeight", dict.fields.plinthHeight, dict.units.m)}
              {g("facadeSides", k.facadeSidesCount, undefined, 1, "1–4")}
              {g("windowsPerFloorFront", k.windowsFront, undefined, 1)}
              {g("windowsPerFloorSide", k.windowsSide, undefined, 1)}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <fieldset className="grid grid-cols-2 gap-2">
                <legend className="mb-2 text-[13px] font-medium">{k.windowSize}</legend>
                {g("windowWidth", dict.dims.width, dict.units.m)}
                {g("windowHeight", dict.dims.height, dict.units.m)}
              </fieldset>
              <fieldset className="grid grid-cols-2 gap-2">
                <legend className="mb-2 text-[13px] font-medium">{k.doorSize}</legend>
                {g("doorWidth", dict.dims.width, dict.units.m)}
                {g("doorHeight", dict.dims.height, dict.units.m)}
              </fieldset>
            </div>
            {geo.length && geo.depth ? (
              <p className="text-sm text-ink-3">
                {dict.calc.perimeter}: {(2 * (geo.length + geo.depth)).toFixed(2)} {dict.units.m} · {dict.placement.eaves}: ≈ {(2 * (geo.length + geo.depth)).toFixed(2)} {dict.units.m}
              </p>
            ) : null}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-ink-3">{k.decorPick}</p>
            {DECOR_KINDS.map((kind) => {
              const opts = productsFor(kind, products);
              const on = !!decor[kind];
              return (
                <div key={kind} className={`grid items-center gap-3 border p-3 sm:grid-cols-[1fr_1.2fr] ${on ? "border-ink bg-white" : "border-line"}`}>
                  <div>
                    <Checkbox label={dict.placement[kind]} checked={on} onChange={(e) => setDecor((d) => ({ ...d, [kind]: e.target.checked ? opts[0]?.id : undefined }))} />
                    <p className="mt-1 pl-6 text-xs text-ink-4">{dict.placementHint[kind]}</p>
                  </div>
                  {on && (
                    <Select aria-label={`${dict.configurator.chooseProduct}: ${dict.placement[kind]}`} value={decor[kind]} onChange={(e) => setDecor((d) => ({ ...d, [kind]: e.target.value }))}>
                      {opts.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.sku} · {lt(o.name, locale)}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <fieldset>
              <legend className="mb-3 text-[13px] font-medium">{k.package}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(Object.keys(dict.package) as PackageOption[]).map((p) => {
                  const disabled = p === "turnkey" && !prices.turnkeyAvailable;
                  return (
                    <label key={p} className={`border p-4 has-[:checked]:border-ink has-[:checked]:bg-white ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
                      <input type="radio" name="pkg" className="sr-only" disabled={disabled} checked={opts.package === p} onChange={() => setOpts((o) => ({ ...o, package: p }))} />
                      <span className="block font-medium">{dict.package[p]}</span>
                      <span className="mt-1 block text-xs text-ink-4">{dict.packageHint[p]}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            {opts.package !== "materials" && (
              <div className="flex flex-wrap items-end gap-4">
                <Field label={k.deliveryZone}>
                  {() => (
                    <Segmented<DeliveryZone>
                      name="zone"
                      label={k.deliveryZone}
                      value={opts.deliveryZone}
                      onChange={(z) => setOpts((o) => ({ ...o, deliveryZone: z }))}
                      options={(Object.keys(dict.deliveryZone) as DeliveryZone[]).map((z) => ({ value: z, label: dict.deliveryZone[z] }))}
                    />
                  )}
                </Field>
                {opts.deliveryZone === "region" && (
                  <Field label={k.distance} required error={!opts.distanceKm ? k.missing : null}>
                    {({ id, invalid }) => <NumberInput id={id} invalid={invalid} value={opts.distanceKm ?? null} onValue={(v) => setOpts((o) => ({ ...o, distanceKm: v ?? undefined }))} unit="km" min={0} />}
                  </Field>
                )}
              </div>
            )}
          </div>
        )}

        {step === 4 && project && estimate && (
          <div className="space-y-10">
            {usedTypical && <Alert tone="warn">{k.typicalAssumption}</Alert>}
            <Metrics estimate={estimate} />
            <figure className="border border-line bg-white p-3">
              <figcaption className="dim mb-2">{dict.estimate.schema} · {dict.sides.front}</figcaption>
              <FacadeElevation variant={project.variants[0]!} product={product} className="w-full" />
            </figure>
            <div>
              <h2 className="display-3 mb-4">{dict.estimate.specification}</h2>
              <EstimateTable estimate={estimate} />
            </div>
            {estimate.labour.length > 0 && (
              <div>
                <h2 className="display-3 mb-4">{dict.estimate.labourTitle}</h2>
                <LabourTable estimate={estimate} />
              </div>
            )}
            <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
              <Messages estimate={estimate} />
              <div className="border border-line bg-white p-5">
                <Totals estimate={estimate} large />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                icon="check"
                onClick={async () => {
                  await persist();
                  toast(dict.common.saved);
                }}
              >
                {k.saveProject}
              </Button>
              <Button
                icon="cube"
                onClick={async () => {
                  const p = await persist();
                  if (p) router.push(`/${locale}/configurator/?project=${p.id}`);
                }}
              >
                {k.toConfigurator}
              </Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  const p = await persist();
                  if (p) router.push(`/${locale}/estimate/?project=${p.id}`);
                }}
              >
                {dict.common.printPdf}
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  const p = await persist();
                  if (p) router.push(`/${locale}/calculator/?mode=pro&project=${p.id}`);
                }}
              >
                {k.toPro}
              </Button>
              <LeadModalButton label={k.requestOfficial} project={saved ?? project} estimate={estimate} variant="bronze" />
            </div>
          </div>
        )}

        <div className="mt-10 flex justify-between border-t border-line pt-5">
          <Button variant="ghost" icon="arrowLeft" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            {dict.common.back}
          </Button>
          {step < 4 && (
            <Button iconRight="arrow" onClick={next}>
              {dict.common.next}
            </Button>
          )}
          {step === 4 && (
            <Link href={`/${locale}/projects/`} className={buttonClass("ghost")}>
              {dict.nav.projects}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import type { CalcMessage, Corner, DecorSelection, HouseGeometry, Placement, PlacementKind, Side, SurroundScheme } from "@/domain/types";
import { CORNERS, SIDES } from "@/domain/types";
import { defaultPlacement, productsFor } from "@/domain/placement-defaults";
import { lt } from "@/i18n";
import { useI18n } from "@/lib/i18n-context";
import { useCatalog } from "@/lib/catalog-context";
import { useCalcMessage } from "@/lib/use-messages";
import { Checkbox, NumberInput, Segmented, Select } from "@/components/ui/form";
import { Hint } from "@/components/ui/Hint";
import { Icon } from "@/components/ui/icons";

/** Editor for one decor selection: product, placement parameters, on/off, removal. */
export function SelectionEditor({
  sel,
  g,
  messages,
  onChange,
  onRemove,
  pro = false,
}: {
  sel: DecorSelection;
  g: HouseGeometry;
  messages: CalcMessage[];
  onChange: (s: DecorSelection, msg?: string) => void;
  onRemove: () => void;
  pro?: boolean;
}) {
  const { locale, dict } = useI18n();
  const { products, product } = useCatalog();
  const msg = useCalcMessage();
  const [open, setOpen] = useState(true);
  const p = product(sel.productId);
  const pl = sel.placement;
  const c = dict.configurator;
  const set = (placement: Placement) => onChange({ ...sel, placement });
  const options = products.filter((x) => x.placements.includes(pl.kind));

  const sidesPicker = (sides: Side[]) => (
    <fieldset>
      <legend className="mb-1.5 text-xs text-ink-3">{c.sidesLabel}</legend>
      <div className="grid grid-cols-2 gap-1.5">
        {SIDES.map((s) => (
          <Checkbox
            key={s}
            label={dict.sides[s]}
            checked={sides.includes(s)}
            onChange={(e) => set({ ...pl, sides: e.target.checked ? [...sides, s] : sides.filter((x) => x !== s) } as Placement)}
          />
        ))}
      </div>
    </fieldset>
  );
  const numberField = (label: string, value: number | undefined, on: (v: number | null) => void, unit?: string, step = 1) => (
    <label className="flex flex-col gap-1 text-xs text-ink-3">
      {label}
      <NumberInput value={value ?? null} onValue={on} unit={unit} min={0} step={step} />
    </label>
  );

  return (
    <div className={`border bg-white ${messages.some((m) => m.severity === "error") ? "border-danger/50" : "border-line"}`}>
      <div className="flex items-center gap-2 p-3">
        <input
          type="checkbox"
          checked={sel.enabled}
          onChange={(e) => onChange({ ...sel, enabled: e.target.checked }, `${p?.sku}: ${e.target.checked ? "on" : "off"}`)}
          aria-label={c.enabled}
          title={c.enabled}
          className="h-4 w-4 accent-[var(--color-bronze)]"
        />
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-w-0 flex-1 flex-col text-left">
          <span className="truncate text-sm font-medium">{dict.placement[pl.kind]}</span>
          <span className="truncate text-xs text-ink-4">{p ? `${p.sku} · ${lt(p.name, locale)}` : sel.productId}</span>
        </button>
        <Hint>{dict.placementHint[pl.kind]}</Hint>
        <button type="button" onClick={onRemove} aria-label={`${dict.common.remove}: ${dict.placement[pl.kind]}`} className="inline-flex h-8 w-8 items-center justify-center text-ink-4 hover:text-danger">
          <Icon name="trash" size={16} />
        </button>
      </div>
      {open && (
        <div className="space-y-3 border-t border-line p-3">
          <label className="flex flex-col gap-1 text-xs text-ink-3">
            {c.chooseProduct}
            <Select value={sel.productId} onChange={(e) => onChange({ ...sel, productId: e.target.value }, `${p?.sku} → ${product(e.target.value)?.sku}`)}>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.sku} · {lt(o.name, locale)}
                </option>
              ))}
            </Select>
          </label>
          {"sides" in pl && sidesPicker(pl.sides)}
          {(pl.kind === "window-surround" || pl.kind === "door-surround") && (
            <div className="flex flex-col gap-1 text-xs text-ink-3">
              {c.schemeLabel}
              <Segmented<SurroundScheme>
                name={`scheme-${sel.id}`}
                label={c.schemeLabel}
                size="sm"
                value={pl.scheme}
                onChange={(scheme) => set({ ...pl, scheme })}
                options={(["4", "3", "top"] as SurroundScheme[]).map((s) => ({ value: s, label: dict.scheme[s] }))}
              />
            </div>
          )}
          {pl.kind === "keystone" && (
            <label className="flex flex-col gap-1 text-xs text-ink-3">
              {c.openingsLabel}
              <Select value={pl.openings} onChange={(e) => set({ ...pl, openings: e.target.value as typeof pl.openings })}>
                {(["window", "door", "all"] as const).map((k) => (
                  <option key={k} value={k}>
                    {dict.openingKind[k]}
                  </option>
                ))}
              </Select>
            </label>
          )}
          {(pl.kind === "eaves" || pl.kind === "belt" || pl.kind === "plinth") && p?.cornerElementId && (
            <Checkbox label={c.useCorners} checked={!!pl.useCornerElements} onChange={(e) => set({ ...pl, useCornerElements: e.target.checked })} />
          )}
          {pl.kind === "quoins" && (
            <fieldset>
              <legend className="mb-1.5 text-xs text-ink-3">{c.cornersLabel}</legend>
              <div className="grid grid-cols-2 gap-1.5">
                {CORNERS.map((k: Corner) => (
                  <Checkbox
                    key={k}
                    label={dict.corners[k]}
                    checked={pl.corners.includes(k)}
                    onChange={(e) => set({ ...pl, corners: e.target.checked ? [...pl.corners, k] : pl.corners.filter((x) => x !== k) })}
                  />
                ))}
              </div>
            </fieldset>
          )}
          {pl.kind === "pilaster" && numberField(c.perSide, pl.perSide, (v) => set({ ...pl, perSide: Math.max(0, Math.round(v ?? 0)) }))}
          {pl.kind === "column" && (
            <div className="grid grid-cols-2 gap-2">
              {numberField(c.count, pl.count, (v) => set({ ...pl, count: Math.max(0, Math.round(v ?? 0)) }))}
              {numberField(c.heightOpt, pl.height, (v) => set({ ...pl, height: v && v > 0 ? v : undefined }), dict.units.m, 0.05)}
            </div>
          )}
          {pl.kind === "brackets" && numberField(c.spacingLabel, pl.spacing, (v) => set({ ...pl, spacing: v ?? 0 }), dict.units.m, 0.05)}
          {pl.kind === "manual-length" && numberField(c.lengthLabel, pl.length, (v) => set({ ...pl, length: v ?? 0 }), dict.units.m, 0.1)}
          {pl.kind === "manual-count" && numberField(c.count, pl.count, (v) => set({ ...pl, count: Math.max(0, Math.round(v ?? 0)) }), dict.units.pcs)}
          {pro && (p?.linear || p?.area) && (
            <label className="flex flex-col gap-1 text-xs text-ink-3">
              {c.wasteOverride}
              <NumberInput
                value={sel.wasteOverride !== undefined ? Math.round(sel.wasteOverride * 1000) / 10 : null}
                onValue={(v) => onChange({ ...sel, wasteOverride: v === null ? undefined : Math.min(100, Math.max(0, v)) / 100 }, `${p?.sku}: ${c.wasteOverride} ${v ?? "—"}`)}
                placeholder={p?.wastePercent !== undefined ? String(p.wastePercent * 100) : ""}
                unit="%"
                min={0}
                max={100}
                step={0.5}
              />
            </label>
          )}
          {messages.length > 0 && (
            <ul className="space-y-1">
              {messages.map((m, i) => (
                <li key={i} className={`flex gap-1.5 text-xs ${m.severity === "error" ? "text-danger" : m.severity === "warn" ? "text-warn" : "text-ink-3"}`}>
                  <Icon name={m.severity === "info" ? "info" : "warn"} size={14} className="mt-px shrink-0" />
                  {msg(m)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** "Add decor": choose what to add, then the product. Placement starts with visible defaults. */
export function AddDecor({ g, onAdd }: { g: HouseGeometry; onAdd: (s: DecorSelection) => void }) {
  const { locale, dict } = useI18n();
  const { products } = useCatalog();
  const kinds = Object.keys(dict.placement) as PlacementKind[];
  const [kind, setKind] = useState<PlacementKind>("eaves");
  const options = productsFor(kind, products);
  const [pid, setPid] = useState<string>("");
  const chosen = options.find((o) => o.id === pid) ?? options[0];
  return (
    <div className="space-y-3 border border-dashed border-line-strong bg-paper p-3">
      <p className="eyebrow">{dict.configurator.addDecor}</p>
      <label className="flex flex-col gap-1 text-xs text-ink-3">
        {dict.configurator.choosePlacement}
        <Select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as PlacementKind);
            setPid("");
          }}
        >
          {kinds.map((k) => (
            <option key={k} value={k}>
              {dict.placement[k]}
            </option>
          ))}
        </Select>
      </label>
      <p className="text-xs leading-relaxed text-ink-4">{dict.placementHint[kind]}</p>
      <label className="flex flex-col gap-1 text-xs text-ink-3">
        {dict.configurator.chooseProduct}
        <Select value={chosen?.id ?? ""} onChange={(e) => setPid(e.target.value)} disabled={!options.length}>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.sku} · {lt(o.name, locale)}
            </option>
          ))}
        </Select>
      </label>
      <button
        type="button"
        disabled={!chosen}
        onClick={() => chosen && onAdd({ id: `s-${Date.now().toString(36)}`, productId: chosen.id, enabled: true, placement: defaultPlacement(kind, g, chosen) })}
        className="inline-flex h-9 w-full items-center justify-center gap-2 bg-ink text-sm text-white hover:bg-ink-2 disabled:opacity-40"
      >
        <Icon name="plus" size={16} />
        {dict.common.add}
      </button>
    </div>
  );
}

/** Messages that concern a given selection's product. */
export function messagesFor(sku: string | undefined, all: CalcMessage[]) {
  return sku ? all.filter((m) => m.params?.sku === sku) : [];
}

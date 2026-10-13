"use client";
import type { HouseGeometry, RoofType, Side } from "@/domain/types";
import { SIDES } from "@/domain/types";
import { useI18n } from "@/lib/i18n-context";
import { Checkbox, Field, NumberInput, Segmented } from "@/components/ui/form";

const num = (v: number | null) => (v === null || !Number.isFinite(v) ? NaN : v);

export function GeometryEditor({ g, onChange }: { g: HouseGeometry; onChange: (g: HouseGeometry, msg?: string) => void }) {
  const { dict } = useI18n();
  const f = dict.fields;
  const u = dict.units;
  const err = (v: number, min = 0.0001) => (!Number.isFinite(v) || v < min ? dict.calculator.invalidNumber : null);
  const field = (key: "length" | "depth" | "floorHeight" | "plinthHeight", unit: string, info?: string, min = 0.0001) => (
    <Field label={f[key]} required error={err(g[key], key === "plinthHeight" ? 0 : min)} info={info}>
      {({ id, describedBy, invalid }) => (
        <NumberInput
          id={id}
          describedBy={describedBy}
          invalid={invalid}
          value={Number.isFinite(g[key]) ? g[key] : null}
          onValue={(v) => onChange({ ...g, [key]: num(v) })}
          onBlur={() => onChange(g, `${f[key]}: ${g[key]} ${unit}`)}
          unit={unit}
          min={0}
          step={0.05}
        />
      )}
    </Field>
  );
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {field("length", u.m)}
        {field("depth", u.m)}
        <Field label={f.floors} required error={err(g.floors, 1)}>
          {({ id, describedBy, invalid }) => (
            <NumberInput
              id={id}
              describedBy={describedBy}
              invalid={invalid}
              value={Number.isFinite(g.floors) ? g.floors : null}
              onValue={(v) => onChange({ ...g, floors: v === null ? NaN : Math.max(1, Math.round(v)) })}
              onBlur={() => onChange(g, `${f.floors}: ${g.floors}`)}
              min={1}
              max={30}
              step={1}
            />
          )}
        </Field>
        {field("floorHeight", u.m)}
        {field("plinthHeight", u.m, dict.placementHint.plinth, 0)}
        <Field label={dict.configurator.roofType}>
          {() => (
            <Segmented<RoofType>
              name="roof"
              label={dict.configurator.roofType}
              size="sm"
              value={g.roof.type}
              onChange={(type) => onChange({ ...g, roof: { ...g.roof, type, pitchDeg: type === "flat" ? 0 : g.roof.pitchDeg || 28 } }, `${dict.configurator.roofType}: ${dict.roof[type]}`)}
              options={(["hip", "gable", "flat"] as RoofType[]).map((r) => ({ value: r, label: dict.roof[r] }))}
            />
          )}
        </Field>
      </div>
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-ink-2">{dict.configurator.facadeSides}</legend>
        <div className="grid grid-cols-2 gap-2">
          {SIDES.map((s: Side) => (
            <Checkbox
              key={s}
              label={dict.sides[s]}
              checked={g.walls.find((w) => w.side === s)?.included ?? false}
              onChange={(e) =>
                onChange({ ...g, walls: g.walls.map((w) => (w.side === s ? { ...w, included: e.target.checked } : w)) }, `${dict.sides[s]}: ${e.target.checked ? "+" : "−"}`)
              }
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}

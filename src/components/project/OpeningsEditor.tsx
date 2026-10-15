"use client";
import { useState } from "react";
import type { HouseGeometry, Opening, Side } from "@/domain/types";
import { SIDES } from "@/domain/types";
import { distribute, uid } from "@/domain/project";
import { wallLength } from "@/domain/calc/geometry";
import { round } from "@/domain/calc/math";
import { useI18n } from "@/lib/i18n-context";
import { Button } from "@/components/ui/Button";
import { NumberInput, Segmented } from "@/components/ui/form";
import { Icon } from "@/components/ui/icons";

/** Per-wall list of openings with exact sizes and positions. */
export function OpeningsEditor({ g, onChange }: { g: HouseGeometry; onChange: (g: HouseGeometry, msg?: string) => void }) {
  const { dict } = useI18n();
  const c = dict.configurator;
  const [side, setSide] = useState<Side>("front");
  const [perFloor, setPerFloor] = useState<number | null>(null);
  const wall = g.walls.find((w) => w.side === side);
  const len = wallLength(g, side);
  const setOpenings = (openings: Opening[], msg?: string) => onChange({ ...g, walls: g.walls.map((w) => (w.side === side ? { ...w, openings } : w)) }, msg);
  const patch = (id: string, p: Partial<Opening>) => setOpenings(wall!.openings.map((o) => (o.id === id ? { ...o, ...p } : o)));
  const add = (kind: Opening["kind"]) => {
    const o: Opening =
      kind === "door"
        ? { id: uid("d"), kind, width: 1.2, height: 2.3, floor: 0, x: round(len / 2, 2), sill: 0 }
        : { id: uid("w"), kind, width: 1.2, height: 1.5, floor: 0, x: round(len / 2, 2), sill: 0.9 };
    setOpenings([...(wall?.openings ?? []), o], `${dict.sides[side]}: + ${dict.openingKind[kind]}`);
  };
  const redistribute = () => {
    if (!wall || perFloor === null || perFloor < 0) return;
    const proto = wall.openings.find((o) => o.kind === "window") ?? { width: 1.2, height: 1.5, sill: 0.9 };
    const doors = wall.openings.filter((o) => o.kind === "door");
    const next: Opening[] = [...doors];
    for (let f = 0; f < g.floors; f++) {
      const hasDoor = doors.some((d) => d.floor === f);
      for (const x of distribute(len, perFloor, proto.width, hasDoor)) next.push({ id: uid("w"), kind: "window", width: proto.width, height: proto.height, floor: f, x, sill: proto.sill });
    }
    setOpenings(next, `${dict.sides[side]}: ${c.redistribute} (${perFloor})`);
  };
  const cell = (o: Opening, key: "width" | "height" | "x" | "sill", label: string) => (
    <label className="flex flex-col gap-1 text-[11px] text-ink-4">
      {label}
      <NumberInput value={o[key]} onValue={(v) => patch(o.id, { [key]: v ?? 0 })} unit={dict.units.m} min={0} step={0.05} aria-label={`${label}, ${dict.openingKind[o.kind]}`} />
    </label>
  );
  return (
    <div className="space-y-4">
      <Segmented<Side> name="openings-side" label={c.openings} size="sm" value={side} onChange={setSide} options={SIDES.map((s) => ({ value: s, label: dict.sides[s] }))} />
      <p className="text-xs text-ink-4">
        {dict.calculator.wallLength}: {len} {dict.units.m}
      </p>
      <ul className="space-y-3">
        {wall?.openings.map((o, i) => (
          <li key={o.id} className="border border-line bg-surface p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">
                {dict.openingKind[o.kind]} {i + 1}
              </span>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-ink-3">
                  {c.floor}
                  <select
                    value={o.floor}
                    onChange={(e) => patch(o.id, { floor: Number(e.target.value) })}
                    className="h-7 border border-line-strong bg-surface px-1 text-xs"
                  >
                    {Array.from({ length: Math.max(1, g.floors) }, (_, f) => (
                      <option key={f} value={f}>
                        {f + 1}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => setOpenings(wall.openings.filter((x) => x.id !== o.id), `${dict.sides[side]}: − ${dict.openingKind[o.kind]}`)}
                  aria-label={`${dict.common.delete}: ${dict.openingKind[o.kind]} ${i + 1}`}
                  className="inline-flex h-7 w-7 items-center justify-center text-ink-4 hover:text-danger"
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {cell(o, "width", dict.dims.width)}
              {cell(o, "height", dict.dims.height)}
              {cell(o, "x", c.position)}
              {cell(o, "sill", c.sill)}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" icon="plus" onClick={() => add("window")}>
          {c.addWindow}
        </Button>
        <Button size="sm" variant="secondary" icon="plus" onClick={() => add("door")}>
          {c.addDoor}
        </Button>
      </div>
      <div className="flex items-end gap-2 border-t border-line pt-4">
        <label className="flex flex-col gap-1 text-xs text-ink-3">
          {c.perFloor}
          <NumberInput value={perFloor} onValue={setPerFloor} min={0} max={20} step={1} />
        </label>
        <Button size="sm" variant="ghost" onClick={redistribute} disabled={perFloor === null}>
          {c.redistribute}
        </Button>
      </div>
    </div>
  );
}

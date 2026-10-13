import type { DecorSelection, HouseGeometry, Placement, PlacementKind, Product } from "./types";
import { CORNERS } from "./types";
import { includedSides } from "./calc/geometry";
import { uid } from "./project";

/**
 * Initial placement for a product added from the catalog. Values are visible and
 * editable in the configurator; nothing is hidden. Lengths the system cannot know
 * (manual lines) start at 0 so the estimate asks for them explicitly.
 */
export function defaultPlacement(kind: PlacementKind, g: HouseGeometry, p: Product): Placement {
  const sides = includedSides(g);
  switch (kind) {
    case "eaves":
    case "belt":
    case "plinth":
      return { kind, sides };
    case "window-surround":
      return { kind, sides, scheme: "4" };
    case "door-surround":
      return { kind, sides: ["front"], scheme: "3" };
    case "keystone":
      return { kind, sides, openings: "window" };
    case "quoins":
      return { kind, corners: [...CORNERS] };
    case "pilaster":
      return { kind, sides: ["front"], perSide: 2 };
    case "column":
      return { kind, count: 2 };
    case "brackets":
      return { kind, sides, spacing: 0.8 };
    case "manual-length":
      return { kind, length: 0 };
    case "manual-count":
      return { kind, count: p.minOrder ?? 1 };
    case "area":
      return { kind, sides };
  }
}

export function newSelection(p: Product, g: HouseGeometry, kind: PlacementKind = p.placements[0]!): DecorSelection {
  return { id: uid("s"), productId: p.id, enabled: true, placement: defaultPlacement(kind, g, p) };
}

/** Category that is the natural first choice for each placement. */
const PREFERRED: Partial<Record<PlacementKind, string>> = {
  eaves: "cornices",
  belt: "belts",
  plinth: "plinth",
  "window-surround": "window-surrounds",
  "door-surround": "door-surrounds",
  keystone: "keystones",
  quoins: "rusts",
  pilaster: "pilasters",
  column: "columns",
  brackets: "brackets",
  "manual-count": "rosettes",
  "manual-length": "moldings",
  area: "accessories",
};

/** Products usable for a placement, most fitting category first. */
export function productsFor(kind: PlacementKind, products: Product[]): Product[] {
  const pref = PREFERRED[kind];
  return products
    .filter((p) => p.placements.includes(kind) && (kind === "area" || p.categoryId !== "accessories"))
    .sort((a, b) => Number(b.categoryId === pref) - Number(a.categoryId === pref));
}

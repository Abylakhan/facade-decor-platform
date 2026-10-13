/**
 * DEMO concept projects built with the configurator's own model.
 * They are examples, not completed real-world objects.
 */
import type { BuildingType, LocalizedText, Variant } from "@/domain/types";
import { createVariant, generateGeometry, uid } from "@/domain/project";

export interface Preset {
  slug: string;
  buildingType: BuildingType;
  title: LocalizedText;
  summary: LocalizedText;
  build: () => Variant;
}

const ALL = ["front", "right", "back", "left"] as const;

export function villaVariant(): Variant {
  const g = generateGeometry({
    length: 18,
    depth: 12,
    floors: 2,
    floorHeight: 3.4,
    plinthHeight: 0.7,
    facadeSides: 4,
    windowsPerFloorFront: 6,
    windowsPerFloorSide: 3,
    windowWidth: 1.3,
    windowHeight: 2.0,
    doorWidth: 1.8,
    doorHeight: 2.8,
  });
  g.roof = { type: "hip", pitchDeg: 24, overhang: 0.7 };
  const v = createVariant("Villa", g, [
    { id: uid("s"), productId: "p-k300", enabled: true, placement: { kind: "eaves", sides: [...ALL] } },
    { id: uid("s"), productId: "p-w180k", enabled: true, placement: { kind: "window-surround", sides: ["front"], scheme: "4" } },
    { id: uid("s"), productId: "p-w150", enabled: true, placement: { kind: "window-surround", sides: ["right", "back", "left"], scheme: "3" } },
    { id: uid("s"), productId: "p-pb150", enabled: true, placement: { kind: "belt", sides: [...ALL] } },
    { id: uid("s"), productId: "p-pl200", enabled: true, placement: { kind: "plinth", sides: [...ALL] } },
    { id: uid("s"), productId: "p-rq", enabled: true, placement: { kind: "quoins", corners: ["front-right", "right-back", "back-left", "left-front"] } },
    { id: uid("s"), productId: "p-c300", enabled: true, placement: { kind: "column", count: 4, height: 3.2 } },
    { id: uid("s"), productId: "p-b1", enabled: true, placement: { kind: "brackets", sides: ["front"], spacing: 1.2 } },
  ]);
  v.scene = { facadeColor: "#ebe3d4", decorColor: "#f8f4ec", roofColor: "#2e2b28", wallMaterial: "plaster", lighting: "day" };
  return v;
}

function mansion(): Variant {
  const g = generateGeometry({
    length: 14,
    depth: 11,
    floors: 2,
    floorHeight: 3.3,
    plinthHeight: 0.6,
    facadeSides: 2,
    windowsPerFloorFront: 5,
    windowsPerFloorSide: 2,
    windowWidth: 1.2,
    windowHeight: 1.9,
    doorWidth: 1.5,
    doorHeight: 2.6,
  });
  g.roof = { type: "gable", pitchDeg: 32, overhang: 0.5 };
  const v = createVariant("Mansion", g, [
    { id: uid("s"), productId: "p-k220", enabled: true, placement: { kind: "eaves", sides: ["front", "back"], useCornerElements: true } },
    { id: uid("s"), productId: "p-w150", enabled: true, placement: { kind: "window-surround", sides: ["front", "right"], scheme: "4" } },
    { id: uid("s"), productId: "p-ks1", enabled: true, placement: { kind: "keystone", sides: ["front"], openings: "all" } },
    { id: uid("s"), productId: "p-p300", enabled: true, placement: { kind: "pilaster", sides: ["front"], perSide: 4 } },
    { id: uid("s"), productId: "p-pl200", enabled: true, placement: { kind: "plinth", sides: ["front", "right"] } },
  ]);
  v.scene = { facadeColor: "#d9cbb4", decorColor: "#f4efe6", roofColor: "#5a3d32", wallMaterial: "stone", lighting: "day" };
  return v;
}

function cottage(): Variant {
  const g = generateGeometry({
    length: 11,
    depth: 9,
    floors: 1,
    floorHeight: 3.1,
    plinthHeight: 0.8,
    facadeSides: 4,
    windowsPerFloorFront: 3,
    windowsPerFloorSide: 2,
    windowWidth: 1.4,
    windowHeight: 1.6,
    doorWidth: 1.2,
    doorHeight: 2.3,
  });
  g.roof = { type: "hip", pitchDeg: 30, overhang: 0.6 };
  const v = createVariant("Cottage", g, [
    { id: uid("s"), productId: "p-k220", enabled: true, placement: { kind: "eaves", sides: [...ALL] } },
    { id: uid("s"), productId: "p-w150", enabled: true, placement: { kind: "window-surround", sides: [...ALL], scheme: "top" } },
    { id: uid("s"), productId: "p-rq", enabled: true, placement: { kind: "quoins", corners: ["front-right", "left-front"] } },
    { id: uid("s"), productId: "p-pl200", enabled: true, placement: { kind: "plinth", sides: [...ALL] } },
  ]);
  v.scene = { facadeColor: "#f1ede6", decorColor: "#ffffff", roofColor: "#3d4a52", wallMaterial: "plaster", lighting: "evening" };
  return v;
}

function commercial(): Variant {
  const g = generateGeometry({
    length: 20,
    depth: 14,
    floors: 3,
    floorHeight: 3.6,
    plinthHeight: 0.5,
    facadeSides: 1,
    windowsPerFloorFront: 7,
    windowsPerFloorSide: 3,
    windowWidth: 1.6,
    windowHeight: 2.2,
    doorWidth: 2.4,
    doorHeight: 3.0,
  });
  g.roof = { type: "flat", pitchDeg: 0, overhang: 0.2 };
  const v = createVariant("Commercial", g, [
    { id: uid("s"), productId: "p-k300", enabled: true, placement: { kind: "eaves", sides: ["front"] } },
    { id: uid("s"), productId: "p-m120", enabled: true, placement: { kind: "belt", sides: ["front"] } },
    { id: uid("s"), productId: "p-w150", enabled: true, placement: { kind: "window-surround", sides: ["front"], scheme: "4" } },
    { id: uid("s"), productId: "p-d200", enabled: true, placement: { kind: "door-surround", sides: ["front"], scheme: "3" } },
  ]);
  v.scene = { facadeColor: "#c9c4bb", decorColor: "#efebe4", roofColor: "#3a3734", wallMaterial: "concrete", lighting: "day" };
  return v;
}

export const presets: Preset[] = [
  {
    slug: "villa-classic",
    buildingType: "villa",
    title: { ru: "Вилла в классическом стиле", kk: "Классикалық стильдегі вилла" },
    summary: {
      ru: "Портик из четырёх колонн, монументальный карниз, угловые русты и наличники с замковыми камнями.",
      kk: "Төрт бағаналы портик, монументалды карниз, бұрыштық рустар және құлып тастары бар жақтаулар.",
    },
    build: villaVariant,
  },
  {
    slug: "city-mansion",
    buildingType: "private-house",
    title: { ru: "Городской особняк", kk: "Қалалық сарай" },
    summary: {
      ru: "Двускатная кровля, пилястры на главном фасаде, наличники в четыре стороны и замковые камни.",
      kk: "Екі беткейлі шатыр, басты қасбеттегі пилястрлар, төрт жақты жақтаулар мен құлып тастары.",
    },
    build: mansion,
  },
  {
    slug: "cottage-evening",
    buildingType: "cottage",
    title: { ru: "Одноэтажный коттедж", kk: "Бір қабатты коттедж" },
    summary: {
      ru: "Лаконичный декор: карниз, сандрики над окнами и русты на двух углах. Вечернее освещение.",
      kk: "Қарапайым декор: карниз, терезелер үстіндегі сандриктер және екі бұрыштағы рустар. Кешкі жарық.",
    },
    build: cottage,
  },
  {
    slug: "commercial-front",
    buildingType: "commercial",
    title: { ru: "Фасад коммерческого здания", kk: "Коммерциялық ғимарат қасбеті" },
    summary: {
      ru: "Три этажа, межэтажные пояса, обрамление витринных окон и входной группы.",
      kk: "Үш қабат, қабатаралық белдеулер, витрина терезелері мен кіреберіс тобының жақтауы.",
    },
    build: commercial,
  },
];

/** Same project without any decor — the "before" state for comparisons. */
export function withoutDecor(v: Variant): Variant {
  return { ...v, selections: [] };
}

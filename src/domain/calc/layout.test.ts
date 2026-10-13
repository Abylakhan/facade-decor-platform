import { describe, expect, it } from "vitest";
import { generateGeometry, typicalHouse } from "../project";
import { bracketPositions, columnPositions, freeIntervals, pilasterPositions } from "./layout";
import { getWall } from "./geometry";

describe("decor layout", () => {
  const g = generateGeometry(typicalHouse);
  it("pilasters never overlap ground floor openings", () => {
    const xs = pilasterPositions(g, "front", 4, 0.3);
    expect(xs.length).toBeGreaterThan(0);
    for (const x of xs) {
      for (const o of getWall(g, "front").openings.filter((o) => o.floor === 0)) {
        expect(Math.abs(x - o.x)).toBeGreaterThan(o.width / 2 + 0.15);
      }
    }
  });
  it("free intervals cover wall minus openings", () => {
    const iv = freeIntervals(10, [{ id: "a", kind: "window", width: 2, height: 1, floor: 0, x: 5, sill: 1 }], 0);
    expect(iv).toEqual([[0, 4], [6, 10]]);
  });
  it("columns are symmetric around the door", () => {
    const cols = columnPositions(g, 2);
    const door = getWall(g, "front").openings.find((o) => o.kind === "door")!;
    expect(cols).toHaveLength(2);
    expect((cols[0]!.u + cols[1]!.u) / 2).toBeCloseTo(door.x, 6);
  });
  it("bracket count matches the calculation rule", () => {
    expect(bracketPositions(10, 0.6)).toHaveLength(17);
    expect(bracketPositions(10, 0)).toEqual([]);
  });
});

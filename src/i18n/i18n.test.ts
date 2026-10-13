import { describe, expect, it } from "vitest";
import { demoCategories, demoProducts } from "@/data/demo-catalog";
import { format } from ".";
import { kk } from "./kk";
import { ru } from "./ru";

function walk(a: unknown, b: unknown, path: string, out: string[]) {
  if (typeof a === "string") {
    if (typeof b !== "string" || !b.trim()) out.push(`${path}: missing`);
    else {
      const pa = (a.match(/\{\w+\}/g) ?? []).sort().join();
      const pb = (b.match(/\{\w+\}/g) ?? []).sort().join();
      if (pa !== pb) out.push(`${path}: placeholders ${pa} ≠ ${pb}`);
    }
    return;
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) out.push(`${path}: array length`);
    a.forEach((x, i) => walk(x, (b as unknown[])?.[i], `${path}[${i}]`, out));
    return;
  }
  if (a && typeof a === "object") {
    for (const k of Object.keys(a)) walk((a as Record<string, unknown>)[k], (b as Record<string, unknown>)?.[k], `${path}.${k}`, out);
  }
}

describe("i18n", () => {
  it("Kazakh dictionary matches the Russian one key by key, including placeholders", () => {
    const problems: string[] = [];
    walk(ru, kk, "", problems);
    expect(problems).toEqual([]);
  });
  it("every product and category is translated", () => {
    for (const x of [...demoProducts.flatMap((p) => [p.name, p.description]), ...demoCategories.flatMap((c) => [c.name, c.description])]) {
      expect(x.ru.length).toBeGreaterThan(0);
      expect(x.kk.length).toBeGreaterThan(0);
    }
  });
  it("formats placeholders", () => {
    expect(format("{a} и {b}", { a: 1, b: "x" })).toBe("1 и x");
    expect(format("{missing}")).toBe("{missing}");
  });
});

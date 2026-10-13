import { describe, expect, it } from "vitest";
import { demoCategories, demoProducts } from "@/data/demo-catalog";
import { searchProducts } from "./search";

describe("catalog search", () => {
  it("finds by SKU, Russian and Kazakh names, category and material", () => {
    expect(searchProducts(demoProducts, demoCategories, "к-220")[0]?.id).toBe("p-k220");
    expect(searchProducts(demoProducts, demoCategories, "колонна").map((p) => p.id)).toContain("p-c300");
    expect(searchProducts(demoProducts, demoCategories, "бағана").map((p) => p.id)).toContain("p-c300");
    expect(searchProducts(demoProducts, demoCategories, "стеклофибробетон").length).toBeGreaterThan(0);
    expect(searchProducts(demoProducts, demoCategories, "карниз угол").map((p) => p.id)).toContain("p-cr-k220");
  });
  it("returns nothing for unknown words and everything for empty query", () => {
    expect(searchProducts(demoProducts, demoCategories, "zzzz")).toEqual([]);
    expect(searchProducts(demoProducts, demoCategories, "  ")).toHaveLength(demoProducts.length);
  });
});

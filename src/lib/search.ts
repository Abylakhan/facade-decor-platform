import type { Category, Product } from "@/domain/types";
import { materialNames } from "@/data/demo-catalog";

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[-_.,/()«»"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Full-text search over both languages, SKU, description, category and material. */
export function searchProducts(products: Product[], categories: Category[], query: string): Product[] {
  const tokens = normalize(query).split(" ").filter(Boolean);
  if (!tokens.length) return products;
  const catName = new Map(categories.map((c) => [c.id, `${c.name.ru} ${c.name.kk}`]));
  const scored = products.flatMap((p) => {
    const title = normalize(`${p.name.ru} ${p.name.kk} ${p.sku}`);
    const body = normalize(`${p.description.ru} ${p.description.kk} ${catName.get(p.categoryId) ?? ""} ${materialNames[p.material].ru} ${materialNames[p.material].kk}`);
    let score = 0;
    for (const t of tokens) {
      if (title.includes(t)) score += title.split(" ").some((w) => w.startsWith(t)) ? 3 : 2;
      else if (body.includes(t)) score += 1;
      else return [];
    }
    return [{ p, score }];
  });
  return scored.sort((a, b) => b.score - a.score).map((x) => x.p);
}

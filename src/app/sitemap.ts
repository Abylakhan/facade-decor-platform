import type { MetadataRoute } from "next";
import { LOCALES } from "@/domain/types";
import { providers } from "@/integration/server";
import { articles } from "@/data/content";
import { presets } from "@/data/presets";
import { site } from "@/lib/site";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { catalog } = providers();
  const [cats, products] = await Promise.all([catalog.listCategories(), catalog.listProducts()]);
  const paths = [
    "/",
    "/catalog/",
    "/configurator/",
    "/calculator/",
    "/portfolio/",
    "/services/",
    "/custom-design/",
    "/about/",
    "/articles/",
    "/contacts/",
    "/faq/",
    "/privacy/",
    ...cats.map((c) => `/catalog/${c.slug}/`),
    ...products.map((p) => `/product/${p.slug}/`),
    ...articles.map((a) => `/articles/${a.slug}/`),
    ...presets.map((p) => `/portfolio/${p.slug}/`),
  ];
  return LOCALES.flatMap((l) =>
    paths.map((p) => ({
      url: `${site.url}/${l}${p}`,
      alternates: { languages: Object.fromEntries(LOCALES.map((x) => [x, `${site.url}/${x}${p}`])) },
    })),
  );
}

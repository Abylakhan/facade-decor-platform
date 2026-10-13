import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/catalog/ProductDetail";
import { PageHeader } from "@/components/layout/PageHeader";
import { providers } from "@/integration/server";
import { lt } from "@/i18n";
import { meta, pageLocale } from "@/lib/page";
import { site } from "@/lib/site";

type P = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;
export async function generateStaticParams() {
  const products = await providers().catalog.listProducts();
  return products.map((p) => ({ slug: p.slug }));
}

async function load(params: P["params"]) {
  const { slug } = await params;
  const { locale, dict } = await pageLocale(params);
  const { catalog, pricing } = providers();
  const product = await catalog.getProduct(slug);
  const cats = await catalog.listCategories();
  const prices = await pricing.getPriceList();
  return { locale, dict, product, cat: cats.find((c) => c.id === product?.categoryId), price: product ? (prices.items[product.id] ?? null) : null };
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale, product } = await load(params);
  if (!product) return {};
  return meta(locale, `/product/${product.slug}/`, `${lt(product.name, locale)} · ${product.sku}`, lt(product.description, locale));
}

export default async function ProductPage({ params }: P) {
  const { locale, dict, product, cat, price } = await load(params);
  if (!product) notFound();
  // Structured data only for real (CRM) products: demo items must not look like real offers.
  const jsonLd =
    product.source === "crm"
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: lt(product.name, locale),
          sku: product.sku,
          description: lt(product.description, locale),
          brand: site.brand,
          ...(price !== null ? { offers: { "@type": "Offer", price, priceCurrency: "KZT" } } : {}),
        }
      : null;
  return (
    <main>
      <PageHeader
        crumbsLabel={dict.common.breadcrumbs}
        crumbs={[
          { href: `/${locale}/`, label: dict.nav.home },
          { href: `/${locale}/catalog/`, label: dict.nav.catalog },
          ...(cat ? [{ href: `/${locale}/catalog/${cat.slug}/`, label: lt(cat.name, locale) }] : []),
          { label: product.sku },
        ]}
        eyebrow={product.sku}
        title={lt(product.name, locale)}
      />
      <ProductDetail product={product} />
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
    </main>
  );
}

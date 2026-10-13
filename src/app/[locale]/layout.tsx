import { notFound } from "next/navigation";
import { LOCALES, type Locale } from "@/domain/types";
import { getDict, isLocale } from "@/i18n";
import { providers } from "@/integration/server";
import { I18nProvider } from "@/lib/i18n-context";
import { CatalogDataProvider } from "@/lib/catalog-context";
import { ToastProvider } from "@/components/ui/Toast";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ScrollRestore } from "@/components/layout/ScrollRestore";

export const dynamicParams = false;
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDict(locale as Locale);
  const { catalog, pricing } = providers();
  const [products, categories, prices] = await Promise.all([catalog.listProducts(), catalog.listCategories(), pricing.getPriceList()]);
  return (
    <I18nProvider locale={locale as Locale} dict={dict}>
      <CatalogDataProvider products={products} categories={categories} prices={prices}>
        <ToastProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[300] focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
            {dict.nav.skip}
          </a>
          <Header />
          <ScrollRestore />
          <div id="main">{children}</div>
          <Footer />
        </ToastProvider>
      </CatalogDataProvider>
    </I18nProvider>
  );
}

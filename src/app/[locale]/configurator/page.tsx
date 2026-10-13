import { Suspense } from "react";
import type { Metadata } from "next";
import { ConfiguratorApp } from "@/components/configurator/ConfiguratorApp";
import { Skeleton } from "@/components/ui/feedback";
import { meta, pageLocale, type LocaleParams } from "@/lib/page";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale, dict } = await pageLocale(params);
  return meta(locale, "/configurator/", dict.configurator.title);
}

export default async function ConfiguratorPage({ params }: LocaleParams) {
  const { dict } = await pageLocale(params);
  return (
    <main>
      <h1 className="sr-only">{dict.configurator.title}</h1>
      <Suspense fallback={<Skeleton className="h-[calc(100dvh-88px)]" />}>
        <ConfiguratorApp />
      </Suspense>
    </main>
  );
}

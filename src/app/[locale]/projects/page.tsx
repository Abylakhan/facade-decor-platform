import { Suspense } from "react";
import type { Metadata } from "next";
import { ProjectsManager } from "@/components/project/ProjectsManager";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/feedback";
import { meta, pageLocale, type LocaleParams } from "@/lib/page";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale, dict } = await pageLocale(params);
  return { ...meta(locale, "/projects/", dict.projects.title), robots: { index: false } };
}

export default async function ProjectsPage({ params }: LocaleParams) {
  const { locale, dict } = await pageLocale(params);
  return (
    <main>
      <PageHeader crumbsLabel={dict.common.breadcrumbs} crumbs={[{ href: `/${locale}/`, label: dict.nav.home }, { label: dict.nav.projects }]} title={dict.projects.title} />
      <section className="container-x">
        <Suspense fallback={<Skeleton className="h-64" />}>
          <ProjectsManager />
        </Suspense>
      </section>
    </main>
  );
}

"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef } from "react";
import type { Project } from "@/domain/types";
import { projectSchema } from "@/domain/schemas";
import { buildEstimate } from "@/domain/calc/estimate";
import { activeVariant, uid } from "@/domain/project";
import { fmtDate, fmtMoney, fmtNumber, format } from "@/i18n";
import { useProjects, projectProvider } from "@/lib/projects";
import { saveProject, setCurrentProject } from "@/lib/project-actions";
import { useCurrentProjectId } from "@/lib/stores";
import { useCatalog } from "@/lib/catalog-context";
import { useI18n } from "@/lib/i18n-context";
import { Alert, Badge, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Button, buttonClass } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { FacadeElevation } from "@/components/drawings/FacadeElevation";

export function ProjectsManager() {
  const { locale, dict } = useI18n();
  const { product, prices } = useCatalog();
  const { projects, refresh } = useProjects();
  const [currentId] = useCurrentProjectId();
  const toast = useToast();
  const sp = useSearchParams();
  const compareId = sp.get("compare");
  const fileRef = useRef<HTMLInputElement>(null);
  const p = dict.projects;

  const exportProject = (pr: Project) => {
    const blob = new Blob([JSON.stringify(pr, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${pr.name.replace(/[^\p{L}\p{N}_-]+/gu, "_")}.facade.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const importFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      if (f.size > 2_000_000) throw new Error("size");
      const parsed = projectSchema.parse(JSON.parse(await f.text())) as Project;
      // imported copy gets a fresh id so it never overwrites an existing project silently
      await saveProject({ ...parsed, id: uid("prj") });
      await refresh();
      toast(p.imported);
    } catch {
      toast(p.importError, "danger");
    }
  };

  const compare = useMemo(() => projects?.find((x) => x.id === compareId), [projects, compareId]);

  if (projects === null) return <Skeleton className="h-64" />;
  return (
    <div className="space-y-10">
      <Alert tone="info">{p.lead}</Alert>
      <div className="flex flex-wrap gap-2">
        <Link href={`/${locale}/calculator/`} className={buttonClass("primary")}>
          {p.newProject}
        </Link>
        <Button variant="secondary" icon="upload" onClick={() => fileRef.current?.click()}>
          {p.import}
        </Button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => importFile(e.target.files?.[0])} aria-label={p.import} />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon="folder"
          title={p.empty}
          text={p.emptyText}
          action={
            <Link href={`/${locale}/configurator/`} className={buttonClass("secondary")}>
              {dict.nav.configurator}
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {projects.map((pr) => {
            const v = activeVariant(pr);
            const e = buildEstimate(v, product, prices);
            return (
              <li key={pr.id} className="flex flex-col border border-line bg-white">
                <div className="paper-grid border-b border-line bg-paper p-3">
                  <FacadeElevation variant={v} product={product} className="h-44 w-full" dims={false} />
                </div>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-2xl">{pr.name}</h2>
                      <p className="text-xs text-ink-4">
                        {dict.building[pr.buildingType]} · {format(p.variants, { count: pr.variants.length })} · {p.updated} {fmtDate(pr.updatedAt, locale)}
                      </p>
                    </div>
                    {pr.id === currentId && <Badge tone="bronze">{p.current}</Badge>}
                  </div>
                  <p className="num font-display text-2xl">{fmtMoney(e.totals.total, locale)}</p>
                  <div className="mt-auto flex flex-wrap gap-1.5">
                    <Link href={`/${locale}/configurator/?project=${pr.id}`} onClick={() => setCurrentProject(pr.id)} className={buttonClass("primary", "sm")}>
                      {dict.nav.configurator}
                    </Link>
                    <Link href={`/${locale}/estimate/?project=${pr.id}`} className={buttonClass("secondary", "sm")}>
                      {dict.estimate.title}
                    </Link>
                    <Link href={`/${locale}/calculator/?mode=pro&project=${pr.id}`} className={buttonClass("secondary", "sm")}>
                      {dict.calculator.pro}
                    </Link>
                    {pr.variants.length > 1 && (
                      <Link href={`?compare=${pr.id}`} scroll={false} className={buttonClass("ghost", "sm")}>
                        {p.compareTitle}
                      </Link>
                    )}
                    <Button size="sm" variant="ghost" icon="download" onClick={() => exportProject(pr)}>
                      {p.export}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      icon="trash"
                      onClick={async () => {
                        if (!window.confirm(format(p.confirmDelete, { name: pr.name }))) return;
                        await projectProvider().remove(pr.id);
                        await refresh();
                        toast(p.deleted);
                      }}
                    >
                      {dict.common.delete}
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {compare && (
        <section id="compare" className="space-y-4">
          <h2 className="display-3">
            {p.compareTitle}: {compare.name}
          </h2>
          <div className="overflow-x-auto">
            <table className="table-base min-w-[640px]">
              <thead>
                <tr>
                  <th />
                  {compare.variants.map((v) => (
                    <th key={v.id}>{v.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const es = compare.variants.map((v) => buildEstimate(v, product, prices));
                  const rows: [string, (i: number) => string][] = [
                    [dict.estimate.dimensions, (i) => `${compare.variants[i]!.geometry.length}×${compare.variants[i]!.geometry.depth} ${dict.units.m}`],
                    [dict.calc.netArea, (i) => `${fmtNumber(es[i]!.metrics.netArea, locale)} ${dict.units.m2}`],
                    [dict.configurator.tabs.decor, (i) => String(compare.variants[i]!.selections.filter((s) => s.enabled).length)],
                    [dict.estimate.specification, (i) => String(es[i]!.lines.length)],
                    [dict.calc.materials, (i) => fmtMoney(es[i]!.totals.materials, locale)],
                    [dict.calc.labour, (i) => fmtMoney(es[i]!.totals.labour, locale)],
                    [dict.calc.delivery, (i) => fmtMoney(es[i]!.totals.delivery, locale)],
                    [dict.calc.total, (i) => fmtMoney(es[i]!.totals.total, locale)],
                  ];
                  return rows.map(([label, f]) => (
                    <tr key={label}>
                      <th scope="row" className="!text-[12px] !normal-case !tracking-normal">
                        {label}
                      </th>
                      {compare.variants.map((v, i) => (
                        <td key={v.id} className="num">
                          {f(i)}
                        </td>
                      ))}
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

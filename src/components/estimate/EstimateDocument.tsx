"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Estimate, Project } from "@/domain/types";
import { activeVariant } from "@/domain/project";
import { buildEstimate } from "@/domain/calc/estimate";
import { fmtDate, fmtMoney, fmtNumber, format, lt } from "@/i18n";
import { projectProvider } from "@/lib/projects";
import { loadCurrentProject, saveProject } from "@/lib/project-actions";
import { useCatalog } from "@/lib/catalog-context";
import { useI18n } from "@/lib/i18n-context";
import { whatsappLink, site } from "@/lib/site";
import { Alert, Badge, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Button, buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import { FacadeElevation } from "@/components/drawings/FacadeElevation";
import { EstimateTable, LabourTable, Messages, Metrics, Totals } from "./EstimateParts";
import { LeadModalButton } from "@/components/forms/LeadModalButton";

/**
 * Printable estimate. "Print / save as PDF" uses the browser's print engine, which
 * produces a real PDF with correct Cyrillic/Kazakh text; the print stylesheet hides UI chrome.
 */
export function EstimateDocument() {
  const { locale, dict } = useI18n();
  const { product, prices } = useCatalog();
  const toast = useToast();
  const sp = useSearchParams();
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const [useFixed, setUseFixed] = useState(true);

  useEffect(() => {
    (async () => {
      const id = sp.get("project");
      const p = (id ? await projectProvider().get(id) : null) ?? (await loadCurrentProject());
      const vid = sp.get("variant");
      setProject(p && vid && p.variants.some((v) => v.id === vid) ? { ...p, activeVariantId: vid } : p);
    })();
  }, [sp]);

  const variant = project ? activeVariant(project) : null;
  const current = useMemo(() => (variant ? buildEstimate(variant, product, prices) : null), [variant, product, prices]);

  if (project === undefined) return <Skeleton className="container-x h-96" />;
  if (!project || !variant || !current) {
    return (
      <div className="container-x">
        <EmptyState
          title={dict.estimate.notFound}
          action={
            <Link href={`/${locale}/calculator/`} className={buttonClass("primary")}>
              {dict.calculator.quick}
            </Link>
          }
        />
      </div>
    );
  }

  const snap = variant.snapshot;
  const showFixed = !!snap && useFixed;
  const estimate: Estimate = showFixed ? snap!.estimate : current;
  const changed = !!snap && snap.estimate.priceListVersion !== prices.version;
  const g = variant.geometry;
  const dims = `${g.length}×${g.depth} ${dict.units.m}, ${g.floors} × ${g.floorHeight} ${dict.units.m}`;

  const fix = async () => {
    const next: Project = {
      ...project,
      variants: project.variants.map((v) => (v.id === variant.id ? { ...v, snapshot: { estimate: current, fixedAt: new Date().toISOString() } } : v)),
    };
    setProject(await saveProject(next));
    setUseFixed(true);
    toast(dict.common.saved);
  };

  const purchase = estimate.lines.map((l) => `${l.sku}\t${lt(l.name, locale)}\t${fmtNumber(l.quantity, locale)} ${dict.units[l.unit]}`).join("\n");
  const wa = whatsappLink(format(dict.lead.whatsappText, { name: project.name, dims, total: fmtMoney(estimate.totals.total, locale) }));

  return (
    <article className="container-x">
      <div className="no-print mb-8 flex flex-wrap items-center gap-2">
        <Button icon="print" onClick={() => window.print()}>
          {dict.common.printPdf}
        </Button>
        <Button variant="secondary" icon="check" onClick={fix}>
          {dict.estimate.fix}
        </Button>
        <LeadModalButton label={dict.common.sendToManager} project={project} estimate={estimate} variant="bronze" />
        <a href={wa} target="_blank" rel="noreferrer" className={buttonClass("secondary")} title={site.whatsapp ? undefined : dict.lead.whatsappNoNumber}>
          <Icon name="whatsapp" size={16} />
          {dict.common.whatsapp}
        </a>
        <Link href={`/${locale}/configurator/?project=${project.id}`} className={buttonClass("ghost")}>
          {dict.calculator.toConfigurator}
        </Link>
      </div>
      {!site.whatsapp && <p className="no-print -mt-6 mb-6 text-xs text-ink-4">{dict.lead.whatsappNoNumber}</p>}

      {snap && (
        <div className="no-print mb-6 space-y-2">
          <Alert tone={changed ? "warn" : "info"}>
            {format(dict.estimate.fixed, { date: fmtDate(snap.fixedAt, locale), version: snap.estimate.priceListVersion })}
            {changed && <> · {format(dict.estimate.priceChanged, { old: snap.estimate.priceListVersion, current: prices.version })}</>}
          </Alert>
          <div className="flex gap-2">
            <Button size="sm" variant={useFixed ? "primary" : "secondary"} onClick={() => setUseFixed(true)}>
              {dict.estimate.showFixed}
            </Button>
            <Button size="sm" variant={!useFixed ? "primary" : "secondary"} onClick={() => setUseFixed(false)}>
              {dict.estimate.showCurrent}
            </Button>
            {changed && (
              <Button size="sm" variant="ghost" onClick={fix}>
                {dict.estimate.recalc}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* document */}
      <div className="border border-line bg-white p-6 sm:p-10 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-ink pb-6">
          <div>
            <p className="eyebrow">{site.brand}</p>
            <h1 className="display-3 mt-2">
              {dict.estimate.title}: {project.name}
            </h1>
            <p className="mt-1 text-sm text-ink-3">
              {dict.estimate.variant}: {variant.name} · {dict.building[project.buildingType]}
            </p>
          </div>
          <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-xs">
            <dt className="text-ink-4">{dict.estimate.date}</dt>
            <dd className="num">{fmtDate(estimate.calculatedAt, locale)}</dd>
            <dt className="text-ink-4">{dict.calc.priceVersion}</dt>
            <dd className="num">{estimate.priceListVersion}</dd>
            <dt className="text-ink-4">{dict.estimate.dimensions}</dt>
            <dd className="num">{dims}</dd>
            <dt className="text-ink-4">{dict.calculator.package}</dt>
            <dd>{dict.package[variant.options.package]}</dd>
          </dl>
          {estimate.priceSource === "demo" && <Badge tone="demo">DEMO · {dict.common.demoShort}</Badge>}
        </header>

        <section className="print-avoid mt-8">
          <h2 className="eyebrow mb-3">{dict.estimate.dimensions}</h2>
          <Metrics estimate={estimate} />
        </section>

        <section className="print-avoid mt-8">
          <h2 className="eyebrow mb-3">{dict.estimate.schema}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {(["front", "right"] as const).map((s) => (
              <figure key={s} className="border border-line p-2">
                <figcaption className="dim mb-1">{dict.sides[s]}</figcaption>
                <FacadeElevation variant={variant} product={product} side={s} className="w-full" />
              </figure>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="eyebrow mb-3">{dict.estimate.specification}</h2>
          <EstimateTable estimate={estimate} />
          <details className="no-print mt-2 text-xs text-ink-3">
            <summary className="cursor-pointer">{dict.calc.howCalculated}</summary>
            <p className="mt-2">{dict.calc.approx}</p>
          </details>
        </section>

        {estimate.labour.length > 0 && (
          <section className="mt-8">
            <h2 className="eyebrow mb-3">{dict.estimate.labourTitle}</h2>
            <LabourTable estimate={estimate} />
          </section>
        )}

        <section className="print-avoid mt-8 grid gap-8 md:grid-cols-[1.3fr_1fr]">
          <Messages estimate={estimate} />
          <div>
            <h2 className="eyebrow mb-3">{dict.estimate.totals}</h2>
            <Totals estimate={estimate} large />
          </div>
        </section>

        <section className="print-break mt-10">
          <div className="flex items-center justify-between">
            <h2 className="eyebrow">{dict.estimate.purchaseList}</h2>
            <button
              type="button"
              className="no-print text-xs text-ink-3 hover:text-ink"
              onClick={() => navigator.clipboard?.writeText(purchase).then(() => toast(dict.common.copied), () => toast(dict.lead.errors.generic, "danger"))}
            >
              <Icon name="copy" size={14} className="mr-1 inline" />
              {dict.common.copy}
            </button>
          </div>
          <ol className="mt-3 divide-y divide-line border-y border-line text-sm">
            {estimate.lines.map((l) => (
              <li key={l.key} className="grid grid-cols-[110px_1fr_auto] gap-3 py-1.5">
                <span className="num text-xs text-ink-3">{l.sku}</span>
                <span>{lt(l.name, locale)}</span>
                <span className="num">
                  {fmtNumber(l.quantity, locale)} {dict.units[l.unit]}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <footer className="mt-10 border-t border-line pt-4 text-[11px] leading-relaxed text-ink-4">{dict.estimate.disclaimer}</footer>
      </div>
    </article>
  );
}

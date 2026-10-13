import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Reveal, RevealWords } from "@/components/motion/Reveal";

export function PageHeader({
  crumbs,
  crumbsLabel,
  eyebrow,
  title,
  lead,
  children,
}: {
  crumbs: { href?: string; label: string }[];
  crumbsLabel: string;
  eyebrow?: string;
  title: string;
  lead?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="relative border-b border-line">
      <div className="paper-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="container-x relative pt-8 pb-14 sm:pb-20">
        <Breadcrumbs items={crumbs} label={crumbsLabel} />
        <div className="mt-12 grid gap-8 lg:mt-16 lg:grid-cols-[1.5fr_1fr] lg:items-end">
          <div>
            {eyebrow && (
              <Reveal kind="fade" className="mb-5 flex items-center gap-3">
                <span className="h-px w-10 bg-bronze" />
                <span className="eyebrow">{eyebrow}</span>
              </Reveal>
            )}
            <RevealWords as="h1" text={title} className="display-1 max-w-4xl !text-[40px] sm:!text-[56px] lg:!text-[72px]" />
          </div>
          {lead && (
            <Reveal kind="up" delay={250}>
              <p className="lead max-w-md lg:mb-3">{lead}</p>
            </Reveal>
          )}
        </div>
        {children}
      </div>
    </header>
  );
}

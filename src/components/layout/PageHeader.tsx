import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

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
    <header className="container-x pt-8 pb-10">
      <Breadcrumbs items={crumbs} label={crumbsLabel} />
      {eyebrow && <p className="eyebrow mt-10">{eyebrow}</p>}
      <h1 className={`display-2 max-w-4xl ${eyebrow ? "mt-3" : "mt-10"}`}>{title}</h1>
      {lead && <p className="lead mt-5 max-w-2xl">{lead}</p>}
      {children}
    </header>
  );
}

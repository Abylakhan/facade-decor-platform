import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { LeadForm } from "@/components/forms/LeadForm";
import { Alert } from "@/components/ui/feedback";
import { meta, pageLocale, type LocaleParams } from "@/lib/page";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale, dict } = await pageLocale(params);
  return meta(locale, "/contacts/", dict.pages.contactsTitle);
}

export default async function ContactsPage({ params }: LocaleParams) {
  const { locale, dict } = await pageLocale(params);
  return (
    <main>
      <PageHeader crumbsLabel={dict.common.breadcrumbs} crumbs={[{ href: `/${locale}/`, label: dict.nav.home }, { label: dict.nav.contacts }]} title={dict.pages.contactsTitle} />
      <section className="container-x grid gap-12 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <Alert tone="warn">{dict.pages.contactsDemo}</Alert>
          <dl className="divide-y divide-line border-y border-line text-sm">
            {[dict.lead.phone, "WhatsApp", dict.lead.email, dict.lead.region].map((k) => (
              <div key={k} className="flex justify-between py-3">
                <dt className="text-ink-3">{k}</dt>
                <dd className="text-ink-4">—</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="border border-line bg-surface p-6">
          <h2 className="display-3 mb-4">{dict.lead.consultTitle}</h2>
          <LeadForm compact />
        </div>
      </section>
    </main>
  );
}

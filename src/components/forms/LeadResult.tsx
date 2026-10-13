"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { LeadResult as Result } from "@/integration/types";
import { format } from "@/i18n";
import { useI18n } from "@/lib/i18n-context";
import { whatsappLink } from "@/lib/site";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { buttonClass } from "@/components/ui/Button";

/** Shows the real outcome of the submission — never claims delivery that did not happen. */
export function LeadResult() {
  const { locale, dict } = useI18n();
  const [res, setRes] = useState<Result | null | undefined>(undefined);
  useEffect(() => {
    try {
      setRes(JSON.parse(sessionStorage.getItem("fd.lastLead") ?? "null"));
    } catch {
      setRes(null);
    }
  }, []);
  if (res === undefined) return null;
  if (!res || res.status === "rejected") return <EmptyState title={dict.lead.noResult} />;
  return (
    <div className="max-w-2xl space-y-6">
      {res.status === "accepted" ? (
        <Alert tone="ok" title={res.reference} />
      ) : (
        <Alert tone="warn" title={dict.lead.sentTitle}>
          {res.status === "duplicate" ? format(dict.lead.sentDuplicate, { ref: res.reference }) : format(dict.lead.sentText, { ref: res.reference })}
        </Alert>
      )}
      <div className="flex flex-wrap gap-2">
        <a href={whatsappLink(dict.common.consult)} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
          {dict.common.whatsapp}
        </a>
        <Link href={`/${locale}/projects/`} className={buttonClass("ghost")}>
          {dict.nav.projects}
        </Link>
      </div>
    </div>
  );
}

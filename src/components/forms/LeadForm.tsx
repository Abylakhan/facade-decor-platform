"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ALLOWED_FILE_TYPES, MAX_FILE_BYTES, MAX_FILES, leadSchema } from "@/domain/schemas";
import type { Estimate, Project } from "@/domain/types";
import { DemoQuoteProvider } from "@/integration/demo/quotes";
import { format } from "@/i18n";
import { useI18n } from "@/lib/i18n-context";
import { safeStorage } from "@/lib/storage";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";

type Method = "phone" | "whatsapp" | "telegram" | "email";
interface Draft {
  name: string;
  phone: string;
  email: string;
  contactMethod: Method;
  region: string;
  comment: string;
}
const DRAFT_KEY = "fd.leadDraft";

const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`);

/**
 * Lead / consultation form. In DEMO mode nothing is sent to a manager — the UI
 * says so before and after submission.
 */
export function LeadForm({
  project,
  estimate,
  initialComment = "",
  compact = false,
}: {
  project?: Project;
  estimate?: Estimate;
  initialComment?: string;
  compact?: boolean;
}) {
  const { locale, dict } = useI18n();
  const e = dict.lead.errors;
  const router = useRouter();
  const mountedAt = useRef(Date.now());
  const key = useRef(newKey());
  const [draft, setDraft] = useState<Draft>({ name: "", phone: "", email: "", contactMethod: "phone", region: "", comment: initialComment });
  const [consent, setConsent] = useState(false);
  const [attach, setAttach] = useState(!!project);
  const [files, setFiles] = useState<File[]>([]);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const honeypot = useRef<HTMLInputElement>(null);

  // restore an unsent draft (personal data stays in this tab's session only)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) setDraft((d) => ({ ...d, ...JSON.parse(raw), comment: initialComment || JSON.parse(raw).comment || "" }));
    } catch {
      /* ignore */
    }
  }, [initialComment]);
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [draft]);

  const payload = () => ({
    ...draft,
    consent,
    projectId: attach ? project?.id : undefined,
    variantId: attach ? project?.activeVariantId : undefined,
    files: files.map((f) => ({ name: f.name, type: f.type as (typeof ALLOWED_FILE_TYPES)[number], size: f.size })),
    website: honeypot.current?.value ?? "",
    elapsedMs: Date.now() - mountedAt.current,
    idempotencyKey: key.current,
  });

  const validate = () => {
    const r = leadSchema.safeParse(payload());
    const out: Record<string, string> = {};
    if (!r.success) {
      for (const i of r.error.issues) {
        const field = String(i.path[0] ?? "form");
        if (out[field]) continue;
        const msg = i.message in e ? e[i.message as keyof typeof e] : field === "name" ? e.required : e.required;
        out[field] = msg;
      }
    }
    return out;
  };
  const errFor = (f: string) => (touched[f] ? errors[f] : undefined);
  const blur = (f: string) => {
    setTouched((t) => ({ ...t, [f]: true }));
    setErrors(validate());
  };
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: "" }));
  };

  const onFiles = (list: FileList | null) => {
    setFileErr(null);
    const arr = Array.from(list ?? []);
    if (arr.length > MAX_FILES) return setFileErr(e.fileCount);
    for (const f of arr) {
      if (!(ALLOWED_FILE_TYPES as readonly string[]).includes(f.type)) return setFileErr(format(e.fileType, { name: f.name }));
      if (f.size > MAX_FILE_BYTES) return setFileErr(format(e.fileSize, { name: f.name }));
    }
    setFiles(arr);
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (busy) return;
    setFormError(null);
    const errs = validate();
    setTouched({ name: true, phone: true, email: true, consent: true });
    setErrors(errs);
    const blocking = Object.keys(errs).filter((k) => errs[k]);
    if (blocking.length) {
      const onlyAntiSpam = blocking.every((k) => k === "elapsedMs" || k === "website");
      if (onlyAntiSpam) setFormError(errs.website ? e.spam : e.tooFast);
      document.querySelector<HTMLElement>(`[name="${blocking[0]}"]`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const res = await new DemoQuoteProvider(safeStorage()).submitLead({ lead: payload() as never, project: attach ? project : undefined, clientEstimate: attach ? estimate : undefined });
      if (res.status === "rejected") {
        setFormError(e.generic);
        return;
      }
      sessionStorage.setItem("fd.lastLead", JSON.stringify(res));
      sessionStorage.removeItem(DRAFT_KEY);
      router.push(`/${locale}/request-sent/`);
    } catch {
      setFormError(e.generic);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Alert tone="warn" title="DEMO">
        {dict.lead.demoWarning}
      </Alert>
      <div className={`grid gap-4 ${compact ? "" : "sm:grid-cols-2"}`}>
        <Field label={dict.lead.name} required error={errFor("name")}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} name="name" autoComplete="name" value={draft.name} onChange={(x) => set("name", x.target.value)} onBlur={() => blur("name")} aria-describedby={describedBy} invalid={invalid} />
          )}
        </Field>
        <Field label={dict.lead.phone} required hint={dict.lead.phoneHint} error={errFor("phone")}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} name="phone" type="tel" autoComplete="tel" inputMode="tel" value={draft.phone} onChange={(x) => set("phone", x.target.value)} onBlur={() => blur("phone")} aria-describedby={describedBy} invalid={invalid} />
          )}
        </Field>
        <Field label={dict.lead.contactMethod}>
          {({ id }) => (
            <Select id={id} name="contactMethod" value={draft.contactMethod} onChange={(x) => set("contactMethod", x.target.value as Method)}>
              {(Object.keys(dict.lead.methods) as Method[]).map((m) => (
                <option key={m} value={m}>
                  {dict.lead.methods[m]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={`${dict.lead.email} (${dict.common.optional})`} error={errFor("email")}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} name="email" type="email" autoComplete="email" value={draft.email} onChange={(x) => set("email", x.target.value)} onBlur={() => blur("email")} aria-describedby={describedBy} invalid={invalid} />
          )}
        </Field>
      </div>
      {!compact && (
        <Field label={`${dict.lead.region} (${dict.common.optional})`}>
          {({ id }) => <Input id={id} name="region" autoComplete="address-level2" value={draft.region} onChange={(x) => set("region", x.target.value)} />}
        </Field>
      )}
      <Field label={`${dict.lead.comment} (${dict.common.optional})`}>
        {({ id }) => <Textarea id={id} name="comment" value={draft.comment} onChange={(x) => set("comment", x.target.value)} maxLength={2000} />}
      </Field>
      {!compact && (
        <Field label={`${dict.lead.files} (${dict.common.optional})`} hint={dict.lead.filesHint} error={fileErr}>
          {({ id, describedBy }) => (
            <input
              id={id}
              type="file"
              multiple
              accept={ALLOWED_FILE_TYPES.join(",")}
              onChange={(x) => onFiles(x.target.files)}
              aria-describedby={describedBy}
              className="block w-full text-sm file:mr-3 file:border file:border-line-strong file:bg-surface file:px-3 file:py-2 file:text-sm"
            />
          )}
        </Field>
      )}
      {/* honeypot: hidden from people, visible to naive bots */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {project && <Checkbox label={dict.lead.attachProject} checked={attach} onChange={(x) => setAttach(x.target.checked)} />}
      <div>
        <Checkbox
          name="consent"
          label={
            <>
              {dict.lead.consent} (
              <a href={`/${locale}/privacy/`} className="link" target="_blank" rel="noreferrer">
                {dict.nav.privacy}
              </a>
              )
            </>
          }
          checked={consent}
          onChange={(x) => {
            setConsent(x.target.checked);
            setErrors((er) => ({ ...er, consent: "" }));
          }}
        />
        {touched.consent && errors.consent && (
          <p className="mt-1 text-xs text-danger" role="alert">
            {errors.consent}
          </p>
        )}
      </div>
      {formError && <Alert tone="danger">{formError}</Alert>}
      <Button type="submit" variant="primary" size="lg" loading={busy} disabled={busy} className="w-full sm:w-auto">
        {busy ? dict.lead.sending : dict.lead.submit}
      </Button>
    </form>
  );
}

"use client";
import { useState } from "react";
import { Alert, Badge, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input, NumberInput, Segmented, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { Tabs } from "@/components/ui/Tabs";

const colors = ["ink", "ink-2", "ink-3", "ink-4", "line", "line-strong", "stone", "sand", "paper", "white", "bronze", "bronze-2", "bronze-soft", "blueprint", "danger", "warn", "ok"];

/** Living reference of tokens and components. */
export function DesignSystem() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [seg, setSeg] = useState<"a" | "b" | "c">("a");
  const [tab, setTab] = useState<"one" | "two">("one");
  const [n, setN] = useState<number | null>(12.5);
  return (
    <div className="space-y-16">
      <section>
        <h2 className="eyebrow mb-4">Color tokens</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {colors.map((c) => (
            <div key={c} className="border border-line">
              <div className="h-14" style={{ background: `var(--color-${c})` }} />
              <p className="p-2 text-[11px]">--color-{c}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="eyebrow mb-4">Typography</h2>
        <p className="display-1">Display 1</p>
        <p className="display-2">Display 2 — Cormorant Garamond</p>
        <p className="display-3">Display 3</p>
        <p className="lead">Lead — Inter 17/18. Архитектура начинается с деталей. Сәулет бөлшектерден басталады.</p>
        <p className="eyebrow">Eyebrow · uppercase tracking</p>
        <p className="dim">Dimension annotation 2 400 MM</p>
      </section>
      <section className="space-y-4">
        <h2 className="eyebrow mb-4">Buttons</h2>
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="bronze">Bronze</Button>
          <Button variant="danger" icon="trash">
            Danger
          </Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        <h2 className="eyebrow sm:col-span-2">Fields</h2>
        <Field label="Text" hint="Hint text">
          {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} placeholder="Placeholder" />}
        </Field>
        <Field label="Error state" error="Fill in the field" required>
          {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} />}
        </Field>
        <Field label="Number with unit" info="Plain-language explanation of a technical parameter.">
          {({ id }) => <NumberInput id={id} value={n} onValue={setN} unit="m" />}
        </Field>
        <Field label="Select">
          {({ id }) => (
            <Select id={id}>
              <option>Option A</option>
              <option>Option B</option>
            </Select>
          )}
        </Field>
        <Checkbox label="Checkbox" defaultChecked />
        <Segmented name="ds" label="Segmented" value={seg} onChange={setSeg} options={[{ value: "a", label: "Day" }, { value: "b", label: "Evening" }, { value: "c", label: "Disabled", disabled: true }]} />
      </section>
      <section className="space-y-4">
        <h2 className="eyebrow">Feedback</h2>
        <div className="flex gap-2">
          <Badge>Neutral</Badge>
          <Badge tone="demo">DEMO</Badge>
          <Badge tone="bronze">Bronze</Badge>
          <Badge tone="ok">OK</Badge>
          <Badge tone="danger">Error</Badge>
        </div>
        <Alert tone="info" title="Info">Message</Alert>
        <Alert tone="warn" title="Warning">Message</Alert>
        <Alert tone="danger" title="Error">Message with recovery step.</Alert>
        <Alert tone="ok" title="Success" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <EmptyState title="Empty state" text="Explains what to do next." action={<Button variant="secondary">Action</Button>} />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => toast("Saved")}>
            Toast
          </Button>
          <Button variant="secondary" onClick={() => toast("Something failed — try again", "danger")}>
            Error toast
          </Button>
          <Button variant="secondary" onClick={() => setOpen(true)}>
            Modal
          </Button>
        </div>
        <Modal open={open} onClose={() => setOpen(false)} title="Modal">
          <p className="text-sm">Focus is trapped; Esc closes; focus returns to the trigger.</p>
        </Modal>
      </section>
      <section>
        <h2 className="eyebrow mb-4">Tabs & table</h2>
        <Tabs label="Tabs" value={tab} onChange={setTab} tabs={[{ id: "one", label: "First" }, { id: "two", label: "Second" }]} className="max-w-sm" />
        <table className="table-base mt-6 max-w-lg">
          <thead>
            <tr>
              <th>SKU</th>
              <th className="text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>DEMO-K-220</td>
              <td className="num text-right">21 pcs</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

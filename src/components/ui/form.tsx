"use client";
import { useId, type ComponentProps, type ReactNode } from "react";
import { Hint } from "./Hint";

export function Field({
  label,
  hint,
  error,
  required,
  info,
  children,
  className = "",
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  info?: ReactNode;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
          {label}
          {required && <span className="ml-0.5 text-bronze" aria-hidden="true">*</span>}
        </label>
        {info && <Hint>{info}</Hint>}
      </div>
      {children({ id, describedBy: [hintId, errId].filter(Boolean).join(" ") || undefined, invalid: !!error })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-4">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const inputBase =
  "h-10 w-full border bg-white px-3 text-sm text-ink placeholder:text-ink-4 transition-colors duration-[var(--duration-fast)] focus:border-ink focus:outline-none disabled:bg-stone disabled:text-ink-4";

export function Input({ invalid, className = "", ...rest }: ComponentProps<"input"> & { invalid?: boolean }) {
  return <input className={`${inputBase} ${invalid ? "border-danger" : "border-line-strong"} ${className}`} aria-invalid={invalid || undefined} {...rest} />;
}

export function Textarea({ invalid, className = "", ...rest }: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea
      className={`${inputBase} h-auto min-h-24 py-2 ${invalid ? "border-danger" : "border-line-strong"} ${className}`}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}

export function Select({ invalid, className = "", children, ...rest }: ComponentProps<"select"> & { invalid?: boolean }) {
  return (
    <select
      className={`${inputBase} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%235b5750' stroke-width='1.5'%3E%3Cpath d='m3 4.5 3 3 3-3'/%3E%3C/svg%3E")] bg-[position:right_12px_center] bg-no-repeat pr-8 ${invalid ? "border-danger" : "border-line-strong"} ${className}`}
      aria-invalid={invalid || undefined}
      {...rest}
    >
      {children}
    </select>
  );
}

/** Number input with a visible unit; reports `null` when empty so missing values are never silently replaced. */
export function NumberInput({
  value,
  onValue,
  unit,
  min,
  max,
  step = "any",
  invalid,
  id,
  describedBy,
  ...rest
}: Omit<ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: number | null | undefined;
  onValue: (v: number | null) => void;
  unit?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onValue(v === "" ? null : Number(v));
        }}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={`${inputBase} num ${unit ? "pr-12" : ""} ${invalid ? "border-danger" : "border-line-strong"}`}
        {...rest}
      />
      {unit && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-4">{unit}</span>}
    </div>
  );
}

export function Checkbox({ label, className = "", ...rest }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={`inline-flex cursor-pointer items-center gap-2 text-sm text-ink-2 ${className}`}>
      <input type="checkbox" className="h-4 w-4 cursor-pointer accent-[var(--color-bronze)]" {...rest} />
      <span>{label}</span>
    </label>
  );
}

/** Segmented control implemented as a radio group (keyboard accessible). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  name,
  label,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; disabled?: boolean }[];
  name: string;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap border border-line-strong bg-white p-0.5">
      {options.map((o) => (
        <label
          key={o.value}
          className={`relative cursor-pointer ${size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-[13px]"} transition-colors has-[:checked]:bg-ink has-[:checked]:text-white has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-40 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-bronze`}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            disabled={o.disabled}
            onChange={() => onChange(o.value)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

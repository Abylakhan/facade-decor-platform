import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";

export function Badge({ children, tone = "neutral", className = "" }: { children: ReactNode; tone?: "neutral" | "bronze" | "demo" | "ok" | "warn" | "danger"; className?: string }) {
  const tones = {
    neutral: "border-line-strong text-ink-3 bg-white",
    bronze: "border-bronze/40 text-bronze bg-bronze-soft",
    demo: "border-warn/40 text-warn bg-warn-soft",
    ok: "border-ok/30 text-ok bg-ok-soft",
    warn: "border-warn/40 text-warn bg-warn-soft",
    danger: "border-danger/30 text-danger bg-danger-soft",
  };
  return <span className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${tones[tone]} ${className}`}>{children}</span>;
}

export function Alert({ tone = "info", title, children, className = "" }: { tone?: "info" | "warn" | "danger" | "ok"; title?: ReactNode; children?: ReactNode; className?: string }) {
  const map: Record<string, [string, IconName]> = {
    info: ["border-line-strong bg-white text-ink-2", "info"],
    warn: ["border-warn/40 bg-warn-soft text-ink-2", "warn"],
    danger: ["border-danger/40 bg-danger-soft text-ink-2", "warn"],
    ok: ["border-ok/30 bg-ok-soft text-ink-2", "check"],
  };
  const [cls, icon] = map[tone]!;
  return (
    <div className={`flex gap-3 border p-3 text-sm ${cls} ${className}`} role={tone === "danger" ? "alert" : "status"}>
      <Icon name={icon} size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        {title && <p className="font-medium text-ink">{title}</p>}
        {children && <div className="text-[13px] leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function EmptyState({ title, text, action, icon = "layers" }: { title: string; text?: string; action?: ReactNode; icon?: IconName }) {
  return (
    <div className="paper-grid flex flex-col items-center justify-center gap-3 border border-dashed border-line-strong px-6 py-14 text-center">
      <Icon name={icon} size={28} className="text-ink-4" />
      <p className="font-display text-2xl">{title}</p>
      {text && <p className="max-w-md text-sm text-ink-3">{text}</p>}
      {action}
    </div>
  );
}

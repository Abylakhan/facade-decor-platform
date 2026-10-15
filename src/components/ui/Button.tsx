import Link from "next/link";
import type { ComponentProps } from "react";
import { Icon, type IconName } from "./icons";

type Variant = "primary" | "secondary" | "ghost" | "bronze" | "danger" | "light";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background,color,border-color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-arch)] disabled:pointer-events-none disabled:opacity-45 select-none active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-bronze/60 focus-visible:ring-offset-2 focus-visible:ring-offset-paper";
const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink-2 border border-ink",
  secondary: "border border-line-strong bg-surface text-ink hover:border-ink",
  ghost: "text-ink hover:bg-stone border border-transparent",
  bronze: "bg-bronze text-white hover:bg-bronze-2 border border-bronze",
  danger: "border border-danger/40 text-danger hover:bg-danger-soft bg-surface",
  light: "border border-white/40 text-white hover:bg-white/10",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px] tracking-wide",
  icon: "h-10 w-10 text-sm",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

type BtnProps = ComponentProps<"button"> & { variant?: Variant; size?: Size; icon?: IconName; iconRight?: IconName; loading?: boolean };

export function Button({ variant, size, icon, iconRight, loading, className = "", children, type = "button", ...rest }: BtnProps) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" /> : icon && <Icon name={icon} size={16} />}
      {children}
      {iconRight && <Icon name={iconRight} size={16} />}
    </button>
  );
}

type LinkBtnProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size; icon?: IconName; iconRight?: IconName };

export function LinkButton({ variant, size, icon, iconRight, className = "", children, ...rest }: LinkBtnProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon && <Icon name={icon} size={16} />}
      {children}
      {iconRight && <Icon name={iconRight} size={16} />}
    </Link>
  );
}

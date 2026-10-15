"use client";
import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/domain/types";
import { useI18n } from "@/lib/i18n-context";
import { useCompare, useFavorites } from "@/lib/stores";
import { addProductToProject } from "@/lib/project-actions";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { format } from "@/i18n";

export function FavCompareButtons({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { dict } = useI18n();
  const fav = useFavorites();
  const cmp = useCompare();
  const toast = useToast();
  const isFav = fav.has(product.id);
  const isCmp = cmp.has(product.id);
  const cls = compact ? "h-9 w-9" : "h-10 w-10";
  return (
    <>
      <button
        type="button"
        onClick={() => fav.toggle(product.id)}
        aria-pressed={isFav}
        aria-label={isFav ? dict.common.unfavorite : dict.common.favorite}
        title={isFav ? dict.common.unfavorite : dict.common.favorite}
        className={`inline-flex ${cls} items-center justify-center border border-line-strong bg-surface transition-colors hover:border-ink ${isFav ? "text-bronze" : ""}`}
      >
        <Icon name="heart" fill={isFav ? "currentColor" : "none"} />
      </button>
      <button
        type="button"
        onClick={() => {
          if (cmp.toggle(product.id) === null) toast(dict.pages.compareEmpty, "warn");
        }}
        aria-pressed={isCmp}
        aria-label={isCmp ? dict.common.uncompare : dict.common.compare}
        title={isCmp ? dict.common.uncompare : dict.common.compare}
        className={`inline-flex ${cls} items-center justify-center border border-line-strong bg-surface transition-colors hover:border-ink ${isCmp ? "bg-ink text-paper" : ""}`}
      >
        <Icon name="compare" />
      </button>
    </>
  );
}

export function AddToProjectButton({ product, size = "md", className = "" }: { product: Product; size?: "sm" | "md" | "lg"; className?: string }) {
  const { locale, dict } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  return (
    <span className={`inline-flex flex-col gap-1 ${className}`}>
      <Button
        size={size}
        icon={done ? "check" : "plus"}
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const { project } = await addProductToProject(product, dict.projects.defaultName);
            setDone(project.name);
            toast(format(dict.configurator.addedFromCatalog, { sku: product.sku }));
          } catch {
            toast(dict.lead.errors.generic, "danger");
          } finally {
            setBusy(false);
          }
        }}
      >
        {done ? dict.common.addedToProject : dict.common.addToProject}
      </Button>
      {done && (
        <Link href={`/${locale}/configurator/`} className="link text-xs text-ink-3">
          {dict.common.openConfigurator} →
        </Link>
      )}
    </span>
  );
}

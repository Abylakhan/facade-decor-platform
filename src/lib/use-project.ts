"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Estimate, Project, Variant } from "@/domain/types";
import { activeVariant } from "@/domain/project";
import { buildEstimate } from "@/domain/calc/estimate";
import { useCatalog } from "./catalog-context";
import { saveProject } from "./project-actions";

/**
 * Single source of truth for an open project: the 3D scene, the specification and
 * the calculator all read the same variant and the same live estimate.
 */
export function useProjectState(initial: Project | null) {
  const { product, prices } = useCatalog();
  const [project, setProject] = useState<Project | null>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const first = useRef(true);

  useEffect(() => setProject(initial), [initial]);

  // autosave (debounced) — browser storage in DEMO mode
  useEffect(() => {
    if (!project) return;
    if (first.current) {
      first.current = false;
      return;
    }
    setStatus("saving");
    const t = setTimeout(() => {
      saveProject(project)
        .then(() => setStatus("saved"))
        .catch(() => setStatus("error"));
    }, 500);
    return () => clearTimeout(t);
  }, [project]);

  const variant: Variant | null = project ? activeVariant(project) : null;
  const estimate: Estimate | null = useMemo(() => (variant ? buildEstimate(variant, product, prices) : null), [variant, product, prices]);

  const updateVariant = useCallback((fn: (v: Variant) => Variant, message?: string) => {
    setProject((p) => {
      if (!p) return p;
      return {
        ...p,
        variants: p.variants.map((v) => {
          if (v.id !== p.activeVariantId) return v;
          const next = fn(v);
          return message ? { ...next, history: [...next.history, { at: new Date().toISOString(), message }].slice(-200) } : next;
        }),
      };
    });
  }, []);

  const updateProject = useCallback((fn: (p: Project) => Project) => setProject((p) => (p ? fn(p) : p)), []);

  return { project, setProject, variant, estimate, updateVariant, updateProject, status };
}

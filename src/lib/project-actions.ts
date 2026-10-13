"use client";
import type { Product, Project, Variant } from "@/domain/types";
import { activeVariant, createProject, createVariant, generateGeometry, typicalHouse } from "@/domain/project";
import { newSelection } from "@/domain/placement-defaults";
import { projectProvider } from "./projects";
import { safeStorage } from "./storage";

const CURRENT = "fd.currentProject";

export async function loadCurrentProject(): Promise<Project | null> {
  const id = safeStorage().getItem(CURRENT);
  if (id) {
    const p = await projectProvider().get(id);
    if (p) return p;
  }
  return (await projectProvider().list())[0] ?? null;
}

export function setCurrentProject(id: string) {
  safeStorage().setItem(CURRENT, id);
}

/** Creates a project on a typical house; the UI flags the typical dimensions. */
export function newTypicalProject(name: string): Project {
  return createProject(name, "private-house", createVariant("A", generateGeometry(typicalHouse)));
}

export async function saveProject(p: Project): Promise<Project> {
  const saved = await projectProvider().save({ ...p, updatedAt: new Date().toISOString() });
  setCurrentProject(saved.id);
  return saved;
}

export function updateActiveVariant(p: Project, fn: (v: Variant) => Variant): Project {
  return { ...p, variants: p.variants.map((v) => (v.id === p.activeVariantId ? fn(v) : v)) };
}

/** Adds a catalog product to the current project's active variant. */
export async function addProductToProject(product: Product, defaultName: string): Promise<{ project: Project; created: boolean }> {
  let project = await loadCurrentProject();
  const created = !project;
  project ??= newTypicalProject(defaultName);
  const v = activeVariant(project);
  const sel = newSelection(product, v.geometry);
  project = updateActiveVariant(project, (x) => ({
    ...x,
    selections: [...x.selections, sel],
    history: [...x.history, { at: new Date().toISOString(), message: `+ ${product.sku}` }],
  }));
  return { project: await saveProject(project), created };
}

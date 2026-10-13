"use client";
import { useCallback, useEffect, useState } from "react";
import { BrowserProjectProvider } from "@/integration/demo/browser-projects";
import type { ProjectProvider } from "@/integration/types";
import type { Project } from "@/domain/types";
import { safeStorage } from "./storage";

let provider: ProjectProvider | null = null;
/** DEMO: projects live in this browser only. Swap for a server provider after CRM integration. */
export function projectProvider(): ProjectProvider {
  provider ??= new BrowserProjectProvider(safeStorage());
  return provider;
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const refresh = useCallback(async () => setProjects(await projectProvider().list()), []);
  useEffect(() => {
    void refresh();
    const h = (e: Event) => {
      if (e instanceof StorageEvent ? e.key === "fd.projects.v1" : (e as CustomEvent).detail === "fd.projects.v1") void refresh();
    };
    window.addEventListener("storage", h);
    window.addEventListener("fd-storage", h);
    return () => {
      window.removeEventListener("storage", h);
      window.removeEventListener("fd-storage", h);
    };
  }, [refresh]);
  return { projects, refresh };
}

/**
 * DEMO project storage in the browser's localStorage.
 * Limits: data stays on this device/browser only, is not synced anywhere, and is
 * lost when site data is cleared. The UI states this explicitly.
 */
import { projectSchema } from "@/domain/schemas";
import type { Project } from "@/domain/types";
import type { ProjectProvider } from "../types";

const KEY = "fd.projects.v1";

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class BrowserProjectProvider implements ProjectProvider {
  readonly storage = "browser" as const;
  constructor(private readonly store: KeyValueStore) {}

  private readAll(): Project[] {
    try {
      const raw = this.store.getItem(KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Drop anything that no longer matches the schema instead of crashing the app.
      return parsed.flatMap((p) => {
        const r = projectSchema.safeParse(p);
        return r.success ? [r.data as Project] : [];
      });
    } catch {
      return [];
    }
  }

  private writeAll(list: Project[]) {
    this.store.setItem(KEY, JSON.stringify(list));
  }

  async list() {
    return this.readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async get(id: string) {
    return this.readAll().find((p) => p.id === id) ?? null;
  }
  async save(project: Project) {
    const valid = projectSchema.parse(project) as Project;
    const all = this.readAll().filter((p) => p.id !== valid.id);
    all.push(valid);
    this.writeAll(all);
    return valid;
  }
  async remove(id: string) {
    this.writeAll(this.readAll().filter((p) => p.id !== id));
  }
}

/** In-memory store for tests and for browsers where storage is blocked. */
export class MemoryStore implements KeyValueStore {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}

/**
 * Runtime validation (zod). Used when loading saved projects, before submitting
 * leads, and by the server-side handlers that will sit in front of the CRM.
 */
import { z } from "zod";

const side = z.enum(["front", "right", "back", "left"]);
const corner = z.enum(["front-right", "right-back", "back-left", "left-front"]);
const pos = z.number().finite().positive();
const nonneg = z.number().finite().nonnegative();

export const openingSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["window", "door"]),
  width: pos,
  height: pos,
  floor: z.number().int().nonnegative(),
  x: nonneg,
  sill: nonneg,
});

export const geometrySchema = z.object({
  length: pos.max(200),
  depth: pos.max(200),
  floors: z.number().int().min(1).max(30),
  floorHeight: pos.max(10),
  plinthHeight: nonneg.max(3),
  roof: z.object({ type: z.enum(["hip", "gable", "flat"]), pitchDeg: z.number().min(0).max(60), overhang: nonneg.max(2) }),
  walls: z.array(z.object({ side, included: z.boolean(), openings: z.array(openingSchema).max(200) })).max(4),
});

const sides = z.array(side).max(4);

export const placementSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.enum(["eaves", "belt", "plinth"]), sides, useCornerElements: z.boolean().optional() }),
  z.object({ kind: z.enum(["window-surround", "door-surround"]), sides, scheme: z.enum(["4", "3", "top"]) }),
  z.object({ kind: z.literal("keystone"), sides, openings: z.enum(["window", "door", "all"]) }),
  z.object({ kind: z.literal("quoins"), corners: z.array(corner).max(4) }),
  z.object({ kind: z.literal("pilaster"), sides, perSide: z.number().int().min(0).max(50) }),
  z.object({ kind: z.literal("column"), count: z.number().int().min(0).max(100), height: pos.max(20).optional() }),
  z.object({ kind: z.literal("brackets"), sides, spacing: pos.max(10) }),
  z.object({ kind: z.literal("manual-length"), length: nonneg.max(10000), label: z.string().max(120).optional() }),
  z.object({ kind: z.literal("manual-count"), count: z.number().int().min(0).max(100000), label: z.string().max(120).optional() }),
  z.object({ kind: z.literal("area"), sides }),
]);

export const selectionSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  enabled: z.boolean(),
  placement: placementSchema,
  wasteOverride: z.number().min(0).max(1).optional(),
});

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const variantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  geometry: geometrySchema,
  selections: z.array(selectionSchema).max(200),
  scene: z.object({
    facadeColor: hex,
    decorColor: hex,
    roofColor: hex,
    wallMaterial: z.enum(["plaster", "stone", "brick", "concrete"]),
    lighting: z.enum(["day", "evening"]),
  }),
  options: z.object({
    package: z.enum(["materials", "delivery", "installation", "turnkey"]),
    deliveryZone: z.enum(["pickup", "city", "region"]),
    distanceKm: nonneg.max(5000).optional(),
  }),
  extras: z.array(z.object({ id: z.string(), label: z.string().max(200), amount: z.number().finite() })).max(100),
  overrides: z.record(z.string(), nonneg),
  history: z.array(z.object({ at: z.string(), message: z.string().max(500) })).max(500),
  snapshot: z.any().optional(),
});

export const projectSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  buildingType: z.enum(["private-house", "cottage", "villa", "commercial", "other"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  activeVariantId: z.string(),
  variants: z.array(variantSchema).min(1).max(20),
});

/* ----------------------------------------------------------------- leads */

export const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES = 5;

/** Phone: digits with optional +, spaces, dashes, brackets; 10–15 digits. */
const phone = z
  .string()
  .trim()
  .regex(/^\+?[\d\s\-()]{10,20}$/, "phone")
  .refine((v) => {
    const n = v.replace(/\D/g, "").length;
    return n >= 10 && n <= 15;
  }, "phone");

export const leadSchema = z.object({
  name: z.string().trim().min(2, "required").max(100),
  phone,
  email: z.union([z.literal(""), z.email("email")]).optional(),
  contactMethod: z.enum(["phone", "whatsapp", "telegram", "email"]),
  region: z.string().trim().max(200).optional(),
  comment: z.string().trim().max(2000).optional(),
  consent: z.literal(true, { error: "consent" }),
  projectId: z.string().optional(),
  variantId: z.string().optional(),
  files: z
    .array(z.object({ name: z.string().max(200), type: z.enum(ALLOWED_FILE_TYPES), size: z.number().int().positive().max(MAX_FILE_BYTES) }))
    .max(MAX_FILES)
    .optional(),
  /** Anti-spam: must stay empty (hidden field). */
  website: z.string().max(0, "spam").optional(),
  /** Anti-spam: ms between form render and submit. */
  elapsedMs: z.number().min(2500, "tooFast"),
  /** Prevents double submission of the same form. */
  idempotencyKey: z.string().min(8).max(100),
});

export type LeadInput = z.infer<typeof leadSchema>;

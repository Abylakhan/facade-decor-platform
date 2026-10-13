/**
 * DEMO PRICE LIST. Fictional prices for development and testing only.
 * Real prices come from the CRM through PricingProvider once access is granted.
 */
import type { PriceList } from "@/domain/types";

export const demoPriceList: PriceList = {
  version: "DEMO-2026.10",
  effectiveFrom: "2026-10-01",
  currency: "KZT",
  source: "demo",
  items: {
    "p-k220": 18500,
    "p-k300": 29900,
    "p-m80": 4900,
    "p-m120": 6900,
    "p-w150": 9800,
    "p-w180k": 13500,
    "p-d200": 14900,
    "p-c300": 189000,
    "p-c250": 149000,
    "p-hc250": 74000,
    "p-p300": 68000,
    "p-p220": 52000,
    "p-rq": 6200,
    "p-rf": 3900,
    "p-ks1": 11500,
    "p-b1": 15800,
    "p-bl": 96000,
    "p-rs1": 24000,
    "p-or1": null,
    "p-pb150": 9200,
    "p-pl200": 11800,
    "p-cr-k220": 16500,
    "p-cr-m80": 3200,
    "p-x": null,
    "p-a-glue": 3400,
    "p-a-seal": 2600,
    "p-a-coat": 38000,
  },
  labour: {
    perMetre: {
      eaves: 3500,
      belt: 2500,
      plinth: 2500,
      "window-surround": 3000,
      "door-surround": 3000,
      "manual-length": 2500,
    },
    perPiece: {
      keystone: 3000,
      quoins: 1800,
      pilaster: 25000,
      column: 45000,
      brackets: 4000,
      "manual-count": 3500,
    },
    perM2: 1500,
  },
  delivery: { pickup: 0, city: 25000, regionBase: 25000, regionPerKm: 350 },
  discounts: [{ id: "demo-volume-5", materialsThreshold: 3_000_000, percent: 5 }],
  turnkeyAvailable: false,
};

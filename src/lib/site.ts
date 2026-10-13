/** Public, non-secret site configuration. Replace placeholders with real company data. */
export const site = {
  /** Placeholder brand name — replace with the company's real name. */
  brand: "Atelier Façade",
  /** Absolute URL of the deployed site (for canonical links / sitemap). */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://abylakhan.github.io/facade-decor-platform").replace(/\/$/, ""),
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  /** Company WhatsApp number in international format without "+", or empty if not provided yet. */
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "",
  /** Data mode shown to visitors. Set at build time by the server config, not by UI. */
  dataMode: (process.env.DATA_SOURCE === "crm" ? "crm" : "demo") as "demo" | "crm",
};

/** Prefixes a public asset path with the deployment base path. */
export const asset = (p: string) => `${site.basePath}${p.startsWith("/") ? p : `/${p}`}`;

export function whatsappLink(text: string): string {
  const base = site.whatsapp ? `https://wa.me/${site.whatsapp}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}

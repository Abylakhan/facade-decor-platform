import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export const dynamic = "force-static";

/** DEMO builds are closed for indexing; production (CRM data) opens them. */
export default function robots(): MetadataRoute.Robots {
  return site.dataMode === "crm"
    ? { rules: { userAgent: "*", allow: "/", disallow: ["/*/projects/", "/*/estimate/", "/*/request-sent/"] }, sitemap: `${site.url}/sitemap.xml` }
    : { rules: { userAgent: "*", disallow: "/" } };
}

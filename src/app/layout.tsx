import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["300", "400", "500"],
  variable: "--font-cormorant",
  display: "swap",
});
const sans = Inter({ subsets: ["latin", "cyrillic", "cyrillic-ext"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.brand, template: `%s — ${site.brand}` },
  // DEMO data must not be indexed as if it were the real catalog.
  robots: site.dataMode === "crm" ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#1b1a18", width: "device-width", initialScale: 1 };

/** Root layout. `lang` is updated per locale on the client by I18nProvider. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n-context";
import { Logo } from "./Logo";

export function Footer() {
  const { locale, dict } = useI18n();
  const pathname = usePathname() ?? "";
  if (pathname.includes("/configurator")) return null;
  const home = /^\/(ru|kk)\/?$/.test(pathname);
  const L = (p: string) => `/${locale}${p}`;
  const cols = [
    [
      [dict.nav.catalog, "/catalog/"],
      [dict.nav.configurator, "/configurator/"],
      [dict.nav.calculator, "/calculator/"],
      [dict.nav.projects, "/projects/"],
      [dict.nav.favorites, "/favorites/"],
      [dict.nav.compare, "/compare/"],
    ],
    [
      [dict.nav.portfolio, "/portfolio/"],
      [dict.nav.services, "/services/"],
      [dict.nav.customDesign, "/custom-design/"],
      [dict.nav.about, "/about/"],
      [dict.nav.articles, "/articles/"],
    ],
    [
      [dict.nav.faq, "/faq/"],
      [dict.nav.contacts, "/contacts/"],
      [dict.nav.privacy, "/privacy/"],
      [dict.ui.designSystem, "/ui/"],
    ],
  ];
  return (
    <footer className={`no-print bg-deep text-white/70 ${home ? "border-t border-white/10" : "mt-24"}`}>
      <div className="container-x grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo light />
          <p className="max-w-xs font-display text-2xl leading-snug text-white">{dict.meta.tagline}</p>
          <p className="max-w-sm text-xs leading-relaxed">{dict.common.demoNotice}</p>
        </div>
        {cols.map((col, i) => (
          <ul key={i} className="space-y-2.5 text-sm">
            {col.map(([label, href]) => (
              <li key={href}>
                <Link href={L(href!)} className="hover:text-white">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-2 py-5 text-xs sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Atelier Façade · {dict.footer.rights}</span>
          <span>{dict.footer.crmNote}</span>
        </div>
      </div>
    </footer>
  );
}

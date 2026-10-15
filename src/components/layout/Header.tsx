"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n-context";
import { useCatalog } from "@/lib/catalog-context";
import { useCompare, useFavorites } from "@/lib/stores";
import { searchProducts } from "@/lib/search";
import { fmtMoney, lt } from "@/i18n";
import { LOCALES } from "@/domain/types";
import { Icon } from "@/components/ui/icons";
import { Badge } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/Modal";
import { Logo } from "./Logo";
import { rememberScroll } from "./ScrollRestore";

export function Header() {
  const { locale, dict } = useI18n();
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const fav = useFavorites();
  const cmp = useCompare();
  const home = pathname === `/${locale}` || pathname === `/${locale}/`;
  const fullscreen = pathname.includes("/configurator");

  useEffect(() => {
    const onScroll = () => {
      const hero = document.querySelector<HTMLElement>("[data-hero]");
      setAtTop(window.scrollY < (hero ? hero.offsetHeight - window.innerHeight * 0.4 : window.innerHeight * 0.6));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);
  useEffect(() => setOpen(false), [pathname]);

  const dark = false; // all heroes are light now
  const L = (p: string) => `/${locale}${p}`;
  const primary = [
    { href: "/catalog/", label: dict.nav.catalog },
    { href: "/configurator/", label: dict.nav.configurator },
    { href: "/calculator/", label: dict.nav.calculator },
    { href: "/portfolio/", label: dict.nav.portfolio },
    { href: "/services/", label: dict.nav.services },
  ];
  const secondary = [
    { href: "/custom-design/", label: dict.nav.customDesign },
    { href: "/about/", label: dict.nav.about },
    { href: "/articles/", label: dict.nav.articles },
    { href: "/faq/", label: dict.nav.faq },
    { href: "/contacts/", label: dict.nav.contacts },
  ];
  const switchTo = (l: string) => pathname.replace(new RegExp(`^/${locale}(?=/|$)`), `/${l}`);
  const router = useRouter();
  const goLocale = (e: React.MouseEvent, l: string) => {
    e.preventDefault();
    if (l === locale) return;
    rememberScroll(pathname);
    // keep query (filters, project id, calculator mode); state lives in session storage
    router.push(switchTo(l) + window.location.search, { scroll: false });
  };
  const isActive = (href: string) => pathname.startsWith(L(href).replace(/\/$/, ""));

  return (
    <>
      <header
        className={`no-print z-50 w-full transition-colors duration-[var(--duration-base)] ${home ? "fixed top-0" : "sticky top-0"} ${
          dark ? "bg-transparent text-white" : "border-b border-line bg-paper/92 text-ink backdrop-blur-md"
        } ${fullscreen ? "!relative" : ""}`}
      >
        <div className={`flex items-center justify-center gap-2 py-1 text-[10px] tracking-[0.18em] uppercase ${dark ? "bg-black/30 text-white/70" : "bg-deep text-white/70"}`}>
          <span className="font-semibold text-sand">DEMO</span>
          <span className="hidden sm:inline">· {dict.common.demoShort}</span>
        </div>
        <div className="container-x flex h-16 items-center gap-6">
          <Link href={L("/")} aria-label={dict.nav.home} className="shrink-0">
            <Logo light={dark} />
          </Link>
          <nav aria-label={dict.nav.menu} className="hidden flex-1 items-center gap-6 xl:flex">
            {primary.map((n) => (
              <Link
                key={n.href}
                href={L(n.href)}
                aria-current={isActive(n.href) ? "page" : undefined}
                className={`u-line text-[13px] tracking-wide transition-opacity duration-300 hover:opacity-100 ${isActive(n.href) ? "opacity-100" : "opacity-70"}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={() => setSearchOpen(true)} className="inline-flex h-10 w-10 items-center justify-center hover:opacity-70" aria-label={dict.nav.search}>
              <Icon name="search" />
            </button>
            <Link href={L("/favorites/")} className="relative hidden h-10 w-10 items-center justify-center hover:opacity-70 sm:inline-flex" aria-label={`${dict.nav.favorites}: ${fav.list.length}`}>
              <Icon name="heart" />
              {fav.list.length > 0 && <span className="absolute top-1.5 right-1 min-w-4 bg-bronze px-1 text-center text-[10px] leading-4 text-white">{fav.list.length}</span>}
            </Link>
            <Link href={L("/compare/")} className="relative hidden h-10 w-10 items-center justify-center hover:opacity-70 sm:inline-flex" aria-label={`${dict.nav.compare}: ${cmp.list.length}`}>
              <Icon name="compare" />
              {cmp.list.length > 0 && <span className="absolute top-1.5 right-1 min-w-4 bg-bronze px-1 text-center text-[10px] leading-4 text-white">{cmp.list.length}</span>}
            </Link>
            <Link href={L("/projects/")} className="hidden h-10 w-10 items-center justify-center hover:opacity-70 sm:inline-flex" aria-label={dict.nav.projects}>
              <Icon name="folder" />
            </Link>
            <div className="ml-2 hidden sm:block" role="group" aria-label={dict.nav.language}>
              <div className="relative flex border border-line-strong p-0.5 text-[11px]">
                <span
                  aria-hidden="true"
                  className="absolute top-0.5 bottom-0.5 left-0.5 bg-ink transition-transform duration-500 ease-[var(--ease-out-expo)]"
                  style={{ width: `calc((100% - 4px) / ${LOCALES.length})`, transform: `translateX(${LOCALES.indexOf(locale) * 100}%)` }}
                />
                {LOCALES.map((l) => (
                  <a
                    key={l}
                    href={switchTo(l)}
                    hrefLang={l}
                    onClick={(e) => goLocale(e, l)}
                    aria-current={l === locale ? "true" : undefined}
                    className={`relative z-10 w-9 py-1 text-center font-medium tracking-widest uppercase transition-colors duration-300 ${l === locale ? "text-paper" : "text-ink-3 hover:text-ink"}`}
                  >
                    {l === "kk" ? "kz" : l}
                  </a>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 w-10 items-center justify-center xl:hidden" aria-label={dict.nav.menu} aria-expanded={open}>
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="no-print fixed inset-0 z-[90] flex xl:hidden" role="dialog" aria-modal="true" aria-label={dict.nav.menu}>
          <div className="absolute inset-0 bg-black/65" onClick={() => setOpen(false)} />
          <nav className="relative ml-auto flex h-full w-[88%] max-w-sm flex-col overflow-auto bg-paper p-6 animate-[toastIn_var(--duration-base)_var(--ease-arch)]">
            <div className="mb-8 flex items-center justify-between">
              <Logo />
              <button type="button" onClick={() => setOpen(false)} className="inline-flex h-10 w-10 items-center justify-center" aria-label={dict.nav.close} autoFocus>
                <Icon name="close" />
              </button>
            </div>
            <ul className="space-y-1">
              {[...primary, { href: "/projects/", label: dict.nav.projects }, { href: "/favorites/", label: dict.nav.favorites }, { href: "/compare/", label: dict.nav.compare }].map((n) => (
                <li key={n.href}>
                  <Link href={L(n.href)} className="block py-2 font-display text-2xl">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="mt-6 space-y-2 border-t border-line pt-6 text-sm text-ink-3">
              {secondary.map((n) => (
                <li key={n.href}>
                  <Link href={L(n.href)}>{n.label}</Link>
                </li>
              ))}
            </ul>
            <div className="mt-auto flex gap-2 pt-8">
              {LOCALES.map((l) => (
                <Link key={l} href={switchTo(l)} onClick={(e) => goLocale(e, l)} className={`border px-3 py-1.5 text-xs uppercase tracking-widest ${l === locale ? "border-ink bg-ink text-paper" : "border-line-strong"}`}>
                  {l === "ru" ? "Русский" : "Қазақша"}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      )}
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale, dict } = useI18n();
  const { products, categories, price } = useCatalog();
  const router = useRouter();
  const [q, setQ] = useState("");
  const results = useMemo(() => (q.trim() ? searchProducts(products, categories, q).slice(0, 8) : []), [q, products, categories]);
  return (
    <Modal open={open} onClose={onClose} title={dict.nav.search} closeLabel={dict.nav.close}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          onClose();
          router.push(`/${locale}/catalog/?q=${encodeURIComponent(q)}`);
        }}
      >
        <label htmlFor="global-search" className="sr-only">
          {dict.nav.search}
        </label>
        <div className="flex border border-ink bg-surface">
          <input id="global-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={dict.nav.searchPlaceholder} className="h-12 flex-1 px-4 text-base outline-none" autoComplete="off" />
          <button type="submit" className="px-4" aria-label={dict.nav.search}>
            <Icon name="arrow" />
          </button>
        </div>
      </form>
      {q.trim() && (
        <ul className="mt-4 divide-y divide-line" aria-live="polite">
          {results.length === 0 && <li className="py-6 text-center text-sm text-ink-3">{dict.catalog.empty}</li>}
          {results.map((p) => (
            <li key={p.id}>
              <Link href={`/${locale}/product/${p.slug}/`} onClick={onClose} className="flex items-center justify-between gap-4 py-3 hover:bg-stone/50">
                <span>
                  <span className="block text-sm">{lt(p.name, locale)}</span>
                  <span className="dim">{p.sku}</span>
                </span>
                <span className="flex items-center gap-2 text-sm text-ink-3">
                  {p.source === "demo" && <Badge tone="demo">DEMO</Badge>}
                  {price(p.id) === null ? dict.common.priceOnRequest : fmtMoney(price(p.id)!, locale)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

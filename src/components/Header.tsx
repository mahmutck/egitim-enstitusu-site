import Link from "next/link";
import Image from "next/image";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";

export default function Header({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const other = lang === "tr" ? "en" : "tr";

  const links = [
    { href: `/${lang}`, label: dict.nav.home },
    { href: `/${lang}/hakkimizda`, label: dict.nav.about },
    { href: `/${lang}/programlar`, label: dict.nav.programs },
    { href: `/${lang}/medya`, label: dict.nav.media },
    { href: `/${lang}/instagram`, label: dict.nav.instagram },
    { href: `/${lang}/iletisim`, label: dict.nav.contact },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-navy-900/10 bg-cream-50/90 backdrop-blur">
      <div className="container-wide flex h-20 items-center justify-between">
        <Link href={`/${lang}`} className="flex items-center gap-3">
          <Image
            src="/images/logo.png"
            alt={dict.brand.name}
            width={44}
            height={44}
            className="h-11 w-auto"
            priority
          />
          <span className="hidden font-display text-lg font-semibold leading-tight text-navy-900 sm:block">
            {dict.brand.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium tracking-wide text-navy-800 transition hover:text-gold-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href={`/${other}`}
            className="rounded-full border border-navy-900/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-navy-800 transition hover:border-gold-500 hover:text-gold-600"
          >
            {other}
          </Link>
          <Link
            href={`/${lang}/iletisim`}
            className="hidden rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-cream-50 transition hover:bg-gold-600 sm:block"
          >
            {dict.nav.cta}
          </Link>
        </div>
      </div>
      <MobileNav lang={lang} links={links} />
    </header>
  );
}

function MobileNav({ lang, links }: { lang: Locale; links: { href: string; label: string }[] }) {
  return (
    <div className="container-wide flex gap-5 overflow-x-auto pb-3 lg:hidden">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="whitespace-nowrap text-sm font-medium text-navy-800"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

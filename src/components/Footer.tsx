import Link from "next/link";
import Image from "next/image";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { instagramUrl, whatsappUrl } from "@/lib/site";

export default function Footer({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);

  const links = [
    { href: `/${lang}/hakkimizda`, label: dict.nav.about },
    { href: `/${lang}/programlar`, label: dict.nav.programs },
    { href: `/${lang}/medya`, label: dict.nav.media },
    { href: `/${lang}/iletisim`, label: dict.nav.contact },
    { href: `/${lang}/gizlilik-politikasi`, label: dict.footer.privacyLink },
  ];

  return (
    <footer className="bg-navy-900 text-cream-100">
      <div className="container-wide grid gap-10 py-16 md:grid-cols-4">
        <div className="md:col-span-2">
          <Image
            src="/images/logo-white.png"
            alt={dict.brand.name}
            width={56}
            height={64}
            className="h-14 w-auto"
          />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-cream-100/80">
            {dict.footer.about}
          </p>
          <p className="mt-4 text-xs uppercase tracking-widest text-gold-400">
            {dict.brand.tagline}
          </p>
        </div>

        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-gold-400">
            {dict.footer.linksTitle}
          </h3>
          <ul className="mt-4 space-y-2 text-sm">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-cream-100/80 transition hover:text-gold-300">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-gold-400">
            {dict.footer.contactTitle}
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-cream-100/80">
            <li>
              <a href={whatsappUrl("Merhaba, eğitim programlarınız hakkında bilgi almak istiyorum.")} className="hover:text-gold-300">
                WhatsApp: +90 505 505 34 20
              </a>
            </li>
            <li>
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-gold-300">
                Instagram: @egitimenstitu
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-cream-100/10">
        <div className="container-wide flex flex-col gap-2 py-6 text-xs text-cream-100/60 md:flex-row md:items-center md:justify-between">
          <p>{dict.footer.disclaimer}</p>
          <p>© {new Date().getFullYear()} {dict.brand.name} — {dict.footer.rights}</p>
        </div>
      </div>
    </footer>
  );
}

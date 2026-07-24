import Link from "next/link";
import Image from "next/image";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { programs } from "@/lib/programs";
import ProgramCard from "@/components/ProgramCard";
import { whatsappUrl } from "@/lib/site";

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = lang as Locale;
  const dict = getDictionary(locale);
  const h = dict.home;

  const trustItems = [h.trustFollowers, h.trustMedia, h.trustExperts, h.trustPrograms];
  const whyItems = [
    { title: h.why1Title, body: h.why1Body },
    { title: h.why2Title, body: h.why2Body },
    { title: h.why3Title, body: h.why3Body },
    { title: h.why4Title, body: h.why4Body },
  ];
  const mediaMessage =
    locale === "tr"
      ? "Merhaba, eğitim programlarınız hakkında bilgi almak istiyorum."
      : "Hello, I would like more information about your programs.";

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-navy-900 text-cream-50">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="container-wide relative grid gap-12 py-24 lg:grid-cols-2 lg:items-center lg:py-32">
          <div>
            <span className="inline-block rounded-full border border-gold-400/40 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-gold-300">
              {h.heroKicker}
            </span>
            <h1 className="font-display mt-6 text-4xl font-semibold leading-tight sm:text-5xl">
              {h.heroTitle}{" "}
              <span className="text-gold-400">{h.heroTitleAccent}</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-cream-100/80">
              {h.heroBody}
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href={`/${locale}/programlar`}
                className="rounded-full bg-gold-500 px-7 py-3.5 text-sm font-semibold text-navy-950 transition hover:bg-gold-400"
              >
                {h.ctaPrimary}
              </Link>
              <a
                href={whatsappUrl(mediaMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-cream-50/30 px-7 py-3.5 text-sm font-semibold text-cream-50 transition hover:border-gold-400 hover:text-gold-300"
              >
                {h.ctaSecondary}
              </a>
            </div>
          </div>
          <div className="relative mx-auto flex w-full max-w-sm items-center justify-center">
            <div className="absolute h-72 w-72 rounded-full bg-gold-500/10 blur-3xl" />
            <div className="relative rounded-3xl border border-cream-50/10 bg-navy-800/60 p-10 backdrop-blur">
              <Image
                src="/images/logo.png"
                alt={dict.brand.name}
                width={260}
                height={300}
                className="mx-auto h-auto w-52"
              />
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="border-b border-navy-900/10 bg-cream-100">
        <div className="container-wide grid grid-cols-2 gap-6 py-8 text-center md:grid-cols-4">
          {trustItems.map((item) => (
            <p key={item} className="text-sm font-semibold text-navy-800">
              {item}
            </p>
          ))}
        </div>
      </section>

      {/* ABOUT PREVIEW */}
      <section className="section-py">
        <div className="container-wide grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="gold-underline text-xs font-semibold uppercase tracking-widest text-gold-600">
              {h.aboutKicker}
            </span>
            <h2 className="font-display mt-6 text-3xl font-semibold text-navy-900 sm:text-4xl">
              {h.aboutTitle}
            </h2>
            <p className="mt-6 text-base leading-relaxed text-navy-800/80">{h.aboutBody}</p>
            <Link
              href={`/${locale}/hakkimizda`}
              className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-navy-900 hover:text-gold-600"
            >
              {h.aboutLink} →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {whyItems.slice(0, 4).map((item) => (
              <div key={item.title} className="rounded-2xl bg-navy-900 p-6 text-cream-50">
                <p className="font-display text-lg font-semibold text-gold-300">{item.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-cream-100/70">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROGRAMS */}
      <section className="section-py bg-cream-100">
        <div className="container-wide">
          <div className="max-w-2xl">
            <span className="gold-underline text-xs font-semibold uppercase tracking-widest text-gold-600">
              {h.programsKicker}
            </span>
            <h2 className="font-display mt-6 text-3xl font-semibold text-navy-900 sm:text-4xl">
              {h.programsTitle}
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {programs.map((program) => (
              <ProgramCard key={program.slug} program={program} lang={locale} ctaLabel={h.programsLink} />
            ))}
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section className="section-py">
        <div className="container-wide">
          <div className="max-w-2xl">
            <span className="gold-underline text-xs font-semibold uppercase tracking-widest text-gold-600">
              {h.whyKicker}
            </span>
            <h2 className="font-display mt-6 text-3xl font-semibold text-navy-900 sm:text-4xl">
              {h.whyTitle}
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {whyItems.map((item) => (
              <div key={item.title} className="rounded-2xl border border-navy-900/10 bg-white p-6">
                <h3 className="font-display text-lg font-semibold text-navy-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-800/75">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MEDIA PREVIEW */}
      <section className="section-py bg-navy-900 text-cream-50">
        <div className="container-wide flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <span className="text-xs font-semibold uppercase tracking-widest text-gold-400">
              {h.mediaKicker}
            </span>
            <h2 className="font-display mt-6 text-3xl font-semibold sm:text-4xl">{h.mediaTitle}</h2>
          </div>
          <Link
            href={`/${locale}/medya`}
            className="inline-flex w-fit items-center gap-1 rounded-full border border-gold-400/40 px-6 py-3 text-sm font-semibold text-gold-300 transition hover:bg-gold-500 hover:text-navy-950"
          >
            {h.mediaLink} →
          </Link>
        </div>
        <div className="container-wide mt-10 grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex aspect-video items-center justify-center rounded-xl border border-cream-50/10 bg-navy-800/60"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10 text-gold-400/70">
                <path d="M8 5v14l11-7Z" />
              </svg>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section-py">
        <div className="container-wide">
          <div className="max-w-2xl">
            <span className="gold-underline text-xs font-semibold uppercase tracking-widest text-gold-600">
              {h.testimonialsKicker}
            </span>
            <h2 className="font-display mt-6 text-3xl font-semibold text-navy-900 sm:text-4xl">
              {h.testimonialsTitle}
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-dashed border-navy-900/20 bg-cream-100 p-6">
                <div className="flex gap-1 text-gold-500">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <svg key={idx} viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1 1 5.8L10 14.9l-5.21 2.62 1-5.8-4.21-4.1 5.82-.85L10 1.5Z" />
                    </svg>
                  ))}
                </div>
                <p className="mt-4 text-sm italic leading-relaxed text-navy-800/70">
                  {h.testimonialsNote}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="bg-gold-500">
        <div className="container-wide flex flex-col items-start gap-6 py-16 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-navy-950 sm:text-3xl">
              {h.ctaBandTitle}
            </h2>
            <p className="mt-2 text-sm text-navy-900/80">{h.ctaBandBody}</p>
          </div>
          <Link
            href={`/${locale}/iletisim`}
            className="whitespace-nowrap rounded-full bg-navy-950 px-7 py-3.5 text-sm font-semibold text-cream-50 transition hover:bg-navy-800"
          >
            {h.ctaBandButton}
          </Link>
        </div>
      </section>
    </>
  );
}

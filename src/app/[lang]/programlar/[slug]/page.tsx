import Link from "next/link";
import { notFound } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { locales } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { programs, getProgram } from "@/lib/programs";
import { whatsappUrl } from "@/lib/site";

export function generateStaticParams() {
  return locales.flatMap((lang) => programs.map((p) => ({ lang, slug: p.slug })));
}

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  const locale = lang as Locale;
  const dict = getDictionary(locale);
  const p = dict.programs;
  const program = getProgram(slug);
  if (!program) notFound();
  const t = program[locale];

  const message =
    locale === "tr"
      ? `Merhaba, "${t.title}" programı hakkında bilgi almak istiyorum.`
      : `Hello, I would like more information about the "${t.title}" program.`;

  return (
    <>
      <section className="bg-navy-900 py-20 text-cream-50">
        <div className="container-wide">
          <Link href={`/${locale}/programlar`} className="text-xs font-semibold uppercase tracking-widest text-gold-400 hover:text-gold-300">
            ← {p.backLink}
          </Link>
          <h1 className="font-display mt-6 max-w-3xl text-4xl font-semibold sm:text-5xl">{t.title}</h1>
          <p className="mt-4 text-lg text-gold-300">{t.tagline}</p>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-cream-100/80">{t.summary}</p>
        </div>
      </section>

      <section className="section-py">
        <div className="container-wide grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-10">
            <div>
              <h2 className="font-display text-xl font-semibold text-navy-900">{p.contentLabel}</h2>
              <ul className="mt-4 space-y-3">
                {t.content.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-navy-800/85">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="font-display text-xl font-semibold text-navy-900">{p.audienceLabel}</h2>
              <ul className="mt-4 space-y-3">
                {t.audience.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-navy-800/85">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-navy-800" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-navy-900/10 bg-cream-100 p-6">
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-gold-600">{p.formatLabel}</dt>
                  <dd className="mt-1 text-navy-800/85">{t.format}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-gold-600">{p.durationLabel}</dt>
                  <dd className="mt-1 text-navy-800/85">{t.duration}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-gold-600">{p.certificateLabel}</dt>
                  <dd className="mt-1 text-navy-800/85">{t.certificate}</dd>
                </div>
              </dl>
              <Link
                href={`/${locale}/iletisim?program=${program.slug}`}
                className="mt-6 block rounded-full bg-navy-900 px-6 py-3.5 text-center text-sm font-semibold text-cream-50 transition hover:bg-gold-600"
              >
                {p.applyButton}
              </Link>
              <a
                href={whatsappUrl(message)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block rounded-full border border-navy-900/15 px-6 py-3.5 text-center text-sm font-semibold text-navy-900 transition hover:border-gold-500 hover:text-gold-600"
              >
                WhatsApp
              </a>
            </div>
          </aside>
        </div>

        <div className="container-wide mt-14 grid gap-6 sm:grid-cols-3">
          {programs
            .filter((other) => other.slug !== program.slug)
            .map((other) => (
              <Link
                key={other.slug}
                href={`/${locale}/programlar/${other.slug}`}
                className="card-hover rounded-2xl border border-navy-900/10 bg-white p-6"
              >
                <p className="font-display text-base font-semibold text-navy-900">{other[locale].title}</p>
                <p className="mt-2 text-xs text-navy-800/70">{other[locale].tagline}</p>
              </Link>
            ))}
        </div>
      </section>
    </>
  );
}

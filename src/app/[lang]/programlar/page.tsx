import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { programs } from "@/lib/programs";
import ProgramCard from "@/components/ProgramCard";

export default async function ProgramsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = lang as Locale;
  const dict = getDictionary(locale);
  const p = dict.programs;

  return (
    <>
      <section className="bg-navy-900 py-20 text-cream-50">
        <div className="container-wide">
          <span className="text-xs font-semibold uppercase tracking-widest text-gold-400">
            {p.kicker}
          </span>
          <h1 className="font-display mt-6 max-w-3xl text-4xl font-semibold sm:text-5xl">
            {p.title}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-cream-100/80">{p.intro}</p>
        </div>
      </section>

      <section className="section-py">
        <div className="container-wide grid gap-6 md:grid-cols-3">
          {programs.map((program) => (
            <ProgramCard key={program.slug} program={program} lang={locale} ctaLabel={dict.home.programsLink} />
          ))}
        </div>
      </section>
    </>
  );
}

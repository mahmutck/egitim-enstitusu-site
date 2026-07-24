import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = lang as Locale;
  const dict = getDictionary(locale);
  const a = dict.about;

  const stats = [
    { value: a.statsFollowers, label: a.statsFollowersLabel },
    { value: a.statsPrograms, label: a.statsProgramsLabel },
    { value: a.statsPosts, label: a.statsPostsLabel },
  ];

  return (
    <>
      <section className="bg-navy-900 py-20 text-cream-50">
        <div className="container-wide">
          <span className="text-xs font-semibold uppercase tracking-widest text-gold-400">
            {a.kicker}
          </span>
          <h1 className="font-display mt-6 max-w-3xl text-4xl font-semibold sm:text-5xl">
            {a.title}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-cream-100/80">{a.intro}</p>
        </div>
      </section>

      <section className="section-py">
        <div className="container-wide grid gap-6 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-navy-900/10 bg-white p-8 text-center">
              <p className="font-display text-4xl font-semibold text-navy-900">{s.value}</p>
              <p className="mt-2 text-sm font-medium uppercase tracking-wide text-gold-600">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="container-wide mt-16 grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-navy-900/10 bg-white p-8">
            <h2 className="font-display text-xl font-semibold text-navy-900">{a.missionTitle}</h2>
            <p className="mt-3 text-sm leading-relaxed text-navy-800/80">{a.missionBody}</p>
          </div>
          <div className="rounded-2xl border border-navy-900/10 bg-white p-8">
            <h2 className="font-display text-xl font-semibold text-navy-900">{a.visionTitle}</h2>
            <p className="mt-3 text-sm leading-relaxed text-navy-800/80">{a.visionBody}</p>
          </div>
        </div>

        <div className="container-wide mt-8">
          <div className="rounded-2xl bg-cream-100 p-8">
            <h2 className="font-display text-xl font-semibold text-navy-900">{a.teamTitle}</h2>
            <p className="mt-3 text-sm leading-relaxed text-navy-800/80">{a.teamBody}</p>
          </div>
        </div>

        <div className="container-wide mt-8">
          <div className="rounded-2xl border-l-4 border-gold-500 bg-navy-900 p-8 text-cream-50">
            <h2 className="font-display text-xl font-semibold text-gold-300">{a.disclaimerTitle}</h2>
            <p className="mt-3 text-sm leading-relaxed text-cream-100/85">{a.disclaimerBody}</p>
          </div>
        </div>
      </section>
    </>
  );
}

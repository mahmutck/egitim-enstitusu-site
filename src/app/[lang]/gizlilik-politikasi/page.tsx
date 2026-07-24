import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = lang as Locale;
  const dict = getDictionary(locale);
  const p = dict.privacy;

  const sections = [
    { title: p.section1Title, body: p.section1Body },
    { title: p.section2Title, body: p.section2Body },
    { title: p.section3Title, body: p.section3Body },
    { title: p.section4Title, body: p.section4Body },
    { title: p.section5Title, body: p.section5Body },
    { title: p.section6Title, body: p.section6Body },
  ];

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
        </div>
      </section>

      <section className="section-py">
        <div className="container-wide max-w-3xl">
          <div className="mb-8 rounded-xl border border-gold-500/40 bg-gold-500/10 p-4 text-sm text-navy-900">
            {p.legalNote}
          </div>
          <p className="text-sm leading-relaxed text-navy-800/85">{p.intro}</p>

          <div className="mt-10 space-y-8">
            {sections.map((s) => (
              <div key={s.title}>
                <h2 className="font-display text-lg font-semibold text-navy-900">{s.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-navy-800/80">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

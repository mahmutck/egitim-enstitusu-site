import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { instagramUrl } from "@/lib/site";

export default async function MediaPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = lang as Locale;
  const dict = getDictionary(locale);
  const m = dict.media;

  const items = [
    m.types.interview,
    m.types.seminar,
    m.types.social,
    m.types.interview,
    m.types.seminar,
    m.types.social,
  ];

  return (
    <>
      <section className="bg-navy-900 py-20 text-cream-50">
        <div className="container-wide">
          <span className="text-xs font-semibold uppercase tracking-widest text-gold-400">
            {m.kicker}
          </span>
          <h1 className="font-display mt-6 max-w-3xl text-4xl font-semibold sm:text-5xl">{m.title}</h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-cream-100/80">{m.intro}</p>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold-500 px-7 py-3.5 text-sm font-semibold text-navy-950 transition hover:bg-gold-400"
          >
            {m.instagramCta}
          </a>
        </div>
      </section>

      <section className="section-py">
        <div className="container-wide">
          <p className="mb-8 text-xs text-navy-800/50">{m.placeholderNote}</p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((label, i) => (
              <div
                key={i}
                className="card-hover overflow-hidden rounded-2xl border border-navy-900/10 bg-white"
              >
                <div className="flex aspect-video items-center justify-center bg-navy-900">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10 text-gold-400/80">
                    <path d="M8 5v14l11-7Z" />
                  </svg>
                </div>
                <div className="p-5">
                  <span className="text-xs font-semibold uppercase tracking-widest text-gold-600">
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { instagramUrl, instagramPosts } from "@/lib/site";
import InstagramEmbedGrid from "@/components/InstagramEmbed";

export default async function InstagramPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = lang as Locale;
  const dict = getDictionary(locale);
  const ig = dict.instagram;
  const about = dict.about;

  return (
    <>
      <section className="bg-navy-900 py-20 text-cream-50">
        <div className="container-wide flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-widest text-gold-400">
              {ig.kicker}
            </span>
            <h1 className="font-display mt-6 text-4xl font-semibold sm:text-5xl">{ig.title}</h1>
            <p className="mt-6 text-base leading-relaxed text-cream-100/80">{ig.intro}</p>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] px-7 py-3.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {ig.followButton}
            </a>
          </div>
          <div className="flex gap-8 rounded-2xl border border-cream-50/10 bg-navy-800/60 px-8 py-6">
            <div className="text-center">
              <p className="font-display text-3xl font-semibold text-gold-300">
                {about.statsFollowers}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wide text-cream-100/70">
                {ig.statsLabel}
              </p>
            </div>
            <div className="text-center">
              <p className="font-display text-3xl font-semibold text-gold-300">
                {about.statsPosts}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wide text-cream-100/70">
                {ig.postsLabel}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-py">
        <div className="container-wide">
          <InstagramEmbedGrid urls={instagramPosts} />
          <div className="mt-12 text-center">
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-semibold text-navy-900 hover:text-gold-600"
            >
              {ig.viewOnInstagram} →
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

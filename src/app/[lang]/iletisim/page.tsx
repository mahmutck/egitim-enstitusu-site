import { Suspense } from "react";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { whatsappUrl, instagramUrl } from "@/lib/site";
import ContactForm from "./ContactForm";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = lang as Locale;
  const dict = getDictionary(locale);
  const c = dict.contact;

  const message =
    locale === "tr"
      ? "Merhaba, eğitim programlarınız hakkında bilgi almak istiyorum."
      : "Hello, I would like more information about your programs.";

  return (
    <>
      <section className="bg-navy-900 py-20 text-cream-50">
        <div className="container-wide">
          <span className="text-xs font-semibold uppercase tracking-widest text-gold-400">
            {c.kicker}
          </span>
          <h1 className="font-display mt-6 max-w-3xl text-4xl font-semibold sm:text-5xl">{c.title}</h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-cream-100/80">{c.intro}</p>
        </div>
      </section>

      <section className="section-py">
        <div className="container-wide grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Suspense fallback={null}>
              <ContactForm locale={locale} strings={c} consent={dict.privacy} />
            </Suspense>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl bg-[#25D366]/10 p-6">
              <h2 className="font-display text-lg font-semibold text-navy-900">{c.whatsappTitle}</h2>
              <p className="mt-2 text-sm leading-relaxed text-navy-800/80">{c.whatsappBody}</p>
              <a
                href={whatsappUrl(message)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {c.whatsappButton}
              </a>
            </div>

            <div className="rounded-2xl bg-gradient-to-tr from-[#feda75]/15 via-[#d62976]/10 to-[#4f5bd5]/15 p-6">
              <h2 className="font-display text-lg font-semibold text-navy-900">{c.instagramTitle}</h2>
              <p className="mt-2 text-sm leading-relaxed text-navy-800/80">{c.instagramBody}</p>
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {c.instagramButton}
              </a>
            </div>

            <div className="rounded-2xl border border-navy-900/10 bg-white p-6">
              <h2 className="font-display text-lg font-semibold text-navy-900">{c.hoursTitle}</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-navy-800/70">{c.hoursWeekday}</dt>
                  <dd className="font-medium text-navy-900">{c.hoursWeekdayTime}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-navy-800/70">{c.hoursWeekend}</dt>
                  <dd className="font-medium text-navy-900">{c.hoursWeekendTime}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-navy-900/10 bg-white p-6">
              <h2 className="font-display text-lg font-semibold text-navy-900">{c.addressTitle}</h2>
              <p className="mt-2 text-sm text-navy-800/60">{c.addressNote}</p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

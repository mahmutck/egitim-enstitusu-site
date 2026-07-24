import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import type { Program } from "@/lib/programs";

const icons: Record<Program["icon"], React.ReactNode> = {
  body: (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="5" r="2.2" />
      <path d="M12 7.2v6M12 13.2 8 21M12 13.2l4 7.8M8.5 10.5 12 12l3.5-1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  mind: (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={1.5}>
      <path
        d="M9 3.5c-2.2 0-4 1.8-4 4 0 .6.1 1.1.3 1.6C4 9.9 3 11.4 3 13c0 2.2 1.8 4 4 4 .3 0 .6 0 .8-.1C8.4 18.7 9.9 20 11.7 20c2.4 0 4.3-1.9 4.3-4.3V7.3C16 5.2 14.3 3.5 12.2 3.5H9Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 8v7M12.5 6.5v10" strokeLinecap="round" />
    </svg>
  ),
  certificate: (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3.5" y="4" width="17" height="12" rx="1.5" />
      <path d="M8 20l4-2.5L16 20l-.8-4.5h-6.4L8 20Z" strokeLinejoin="round" />
      <path d="M7 8h10M7 11h6" strokeLinecap="round" />
    </svg>
  ),
};

export default function ProgramCard({
  program,
  lang,
  ctaLabel,
}: {
  program: Program;
  lang: Locale;
  ctaLabel: string;
}) {
  const t = program[lang];
  return (
    <Link
      href={`/${lang}/programlar/${program.slug}`}
      className="card-hover flex flex-col rounded-2xl border border-navy-900/10 bg-white p-8 shadow-sm"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-900 text-gold-300">
        {icons[program.icon]}
      </div>
      <h3 className="font-display mt-6 text-xl font-semibold text-navy-900">{t.title}</h3>
      <p className="mt-1 text-sm font-medium text-gold-600">{t.tagline}</p>
      <p className="mt-4 text-sm leading-relaxed text-navy-800/80">{t.summary}</p>
      <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-navy-900">
        {ctaLabel}
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path
            fillRule="evenodd"
            d="M10.293 3.293a1 1 0 0 1 1.414 0l5 5a1 1 0 0 1 0 1.414l-5 5a1 1 0 0 1-1.414-1.414L13.586 10H4a1 1 0 1 1 0-2h9.586l-3.293-3.293a1 1 0 0 1 0-1.414Z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    </Link>
  );
}

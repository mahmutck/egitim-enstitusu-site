"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import { programs } from "@/lib/programs";

type ContactStrings = {
  formName: string;
  formEmail: string;
  formPhone: string;
  formProgram: string;
  formProgramDefault: string;
  formMessage: string;
  formSubmit: string;
};

type ConsentStrings = {
  consentLabel: string;
  consentLinkText: string;
  consentSuffix: string;
};

export default function ContactForm({
  locale,
  strings,
  consent,
}: {
  locale: Locale;
  strings: ContactStrings;
  consent: ConsentStrings;
}) {
  const searchParams = useSearchParams();
  const preselect = searchParams.get("program") ?? "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [program, setProgram] = useState(preselect);
  const [message, setMessage] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consentChecked) return;
    const programTitle = programs.find((p) => p.slug === program)?.[locale]?.title ?? program;
    const subject =
      locale === "tr" ? "Web Sitesi Başvuru Formu" : "Website Application Form";
    const body = [
      `${strings.formName}: ${name}`,
      `${strings.formEmail}: ${email}`,
      `${strings.formPhone}: ${phone}`,
      `${strings.formProgram}: ${programTitle}`,
      "",
      message,
    ].join("\n");
    window.location.href = `mailto:info@eenstitu.com?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-navy-900/10 bg-white p-8">
      <div>
        <label className="text-sm font-medium text-navy-900">{strings.formName}</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-navy-900/15 px-4 py-2.5 text-sm outline-none focus:border-gold-500"
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-navy-900">{strings.formEmail}</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-navy-900/15 px-4 py-2.5 text-sm outline-none focus:border-gold-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-navy-900">{strings.formPhone}</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-navy-900/15 px-4 py-2.5 text-sm outline-none focus:border-gold-500"
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-navy-900">{strings.formProgram}</label>
        <select
          value={program}
          onChange={(e) => setProgram(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-navy-900/15 px-4 py-2.5 text-sm outline-none focus:border-gold-500"
        >
          <option value="">{strings.formProgramDefault}</option>
          {programs.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p[locale].title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-navy-900">{strings.formMessage}</label>
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-navy-900/15 px-4 py-2.5 text-sm outline-none focus:border-gold-500"
        />
      </div>
      <label className="flex items-start gap-2.5 text-xs leading-relaxed text-navy-800/80">
        <input
          required
          type="checkbox"
          checked={consentChecked}
          onChange={(e) => setConsentChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 flex-shrink-0 accent-navy-900"
        />
        <span>
          {consent.consentLabel}{" "}
          <Link href={`/${locale}/gizlilik-politikasi`} className="underline hover:text-gold-600">
            {consent.consentLinkText}
          </Link>{" "}
          {consent.consentSuffix}
        </span>
      </label>
      <button
        type="submit"
        disabled={!consentChecked}
        className="w-full rounded-full bg-navy-900 px-6 py-3.5 text-sm font-semibold text-cream-50 transition hover:bg-gold-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {strings.formSubmit}
      </button>
    </form>
  );
}

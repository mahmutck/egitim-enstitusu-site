// Per-record settings for certificates generated from the blank template (public/certificate/template.pdf).
// Shared by the worker (validation), the admin page and the public verification page.

export type CertificateSettings = {
  enabled: boolean;
  /** Turkish body text, up to three lines. */
  tr: string[];
  /** English body text, up to three lines. */
  en: string[];
  /** Date printed under "Date/Tarih", e.g. 14-06-2026. */
  date: string;
  /** Prefix for automatically assigned serial numbers, e.g. HS-ON-. */
  serialPrefix: string;
  /** Next number used when serial numbers are assigned automatically. */
  nextSerial: number;
  /** Serial number per participant (keyed by the participant line exactly as stored). */
  serials: Record<string, string>;
};

export const MAX_LINES = 3;
export const MAX_LINE_LENGTH = 140;

export const DEFAULT_CERTIFICATE_SETTINGS: CertificateSettings = {
  enabled: false,
  tr: [
    "15-22 Mayıs 2026 tarihinde gerçekleştirilen",
    "Hipnosomatik egzersizleri teorik eğitimini başarı ile tamamlayarak,",
    "Hipnosomatik egzersizleri uygulayıcılık belgesini almaya hak kazanmıştır.",
  ],
  en: [
    "This is to certify that the holder has successfully completed the Hypnosomatic Exercises",
    "Training conducted between 15–22 May 2026 and has earned the Hypnosomatic",
    "Exercises Practitioner Certificate.",
  ],
  date: "",
  serialPrefix: "HS-ON-",
  nextSerial: 1,
  serials: {},
};

function text(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function lines(value: unknown) {
  const list = Array.isArray(value) ? value : String(value ?? "").split("\n");
  return list.map((line) => text(line, MAX_LINE_LENGTH)).filter(Boolean).slice(0, MAX_LINES);
}

/** Normalizes untrusted input. When `participants` is given, serials of unknown participants are dropped. */
export function sanitizeCertificateSettings(input: unknown, participants?: string[]): CertificateSettings {
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const allowed = participants ? new Set(participants) : null;
  const serials: Record<string, string> = {};
  if (source.serials && typeof source.serials === "object") {
    for (const [name, serial] of Object.entries(source.serials as Record<string, unknown>)) {
      const clean = text(serial, 40);
      if (clean && (!allowed || allowed.has(name))) serials[name] = clean;
    }
  }
  const next = Number(source.nextSerial);
  return {
    enabled: source.enabled === true,
    tr: lines(source.tr),
    en: lines(source.en),
    date: text(source.date, 40),
    serialPrefix: text(source.serialPrefix, 20),
    nextSerial: Number.isFinite(next) && next >= 0 ? Math.min(Math.floor(next), 999999999) : 1,
    serials,
  };
}

export function parseCertificateSettings(json: string | null | undefined, participants?: string[]) {
  if (!json) return null;
  try { return sanitizeCertificateSettings(JSON.parse(json), participants); } catch { return null; }
}

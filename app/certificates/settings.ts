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
    "{tarih} tarihinde gerçekleştirilen",
    "Hipnosomatik egzersizleri teorik eğitimini başarı ile tamamlayarak,",
    "Hipnosomatik egzersizleri uygulayıcılık belgesini almaya hak kazanmıştır.",
  ],
  en: [
    "This is to certify that the holder has successfully completed the Hypnosomatic Exercises",
    "Training conducted between {date} and has earned the Hypnosomatic",
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

// Training date range (stored per record as YYYY-MM-DD) and its use in certificate text.
const TR_MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Placeholders in certificate text replaced by the record's training date range. */
export const TRAINING_RANGE_TOKENS = { tr: "{tarih}", en: "{date}" } as const;

export type TrainingRange = { tr: string; en: string };

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** "15-22 Mayıs 2026" / "15–22 May 2026"; spans months or years when needed. */
export function formatTrainingRange(start?: string | null, end?: string | null): TrainingRange | null {
  const first = isIsoDate(start) ? start : isIsoDate(end) ? end : null;
  if (!first) return null;
  const last = isIsoDate(end) && end >= first ? end : first;
  const [y1, m1, d1] = first.split("-").map(Number);
  const [y2, m2, d2] = last.split("-").map(Number);
  if (first === last) return { tr: `${d1} ${TR_MONTHS[m1 - 1]} ${y1}`, en: `${d1} ${EN_MONTHS[m1 - 1]} ${y1}` };
  if (y1 === y2 && m1 === m2) return { tr: `${d1}-${d2} ${TR_MONTHS[m1 - 1]} ${y1}`, en: `${d1}–${d2} ${EN_MONTHS[m1 - 1]} ${y1}` };
  if (y1 === y2) return { tr: `${d1} ${TR_MONTHS[m1 - 1]} - ${d2} ${TR_MONTHS[m2 - 1]} ${y1}`, en: `${d1} ${EN_MONTHS[m1 - 1]} – ${d2} ${EN_MONTHS[m2 - 1]} ${y1}` };
  return { tr: `${d1} ${TR_MONTHS[m1 - 1]} ${y1} - ${d2} ${TR_MONTHS[m2 - 1]} ${y2}`, en: `${d1} ${EN_MONTHS[m1 - 1]} ${y1} – ${d2} ${EN_MONTHS[m2 - 1]} ${y2}` };
}

/** Replaces {tarih} / {date} in certificate lines with the formatted training range (empty when no range is set). */
export function applyTrainingRange(lines: string[], range: TrainingRange | null | undefined) {
  return lines.map((line) => line.replaceAll(TRAINING_RANGE_TOKENS.tr, range?.tr ?? "").replaceAll(TRAINING_RANGE_TOKENS.en, range?.en ?? "").replace(/\s+/g, " ").trim());
}

export function usesTrainingRange(settings: Pick<CertificateSettings, "tr" | "en">) {
  return [...settings.tr, ...settings.en].some((line) => line.includes(TRAINING_RANGE_TOKENS.tr) || line.includes(TRAINING_RANGE_TOKENS.en));
}

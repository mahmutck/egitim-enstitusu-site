// Per-record settings for certificates generated from the blank template (public/certificate/template.pdf).
// Shared by the worker (validation), the admin page and the public verification page.

export type CertificateSettings = {
  /** Turkish body text, up to three lines. */
  tr: string[];
  /** English body text, up to three lines. */
  en: string[];
  /** Date printed under "Date/Tarih", e.g. 14-06-2026. Empty: the training end date. */
  date: string;
  /** Prefix for automatically assigned serial numbers, e.g. HS-ON-. */
  serialPrefix: string;
  /** Next number used when serial numbers are assigned automatically. */
  nextSerial: number;
  /** Serial number per participant (keyed by the participant line exactly as stored). */
  serials: Record<string, string>;
  /** Name printed on the certificate when it differs from the list (spelling fixes keep the QR link). */
  names: Record<string, string>;
};

export const MAX_LINES = 3;
export const MAX_LINE_LENGTH = 140;

export const DEFAULT_CERTIFICATE_SETTINGS: CertificateSettings = {
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
  names: {},
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
  const perParticipant = (value: unknown, max: number) => {
    const result: Record<string, string> = {};
    if (value && typeof value === "object") {
      for (const [name, entry] of Object.entries(value as Record<string, unknown>)) {
        const clean = text(entry, max);
        if (clean && (!allowed || allowed.has(name))) result[name] = clean;
      }
    }
    return result;
  };
  const next = Number(source.nextSerial);
  return {
    tr: lines(source.tr),
    en: lines(source.en),
    date: text(source.date, 40),
    serialPrefix: text(source.serialPrefix, 20),
    nextSerial: Number.isFinite(next) && next >= 0 ? Math.min(Math.floor(next), 999999999) : 1,
    serials: perParticipant(source.serials, 40),
    names: perParticipant(source.names, 120),
  };
}

export function parseCertificateSettings(json: string | null | undefined, participants?: string[]) {
  if (!json) return null;
  try { return sanitizeCertificateSettings(JSON.parse(json), participants); } catch { return null; }
}

// Serial numbers. Issued certificates follow "group number + position in the list":
// HS-ON-1910 is the 10th participant of group 19 (record hipnosomatik-00019).

/** Serial written in the participant line itself, e.g. "Banu Acar · Sertifika No: IS-11-025". */
export function listedSerial(line: string) {
  const match = line.match(/(?:sertifika|seri|serial)\s*(?:no|numarası|number)\s*[:：]\s*([^\s·,;]+)/i);
  return match ? match[1].slice(0, 40) : "";
}

/** Serial printed for a participant: a manual entry, else the one written in the list. */
export function participantSerial(settings: Pick<CertificateSettings, "serials">, line: string) {
  return settings.serials[line] || listedSerial(line);
}

/** Group number of a record: "21. Grup …" / "Grup 21" in the title, else the first number in its address (hipnosomatik-00019 → 19). */
export function recordGroupNumber(slug: string, title = "") {
  const inTitle = title.match(/(\d{1,3})\s*\.\s*grup|grup\s*(\d{1,3})/i);
  if (inTitle) return Number(inTitle[1] || inTitle[2]);
  for (const match of slug.matchAll(/\d+/g)) {
    const value = Number(match[0]);
    if (value >= 1 && value <= 999) return value;
  }
  return null;
}

/** First automatic number of a group: group 19 → 1901. Without a group number: 1. */
export function firstSerialOfGroup(group: number | null) {
  return group ? group * 100 + 1 : 1;
}

/**
 * Gives every listed participant without a serial number the next number, in list order, so every
 * certificate carries one. Numbers already given are never changed; new participants continue the count.
 */
export function assignMissingSerials(settings: CertificateSettings, participants: string[], group: number | null) {
  const serials = { ...settings.serials };
  const nothingAssignedYet = Object.keys(settings.serials).length === 0 && settings.nextSerial <= 1;
  let next = nothingAssignedYet ? firstSerialOfGroup(group) : settings.nextSerial;
  let changed = false;
  for (const name of participants) {
    if (serials[name] || listedSerial(name)) continue;
    serials[name] = `${settings.serialPrefix}${next++}`;
    changed = true;
  }
  return { settings: changed ? { ...settings, serials, nextSerial: next } : settings, changed };
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

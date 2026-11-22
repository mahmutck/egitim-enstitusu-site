// Server-side certificate PDF: public/certificate/base.pdf (template + embedded fonts, built by
// certificate-assets/build_base.py) plus one incremental update that redefines the empty overlay
// stream with the participant's name, texts, date, serial number and QR code. Cheap enough for the
// Workers free CPU limit: no PDF parsing, only string building and one concatenation.
import qrcode from "qrcode-generator";
import base from "./certificate-base.json";

export type CertificateInput = {
  name: string;
  serial: string;
  date: string;
  tr: string[];
  en: string[];
  /** Link encoded in the QR code. */
  url: string;
};

type FontKey = keyof typeof base.fonts;
type Rgb = [number, number, number];
type TextItem = { text: string; font: FontKey; size: number; color: Rgb; x: number; y: number; align: "center" | "left"; scaleX: number; maxWidth: number };

export const BASE_PDF_PATH = "/certificate/base.pdf";
const PAGE_HEIGHT = base.page.height;
const GREY: Rgb = [128, 130, 133];
const GOLD: Rgb = [169, 124, 80];
// Positions in points, measured on the original Illustrator certificate (top-left origin).
const QR_BOX = { x: 182.6, y: 432.4, size: 69.2 };

function blockLines(lines: string[], middle: number, spacing: number) {
  const list = lines.map((line) => line.trim()).filter(Boolean).slice(0, 3);
  const first = middle - ((list.length - 1) / 2) * spacing;
  return list.map((text, index) => ({ text, y: first + index * spacing }));
}

function layout(input: CertificateInput): TextItem[] {
  const items: TextItem[] = [
    { text: input.name, font: "name", size: 44, color: GREY, x: 417.25, y: 239.3, align: "center", scaleX: 1, maxWidth: 440 },
    ...blockLines(input.tr, 304.9, 20.1).map((line): TextItem => ({ text: line.text, font: "tr", size: 15.77, color: GREY, x: 425.4, y: line.y, align: "center", scaleX: 0.88, maxWidth: 540 })),
    ...blockLines(input.en, 379.75, 24.45).map((line): TextItem => ({ text: line.text, font: "en", size: 15.7, color: GREY, x: 425.9, y: line.y, align: "center", scaleX: 1, maxWidth: 560 })),
  ];
  if (input.date.trim()) items.push({ text: input.date.trim(), font: "serifBold", size: 15, color: GREY, x: 130, y: 484.2, align: "center", scaleX: 1, maxWidth: 125 });
  if (input.serial.trim()) items.push({ text: input.serial.trim(), font: "serif", size: 15, color: GOLD, x: 169.3, y: 519.5, align: "left", scaleX: 1, maxWidth: 160 });
  return items;
}

const num = (value: number) => (Math.round(value * 1000) / 1000).toString();
const color = ([r, g, b]: Rgb) => `${num(r / 255)} ${num(g / 255)} ${num(b / 255)} rg`;

/** Glyph IDs (Identity-H) and advance width in 1/1000 em for a string. */
function encode(font: FontKey, text: string) {
  const glyphs = base.fonts[font].glyphs as unknown as Record<string, [number, number]>;
  const fallback = glyphs[String("?".codePointAt(0))];
  let hex = "";
  let width = 0;
  for (const char of text) {
    const [gid, advance] = glyphs[String(char.codePointAt(0))] ?? fallback;
    hex += gid.toString(16).padStart(4, "0").toUpperCase();
    width += advance;
  }
  return { hex, width };
}

function qrOperators(url: string) {
  const qr = qrcode(0, "M");
  qr.addData(url, "Byte");
  qr.make();
  const count = qr.getModuleCount();
  const cell = QR_BOX.size / (count + 4); // 2-module quiet zone
  const top = PAGE_HEIGHT - QR_BOX.y;
  const ops = [`q 1 1 1 rg ${num(QR_BOX.x)} ${num(top - QR_BOX.size)} ${num(QR_BOX.size)} ${num(QR_BOX.size)} re f 0 0 0 rg`];
  for (let row = 0; row < count; row++) {
    let start = -1;
    for (let col = 0; col <= count; col++) {
      const dark = col < count && qr.isDark(row, col);
      if (dark && start < 0) start = col;
      if (!dark && start >= 0) {
        ops.push(`${num(QR_BOX.x + (start + 2) * cell)} ${num(top - (row + 3) * cell)} ${num((col - start) * cell + 0.02)} ${num(cell + 0.02)} re`);
        start = -1;
      }
    }
  }
  ops.push("f Q");
  return ops.join("\n");
}

/** PDF operators for the overlay stream. */
export function overlayContent(input: CertificateInput) {
  const ops: string[] = [];
  for (const item of layout(input)) {
    const { hex, width } = encode(item.font, item.text);
    const fullWidth = (width * item.size / 1000) * item.scaleX;
    const size = fullWidth > item.maxWidth ? item.size * (item.maxWidth / fullWidth) : item.size;
    const drawnWidth = (width * size / 1000) * item.scaleX;
    const x = item.align === "center" ? item.x - drawnWidth / 2 : item.x;
    const squeeze = item.scaleX !== 1 ? ` ${num(item.scaleX * 100)} Tz` : "";
    ops.push(`q BT ${base.fonts[item.font].resource} ${num(size)} Tf ${color(item.color)}${squeeze} ${num(x)} ${num(PAGE_HEIGHT - item.y)} Td <${hex}> Tj ET Q`);
  }
  ops.push(qrOperators(input.url));
  return ops.join("\n");
}

/** PDF text string as UTF-16BE hex (handles Turkish characters). */
function pdfText(value: string) {
  let hex = "FEFF";
  for (let i = 0; i < value.length; i++) hex += value.charCodeAt(i).toString(16).padStart(4, "0").toUpperCase();
  return `<${hex}>`;
}

/** Incremental update appended to base.pdf: overlay stream, Info dictionary, xref and trailer. */
export function certificateTail(input: CertificateInput, baseEndsWithNewline = true) {
  const content = overlayContent(input);
  const info = base.size;
  let tail = baseEndsWithNewline ? "" : "\n";
  const overlayOffset = base.length + tail.length;
  tail += `${base.overlay} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`;
  const infoOffset = base.length + tail.length;
  tail += `${info} 0 obj\n<< /Title ${pdfText(`${input.name} - Sertifika`)} /Author ${pdfText("Psikolojik Araştırmalar Enstitüsü")} /Subject ${pdfText(input.url)} /Creator (eenstitu.com) /Producer (eenstitu.com) >>\nendobj\n`;
  const xrefOffset = base.length + tail.length;
  const entry = (offset: number) => `${String(offset).padStart(10, "0")} 00000 n\r\n`;
  const id = base.id ? ` /ID [<${base.id[0]}><${base.id[1]}>]` : "";
  tail += `xref\n${base.overlay} 1\n${entry(overlayOffset)}${info} 1\n${entry(infoOffset)}`;
  tail += `trailer\n<< /Size ${info + 1} /Root ${base.root} /Info ${info} 0 R /Prev ${base.startxref}${id} >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new TextEncoder().encode(tail);
}

/** Full certificate PDF from the base PDF bytes. */
export function buildCertificatePdf(baseBytes: ArrayBuffer, input: CertificateInput) {
  if (baseBytes.byteLength !== base.length) throw new Error("Certificate base PDF does not match worker/certificate-base.json");
  const last = new Uint8Array(baseBytes, baseBytes.byteLength - 1, 1)[0];
  return new Blob([baseBytes, certificateTail(input, last === 0x0a)], { type: "application/pdf" });
}

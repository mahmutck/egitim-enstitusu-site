// Builds participant certificates in the browser from the blank template.
// The same layout feeds two renderers: a canvas preview image and a pdf-lib PDF.
// Coordinates are PDF points measured on the original Illustrator certificate (A4 landscape, top-left origin).

export type CertificateInput = {
  name: string;
  serial: string;
  date: string;
  tr: string[];
  en: string[];
  /** Link encoded in the QR code. */
  url: string;
};

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;

const ASSETS = {
  pdf: "/certificate/template.pdf",
  image: "/certificate/template.jpg",
  fonts: {
    name: { url: "/certificate/fonts/Kalam-Regular.ttf", family: "EenCertName" },
    tr: { url: "/certificate/fonts/Arimo-Italic.ttf", family: "EenCertTr" },
    en: { url: "/certificate/fonts/Alegreya-Italic.ttf", family: "EenCertEn" },
    serif: { url: "/certificate/fonts/CrimsonText-Regular.ttf", family: "EenCertSerif" },
    serifBold: { url: "/certificate/fonts/CrimsonText-Bold.ttf", family: "EenCertSerifBold" },
  },
} as const;

type FontKey = keyof typeof ASSETS.fonts;
type Rgb = [number, number, number];
type TextItem = { text: string; font: FontKey; size: number; color: Rgb; x: number; y: number; align: "center" | "left"; scaleX: number; maxWidth: number };
type QrItem = { x: number; y: number; size: number; modules: boolean[][] };

const GREY: Rgb = [128, 130, 133];
const GOLD: Rgb = [169, 124, 80];
const QR_BOX = { x: 182.6, y: 432.4, size: 69.2 };

function blockLines(lines: string[], middle: number, spacing: number) {
  const list = lines.map((line) => line.trim()).filter(Boolean).slice(0, 3);
  const first = middle - ((list.length - 1) / 2) * spacing;
  return list.map((text, index) => ({ text, y: first + index * spacing }));
}

async function qrModules(url: string) {
  const { default: qrcode } = await import("qrcode-generator");
  const qr = qrcode(0, "M");
  qr.addData(url, "Byte");
  qr.make();
  const count = qr.getModuleCount();
  return Array.from({ length: count }, (_, row) => Array.from({ length: count }, (_, col) => qr.isDark(row, col)));
}

async function layout(input: CertificateInput) {
  const texts: TextItem[] = [
    { text: input.name.split(" · ")[0].trim(), font: "name", size: 44, color: GREY, x: 417.25, y: 239.3, align: "center", scaleX: 1, maxWidth: 440 },
    ...blockLines(input.tr, 304.9, 20.1).map((line) => ({ text: line.text, font: "tr" as const, size: 15.77, color: GREY, x: 425.4, y: line.y, align: "center" as const, scaleX: 0.88, maxWidth: 540 })),
    ...blockLines(input.en, 379.75, 24.45).map((line) => ({ text: line.text, font: "en" as const, size: 15.7, color: GREY, x: 425.9, y: line.y, align: "center" as const, scaleX: 1, maxWidth: 560 })),
  ];
  if (input.date.trim()) texts.push({ text: input.date.trim(), font: "serifBold", size: 15, color: GREY, x: 130, y: 484.2, align: "center", scaleX: 1, maxWidth: 125 });
  if (input.serial.trim()) texts.push({ text: input.serial.trim(), font: "serif", size: 15, color: GOLD, x: 169.3, y: 519.5, align: "left", scaleX: 1, maxWidth: 160 });
  const qr: QrItem = { ...QR_BOX, modules: await qrModules(input.url) };
  return { texts, qr };
}

/** Shrinks the font size so the (horizontally scaled) text fits its maximum width. */
function fitSize(item: TextItem, widthAtSize: number) {
  const width = widthAtSize * item.scaleX;
  return width > item.maxWidth ? item.size * (item.maxWidth / width) : item.size;
}

/** Horizontal runs of dark modules inside a 2-module quiet zone. */
function qrRuns(qr: QrItem) {
  const count = qr.modules.length;
  const cell = qr.size / (count + 4);
  const runs: { x: number; y: number; w: number }[] = [];
  qr.modules.forEach((row, r) => {
    let start = -1;
    row.forEach((dark, c) => {
      if (dark && start < 0) start = c;
      if ((!dark || c === count - 1) && start >= 0) {
        const end = dark ? c + 1 : c;
        runs.push({ x: qr.x + (start + 2) * cell, y: qr.y + (r + 2) * cell, w: (end - start) * cell });
        start = -1;
      }
    });
  });
  return { runs, cell };
}

let fontFaces: Promise<void> | null = null;
function loadFontFaces() {
  fontFaces ??= Promise.all(Object.values(ASSETS.fonts).map(async ({ url, family }) => {
    const face = new FontFace(family, `url(${url})`);
    document.fonts.add(await face.load());
  })).then(() => undefined);
  return fontFaces;
}

let templateImage: Promise<HTMLImageElement> | null = null;
function loadTemplateImage() {
  templateImage ??= new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => { templateImage = null; reject(new Error("Sertifika şablonu yüklenemedi.")); };
    image.src = ASSETS.image;
  });
  return templateImage;
}

/** Renders the certificate as a JPEG for on-screen viewing. */
export async function renderCertificateImage(input: CertificateInput, width = 2000): Promise<Blob> {
  const [image, , { texts, qr }] = await Promise.all([loadTemplateImage(), loadFontFaces(), layout(input)]);
  const scale = width / PAGE_WIDTH;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.round(PAGE_HEIGHT * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Tarayıcı sertifika önizlemesini desteklemiyor.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  for (const item of texts) {
    const family = ASSETS.fonts[item.font].family;
    context.font = `${item.size * scale}px "${family}"`;
    const size = fitSize(item, context.measureText(item.text).width / scale);
    context.font = `${size * scale}px "${family}"`;
    const width = (context.measureText(item.text).width / scale) * item.scaleX;
    const x = item.align === "center" ? item.x - width / 2 : item.x;
    context.save();
    context.fillStyle = `rgb(${item.color.join(",")})`;
    context.translate(x * scale, item.y * scale);
    context.scale(item.scaleX, 1);
    context.fillText(item.text, 0, 0);
    context.restore();
  }

  const { runs, cell } = qrRuns(qr);
  context.fillStyle = "#ffffff";
  context.fillRect(qr.x * scale, qr.y * scale, qr.size * scale, qr.size * scale);
  context.fillStyle = "#000000";
  for (const run of runs) context.fillRect(run.x * scale, run.y * scale, Math.ceil(run.w * scale), Math.ceil(cell * scale));

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Önizleme oluşturulamadı."))), "image/jpeg", 0.9));
}

async function fetchBytes(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Sertifika dosyaları yüklenemedi.");
  return new Uint8Array(await response.arrayBuffer());
}

/** Builds the certificate PDF (vector template + embedded font subsets). */
export async function buildCertificatePdf(input: CertificateInput): Promise<Blob> {
  const [pdfLib, fontkitModule, templateBytes, { texts, qr }] = await Promise.all([
    import("pdf-lib"),
    import("@pdf-lib/fontkit"),
    fetchBytes(ASSETS.pdf),
    layout(input),
  ]);
  const { PDFDocument, rgb, setCharacterSqueeze } = pdfLib;
  const fontkit = (fontkitModule as { default?: unknown }).default ?? fontkitModule;
  const doc = await PDFDocument.load(templateBytes);
  doc.registerFontkit(fontkit as Parameters<typeof doc.registerFontkit>[0]);
  const page = doc.getPage(0);
  const { height: pageHeight } = page.getSize();
  const yOffset = pageHeight - PAGE_HEIGHT;

  const embedded = new Map<FontKey, Awaited<ReturnType<typeof doc.embedFont>>>();
  for (const item of texts) {
    if (!embedded.has(item.font)) embedded.set(item.font, await doc.embedFont(await fetchBytes(ASSETS.fonts[item.font].url), { subset: true }));
  }

  for (const item of texts) {
    const font = embedded.get(item.font)!;
    const size = fitSize(item, font.widthOfTextAtSize(item.text, item.size));
    const width = font.widthOfTextAtSize(item.text, size) * item.scaleX;
    const x = item.align === "center" ? item.x - width / 2 : item.x;
    if (item.scaleX !== 1) page.pushOperators(setCharacterSqueeze(item.scaleX * 100));
    page.drawText(item.text, { x, y: PAGE_HEIGHT - item.y + yOffset, size, font, color: rgb(item.color[0] / 255, item.color[1] / 255, item.color[2] / 255) });
    if (item.scaleX !== 1) page.pushOperators(setCharacterSqueeze(100));
  }

  const { runs, cell } = qrRuns(qr);
  page.drawRectangle({ x: qr.x, y: PAGE_HEIGHT - qr.y - qr.size + yOffset, width: qr.size, height: qr.size, color: rgb(1, 1, 1) });
  for (const run of runs) page.drawRectangle({ x: run.x, y: PAGE_HEIGHT - run.y - cell + yOffset, width: run.w + 0.02, height: cell + 0.02, color: rgb(0, 0, 0) });

  const displayName = input.name.split(" · ")[0].trim();
  doc.setTitle(`${displayName} - Sertifika`);
  doc.setAuthor("Psikolojik Araştırmalar Enstitüsü");
  doc.setSubject(input.url);
  doc.setCreator("eenstitu.com");
  doc.setProducer("eenstitu.com");
  const bytes = await doc.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

export function certificateFileName(name: string) {
  return `${name.split(" · ")[0].trim()} - Sertifika.pdf`;
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Permanent certificate link encoded in the QR code (/sertifika/<token>). */
export function certificateLink(token: string) {
  return `https://eenstitu.com/sertifika/${token}`;
}

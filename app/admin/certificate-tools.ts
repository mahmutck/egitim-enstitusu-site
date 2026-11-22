// Helpers for the admin certificate manager (browser only).

export function displayName(name: string) {
  return name.split(" · ")[0];
}

export function normalizeName(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function fileBaseName(fileName: string) {
  return fileName.replace(/\.pdf$/i, "").replace(/^[0-9a-f]{8}-/i, "");
}

function levenshtein(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

/** Best participant for a PDF file name, or "" when no confident, unique match exists. */
export function matchParticipant(fileName: string, participants: string[]) {
  const file = normalizeName(fileBaseName(fileName));
  if (file.length < 3) return "";
  const scored = participants.map((name) => {
    const person = normalizeName(displayName(name));
    let score = levenshtein(file, person);
    if ((file.length >= 5 && person.includes(file)) || (person.length >= 5 && file.includes(person))) score = Math.min(score, 1);
    return { name, score, limit: Math.max(2, Math.round(person.length * 0.2)) };
  }).filter((item) => item.score <= item.limit).sort((a, b) => a.score - b.score);
  if (!scored.length || (scored[1] && scored[1].score === scored[0].score)) return "";
  return scored[0].name;
}

/** Renders the first PDF page to a JPEG so the certificate can be shown as an image on every device. */
export async function renderPreview(file: File): Promise<Blob | null> {
  try {
    const pdfjs = await import("pdfjs-dist");
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    }
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    try {
      const page = await doc.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(2000 / base.width, 4) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) return null;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    } finally {
      await doc.destroy();
    }
  } catch {
    return null;
  }
}

export function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Stable URL key for a participant line, e.g. "Zeynep Kabaklı" -> "zeynep-kabakli".
// Shared by the worker and the browser so QR links (#key) match on both sides.
export function slugifyName(value: string) {
  return value.toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i").replaceAll("ş", "s").replaceAll("ğ", "g").replaceAll("ü", "u").replaceAll("ö", "o").replaceAll("ç", "c")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 90);
}

export function certificateKey(name: string) {
  return slugifyName(name) || "katilimci";
}

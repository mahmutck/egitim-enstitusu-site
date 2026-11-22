"""Builds the certificate base PDF used by the worker to generate certificates.

    python3 certificate-assets/build_base.py

Input : certificate-assets/template.pdf (blank template made from the original certificate)
        certificate-assets/fonts/*.ttf  (open-license fonts, Latin/Turkish subsets)
Output: public/certificate/base.pdf     (template + embedded fonts + empty overlay stream)
        worker/certificate-base.json    (object numbers, trailer data and glyph metrics)

The worker appends one incremental update per request that redefines the overlay
stream (name, texts, date, serial, QR code). The base PDF must therefore use a
classic xref table, which this script guarantees.
"""
import json, re
from pathlib import Path
import pikepdf
from pikepdf import Array, Dictionary, Name, Stream, String
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
FONTS = {  # key: (file, resource name, italic)
    "name": ("Kalam-Regular.ttf", "/EenName", False),
    "tr": ("Arimo-Italic.ttf", "/EenTr", True),
    "en": ("Alegreya-Italic.ttf", "/EenEn", True),
    "serif": ("CrimsonText-Regular.ttf", "/EenSerif", False),
    "serifBold": ("CrimsonText-Bold.ttf", "/EenSerifBold", False),
}


def to_unicode_cmap(pairs):
    lines = ["/CIDInit /ProcSet findresource begin", "12 dict begin", "begincmap",
             "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def",
             "/CMapName /Adobe-Identity-UCS def", "/CMapType 2 def",
             "1 begincodespacerange", "<0000> <FFFF>", "endcodespacerange"]
    for start in range(0, len(pairs), 100):
        chunk = pairs[start:start + 100]
        lines.append(f"{len(chunk)} beginbfchar")
        lines += [f"<{gid:04X}> <{cp:04X}>" for gid, cp in chunk]
        lines.append("endbfchar")
    lines += ["endcmap", "CMapName currentdict /CMap defineresource pop", "end", "end"]
    return "\n".join(lines).encode()


def embed_font(pdf, path, italic):
    tt = TTFont(path)
    k = 1000 / tt["head"].unitsPerEm
    order = tt.getGlyphOrder()
    hmtx = tt["hmtx"].metrics
    widths = [round(hmtx[name][0] * k) for name in order]
    cmap = {cp: tt.getGlyphID(name) for cp, name in tt.getBestCmap().items() if cp <= 0xFFFF}
    head, hhea, post = tt["head"], tt["hhea"], tt["post"]
    os2 = tt["OS/2"] if "OS/2" in tt else None
    base_name = Name("/" + re.sub(r"[^A-Za-z0-9-]", "", tt["name"].getDebugName(6) or path.stem))
    data = path.read_bytes()
    font_file = Stream(pdf, data)
    font_file.Length1 = len(data)
    descriptor = Dictionary(
        Type=Name.FontDescriptor, FontName=base_name, Flags=32 | (64 if italic else 0),
        FontBBox=Array([round(v * k) for v in (head.xMin, head.yMin, head.xMax, head.yMax)]),
        ItalicAngle=float(post.italicAngle), Ascent=round(hhea.ascent * k), Descent=round(hhea.descent * k),
        CapHeight=round((getattr(os2, "sCapHeight", 0) or hhea.ascent) * k), StemV=80,
        FontFile2=pdf.make_indirect(font_file),
    )
    cid_font = Dictionary(
        Type=Name.Font, Subtype=Name.CIDFontType2, BaseFont=base_name,
        CIDSystemInfo=Dictionary(Registry=String("Adobe"), Ordering=String("Identity"), Supplement=0),
        FontDescriptor=pdf.make_indirect(descriptor), DW=1000, W=Array([0, Array(widths)]), CIDToGIDMap=Name.Identity,
    )
    first_cp = {}  # one Unicode value per glyph; prefer the lowest code point (e.g. "-" over soft hyphen)
    for cp, gid in sorted(cmap.items()):
        first_cp.setdefault(gid, cp)
    to_unicode = Stream(pdf, to_unicode_cmap(sorted(first_cp.items())))
    font = Dictionary(Type=Name.Font, Subtype=Name.Type0, BaseFont=base_name, Encoding=Name("/Identity-H"),
                      DescendantFonts=Array([pdf.make_indirect(cid_font)]), ToUnicode=pdf.make_indirect(to_unicode))
    metrics = {str(cp): [gid, widths[gid]] for cp, gid in sorted(cmap.items())}
    return pdf.make_indirect(font), metrics


def main():
    pdf = pikepdf.open(ROOT / "certificate-assets/template.pdf")
    page = pdf.pages[0]
    resources = page.obj.Resources
    if Name.Font not in resources:
        resources.Font = Dictionary()
    metrics = {}
    for key, (file, resource, italic) in FONTS.items():
        font, glyphs = embed_font(pdf, ROOT / "certificate-assets/fonts" / file, italic)
        resources.Font[resource] = font
        metrics[key] = {"resource": resource, "glyphs": glyphs}

    contents = page.obj.Contents
    original = list(contents) if isinstance(contents, Array) else [contents]
    overlay = pdf.make_indirect(Stream(pdf, b""))
    page.obj.Contents = Array([pdf.make_indirect(Stream(pdf, b"q\n")), *original,
                               pdf.make_indirect(Stream(pdf, b"\nQ\n")), overlay])
    out = ROOT / "public/certificate/base.pdf"
    out.parent.mkdir(parents=True, exist_ok=True)
    pdf.save(out, object_stream_mode=pikepdf.ObjectStreamMode.disable, compress_streams=True,
             stream_decode_level=pikepdf.StreamDecodeLevel.generalized, linearize=False)

    saved = pikepdf.open(out)
    data = out.read_bytes()
    assert b"/Type /XRef" not in data and b"/Type/XRef" not in data, "base PDF must use a classic xref table"
    startxref = int(re.findall(rb"startxref\s+(\d+)\s+%%EOF\s*$", data)[-1])
    trailer = saved.trailer
    overlay_obj = saved.pages[0].obj.Contents[-1].objgen[0]
    meta = {
        "length": len(data),
        "startxref": startxref,
        "size": int(trailer.Size),
        "root": f"{trailer.Root.objgen[0]} {trailer.Root.objgen[1]} R",
        "id": [bytes(v).hex().upper() for v in trailer.ID] if "/ID" in trailer else None,
        "overlay": overlay_obj,
        "page": {"width": float(saved.pages[0].mediabox[2]), "height": float(saved.pages[0].mediabox[3])},
        "fonts": metrics,
    }
    (ROOT / "worker/certificate-base.json").write_text(json.dumps(meta, separators=(",", ":")))
    print(f"base.pdf {len(data)//1024} KB, overlay object {overlay_obj}, size {meta['size']}, startxref {startxref}")


if __name__ == "__main__":
    main()

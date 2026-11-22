"use client";

import { useEffect, useState } from "react";

type CertificateData = {
  name: string;
  serial: string;
  date: string;
  tr: string[];
  en: string[];
  url: string;
  record: { slug: string; title: string };
};

/** The certificate a QR code points to: shown as an image, downloadable as PDF. */
export default function PublicCertificate({ token }: { token: string }) {
  const [certificate, setCertificate] = useState<CertificateData | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    (async () => {
      const response = await fetch(`/api/certificate?token=${encodeURIComponent(token)}`);
      if (!response.ok) { if (!cancelled) setStatus("missing"); return; }
      const data = (await response.json()).certificate as CertificateData;
      if (cancelled) return;
      setCertificate(data);
      setStatus("ready");
      const { renderCertificateImage } = await import("../certificates/generator");
      objectUrl = URL.createObjectURL(await renderCertificateImage(data));
      if (!cancelled) setImage(objectUrl);
    })().catch(() => { if (!cancelled) setStatus((current) => (current === "loading" ? "error" : current)); });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [token]);

  async function download() {
    if (!certificate) return;
    setDownloading(true); setDownloadError("");
    try {
      const { buildCertificatePdf, certificateFileName, downloadBlob } = await import("../certificates/generator");
      downloadBlob(await buildCertificatePdf(certificate), certificateFileName(certificate.name));
    } catch {
      setDownloadError("PDF hazırlanamadı. Lütfen tekrar deneyin.");
    } finally {
      setDownloading(false);
    }
  }

  if (status === "missing" || status === "error") {
    return (
      <section className="certificate-content public-certificate-missing">
        <p className="certificate-note">{status === "missing" ? "Bu sertifika kaydı bulunamadı veya artık geçerli değil. Bilgi için info@eenstitu.com adresine yazabilirsiniz." : "Sertifika şu anda yüklenemedi. Lütfen sayfayı yenileyin."}</p>
      </section>
    );
  }

  const displayName = certificate?.name.split(" · ")[0] || "";

  return (
    <>
      <section className="certificate-hero public-certificate-hero">
        <p className="eyebrow light">Sertifika doğrulama</p>
        <h1>{certificate ? displayName : "Sertifika yükleniyor…"}</h1>
        {certificate && (
          <p className="public-certificate-valid"><span aria-hidden="true">✓</span> Geçerli sertifika · {certificate.record.title}</p>
        )}
      </section>
      <section className="certificate-content public-certificate">
        <div className="public-certificate-frame">
          {image ? <img src={image} alt={`${displayName} adına düzenlenen sertifika`} /> : <p className="certificate-viewer-status">Sertifika hazırlanıyor…</p>}
        </div>
        {certificate && (
          <>
            <dl className="public-certificate-meta">
              <div><dt>Katılımcı</dt><dd>{displayName}</dd></div>
              {certificate.serial && <div><dt>Seri numarası</dt><dd>{certificate.serial}</dd></div>}
              {certificate.date && <div><dt>Veriliş tarihi</dt><dd>{certificate.date}</dd></div>}
            </dl>
            <div className="public-certificate-actions">
              <button type="button" className="button button-gold" onClick={download} disabled={downloading}>{downloading ? "Hazırlanıyor…" : <>PDF indir <span aria-hidden="true">↓</span></>}</button>
              <a className="certificate-viewer-open" href={`/${encodeURIComponent(certificate.record.slug)}`}>Eğitim kaydını görüntüle</a>
            </div>
            {downloadError && <p className="admin-error" role="alert">{downloadError}</p>}
          </>
        )}
      </section>
    </>
  );
}

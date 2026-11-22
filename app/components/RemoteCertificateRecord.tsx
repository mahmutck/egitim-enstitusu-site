"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

type FileCertificate = { key: string; pdf: string; preview: string | null };
type GeneratedCertificate = { key: string; generated: true; serial: string };
type Certificate = FileCertificate | GeneratedCertificate;
type GeneratedTemplate = { tr: string[]; en: string[]; date: string };
type RecordData = {
  slug: string;
  title: string;
  subtitle?: string;
  graduates_json: string;
  note?: string;
  certificate_url?: string;
  certificate_label?: string;
  generated?: GeneratedTemplate | null;
  certificates?: Record<string, Certificate>;
};
type Viewer = { name: string; certificate: Certificate; image: string | null; error: string };

const isGenerated = (certificate: Certificate): certificate is GeneratedCertificate => "generated" in certificate;

function downloadUrl(pdf: string) {
  return `${pdf}${pdf.includes("?") ? "&" : "?"}indir=1`;
}

function displayName(name: string) {
  return name.split(" · ")[0];
}

export default function RemoteCertificateRecord({ slug }: { slug: string }) {
  const [record, setRecord] = useState<RecordData | null>(null);
  const [missing, setMissing] = useState(false);
  const [open, setOpen] = useState<Viewer | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    fetch(`/api/verification?slug=${encodeURIComponent(slug)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setRecord(data.record))
      .catch(() => setMissing(true));
  }, [slug]);

  const inputFor = useCallback(async (name: string, certificate: GeneratedCertificate) => {
    const { verificationUrl } = await import("../certificates/generator");
    const template = record?.generated;
    return { name, serial: certificate.serial, date: template?.date || "", tr: template?.tr || [], en: template?.en || [], url: verificationUrl(record?.slug || slug, certificate.key) };
  }, [record, slug]);

  const show = useCallback((name: string, certificate: Certificate) => {
    setOpen({ name, certificate, image: isGenerated(certificate) ? null : certificate.preview, error: "" });
    history.replaceState(null, "", `#${certificate.key}`);
    if (!isGenerated(certificate)) return;
    (async () => {
      const { renderCertificateImage } = await import("../certificates/generator");
      const blob = await renderCertificateImage(await inputFor(name, certificate));
      const image = URL.createObjectURL(blob);
      setOpen((current) => (current?.certificate.key === certificate.key ? { ...current, image } : (URL.revokeObjectURL(image), current)));
    })().catch(() => setOpen((current) => (current ? { ...current, error: "Sertifika görüntülenemedi. Lütfen sayfayı yenileyip tekrar deneyin." } : current)));
  }, [inputFor]);

  const download = useCallback(async (name: string, certificate: GeneratedCertificate) => {
    setDownloading(certificate.key);
    setDownloadError("");
    try {
      const { buildCertificatePdf, certificateFileName, downloadBlob } = await import("../certificates/generator");
      downloadBlob(await buildCertificatePdf(await inputFor(name, certificate)), certificateFileName(name));
    } catch {
      setDownloadError("PDF hazırlanamadı. Lütfen tekrar deneyin.");
    } finally {
      setDownloading(null);
    }
  }, [inputFor]);

  const close = useCallback(() => dialogRef.current?.close(), []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
  }, [open]);

  // Deep link (QR code): /<kayit>#ad-soyad opens that participant's certificate.
  useEffect(() => {
    const certificates = record?.certificates;
    if (!certificates) return;
    const openFromHash = () => {
      const key = decodeURIComponent(location.hash.slice(1));
      const entry = key ? Object.entries(certificates).find(([, certificate]) => certificate.key === key) : undefined;
      if (entry) show(entry[0], entry[1]);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [record, show]);

  if (missing) return <section className="certificate-content"><p className="certificate-note">Bu sertifika doğrulama kaydı bulunamadı.</p></section>;
  if (!record) return <section className="certificate-content"><p className="certificate-note">Doğrulama kaydı yükleniyor…</p></section>;

  const graduates = JSON.parse(record.graduates_json || "[]") as string[];
  const certificates = record.certificates || {};
  const withCertificates = graduates.filter((name) => certificates[name]).length;

  const downloadControl = (name: string, certificate: Certificate, className: string, label: ReactNode) =>
    isGenerated(certificate) ? (
      <button type="button" className={className} onClick={() => download(name, certificate)} disabled={downloading === certificate.key} aria-label={`${displayName(name)} sertifikasını PDF olarak indir`}>
        {downloading === certificate.key ? "Hazırlanıyor…" : label}
      </button>
    ) : (
      <a className={className} href={downloadUrl(certificate.pdf)} download aria-label={`${displayName(name)} sertifikasını PDF olarak indir`}>{label}</a>
    );

  return (
    <>
      <section className="certificate-hero">
        <p className="eyebrow light">Mezunlarımız · Sertifika Programları</p>
        <h1>{record.title}</h1>
        {record.subtitle && <p>{record.subtitle}</p>}
      </section>
      <section className="certificate-content">
        {graduates.length > 0 && (
          <div className="graduate-record">
            <div className="graduate-record-heading">
              <span>Başarı Kaydı</span>
              <b>{graduates.length} katılımcı</b>
            </div>
            {withCertificates > 0 && <p className="graduate-hint">Sertifikayı görmek için katılımcının adına dokunun.</p>}
            {downloadError && <p className="graduate-hint graduate-error" role="alert">{downloadError}</p>}
            <ol className="graduate-list">
              {graduates.map((name) => {
                const certificate = certificates[name];
                return (
                  <li key={name}>
                    {certificate ? (
                      <>
                        <button type="button" className="graduate-name graduate-link" onClick={() => show(name, certificate)} aria-haspopup="dialog">{name}</button>
                        {downloadControl(name, certificate, "graduate-download", <>PDF <span aria-hidden="true">↓</span></>)}
                      </>
                    ) : (
                      <span className="graduate-name">{name}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        )}
        {record.note && <p className="certificate-note">{record.note}</p>}
        {record.certificate_url && (
          <a className="certificate-file" href={record.certificate_url} target="_blank" rel="noreferrer">
            <span>PDF</span>
            <strong>{record.certificate_label}</strong>
            <b>↗</b>
          </a>
        )}
      </section>

      <dialog
        ref={dialogRef}
        className="certificate-viewer"
        aria-label={open ? `${displayName(open.name)} sertifikası` : "Sertifika"}
        onClose={() => {
          setOpen((current) => { if (current?.image?.startsWith("blob:")) URL.revokeObjectURL(current.image); return null; });
          history.replaceState(null, "", location.pathname + location.search);
        }}
        onClick={(event) => { if (event.target === event.currentTarget) close(); }}
      >
        {open && (
          <div className="certificate-viewer-inner">
            <header>
              <div>
                <span>Sertifika</span>
                <strong>{displayName(open.name)}</strong>
              </div>
              <button type="button" onClick={close} aria-label="Kapat">×</button>
            </header>
            <div className="certificate-viewer-body">
              {open.error ? <p className="certificate-viewer-status">{open.error}</p>
                : open.image ? <img src={open.image} alt={`${displayName(open.name)} adına düzenlenen sertifika`} />
                : isGenerated(open.certificate) ? <p className="certificate-viewer-status">Sertifika hazırlanıyor…</p>
                : <iframe src={`${open.certificate.pdf}#view=FitH`} title={`${displayName(open.name)} sertifikası`} />}
            </div>
            <footer>
              {downloadControl(open.name, open.certificate, "button button-gold", <>PDF indir <span aria-hidden="true">↓</span></>)}
              {!isGenerated(open.certificate) && <a className="certificate-viewer-open" href={open.certificate.pdf} target="_blank" rel="noreferrer">Yeni sekmede aç ↗</a>}
            </footer>
          </div>
        )}
      </dialog>
    </>
  );
}

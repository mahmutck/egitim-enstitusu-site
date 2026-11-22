"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Certificate = { key: string; pdf: string; preview: string | null };
type RecordData = {
  title: string;
  subtitle?: string;
  graduates_json: string;
  note?: string;
  certificate_url?: string;
  certificate_label?: string;
  certificates?: Record<string, Certificate>;
};

function downloadUrl(pdf: string) {
  return `${pdf}${pdf.includes("?") ? "&" : "?"}indir=1`;
}

function displayName(name: string) {
  return name.split(" · ")[0];
}

export default function RemoteCertificateRecord({ slug }: { slug: string }) {
  const [record, setRecord] = useState<RecordData | null>(null);
  const [missing, setMissing] = useState(false);
  const [open, setOpen] = useState<{ name: string; certificate: Certificate } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    fetch(`/api/verification?slug=${encodeURIComponent(slug)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setRecord(data.record))
      .catch(() => setMissing(true));
  }, [slug]);

  const show = useCallback((name: string, certificate: Certificate) => {
    setOpen({ name, certificate });
    history.replaceState(null, "", `#${certificate.key}`);
  }, []);

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  // Open the dialog whenever a certificate is selected.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
  }, [open]);

  // Deep link: /<kayit>#ad-soyad opens that participant's certificate.
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
            <ol className="graduate-list">
              {graduates.map((name) => {
                const certificate = certificates[name];
                return (
                  <li key={name}>
                    {certificate ? (
                      <>
                        <button type="button" className="graduate-name graduate-link" onClick={() => show(name, certificate)} aria-haspopup="dialog">
                          {name}
                        </button>
                        <a className="graduate-download" href={downloadUrl(certificate.pdf)} download aria-label={`${displayName(name)} sertifikasını PDF olarak indir`}>
                          PDF <span aria-hidden="true">↓</span>
                        </a>
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
        onClose={() => { setOpen(null); history.replaceState(null, "", location.pathname + location.search); }}
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
              {open.certificate.preview ? (
                <img src={open.certificate.preview} alt={`${displayName(open.name)} adına düzenlenen sertifika`} />
              ) : (
                <iframe src={`${open.certificate.pdf}#view=FitH`} title={`${displayName(open.name)} sertifikası`} />
              )}
            </div>
            <footer>
              <a className="button button-gold" href={downloadUrl(open.certificate.pdf)} download>PDF indir <span aria-hidden="true">↓</span></a>
              <a className="certificate-viewer-open" href={open.certificate.pdf} target="_blank" rel="noreferrer">Yeni sekmede aç ↗</a>
            </footer>
          </div>
        )}
      </dialog>
    </>
  );
}

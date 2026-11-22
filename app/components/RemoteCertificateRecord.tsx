"use client";

import { useEffect, useState } from "react";
import { certificateKey } from "../certificates/key";

type Certificate = { token: string; url: string };
type RecordData = {
  slug: string;
  /** True when an administrator is signed in; only then are certificate links included. */
  admin?: boolean;
  title: string;
  subtitle?: string;
  graduates_json: string;
  note?: string;
  certificate_url?: string;
  certificate_label?: string;
  certificates?: Record<string, Certificate>;
};

export default function RemoteCertificateRecord({ slug }: { slug: string }) {
  const [record, setRecord] = useState<RecordData | null>(null);
  const [missing, setMissing] = useState(false);
  const [highlighted, setHighlighted] = useState("");

  useEffect(() => {
    fetch(`/api/verification?slug=${encodeURIComponent(slug)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setRecord(data.record))
      .catch(() => setMissing(true));
  }, [slug]);

  // /<kayit>#ad-soyad highlights that participant as registered.
  useEffect(() => {
    if (!record) return;
    const graduates = JSON.parse(record.graduates_json || "[]") as string[];
    const highlight = () => {
      const key = decodeURIComponent(location.hash.slice(1));
      const name = key ? graduates.find((item) => certificateKey(item) === key) : undefined;
      if (!name) return;
      setHighlighted(name);
      requestAnimationFrame(() => document.getElementById(`katilimci-${key}`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
    };
    highlight();
    window.addEventListener("hashchange", highlight);
    return () => window.removeEventListener("hashchange", highlight);
  }, [record]);

  if (missing) return <section className="certificate-content"><p className="certificate-note">Bu sertifika doğrulama kaydı bulunamadı.</p></section>;
  if (!record) return <section className="certificate-content"><p className="certificate-note">Doğrulama kaydı yükleniyor…</p></section>;

  const graduates = JSON.parse(record.graduates_json || "[]") as string[];
  const certificates = record.certificates || {};

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
            {record.admin && <p className="graduate-admin-note">Yönetici görünümü: sertifika bağlantılarını yalnızca yöneticiler görür; ziyaretçiler sadece isim listesini görür.</p>}
            <ol className="graduate-list">
              {graduates.map((name) => {
                const certificate = certificates[name];
                return (
                  <li key={name} id={`katilimci-${certificateKey(name)}`} className={highlighted === name ? "is-highlighted" : undefined}>
                    {certificate ? (
                      <>
                        <a className="graduate-name graduate-link" href={certificate.url} target="_blank" rel="noreferrer">{name}</a>
                        <a className="graduate-download" href={`${certificate.url}?indir=1`} aria-label={`${name} sertifikasını indir`}>PDF <span aria-hidden="true">↓</span></a>
                      </>
                    ) : (
                      <span className="graduate-name">{name}</span>
                    )}
                    {highlighted === name && !certificate && <span className="graduate-verified">✓ Kayıtlı</span>}
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
    </>
  );
}

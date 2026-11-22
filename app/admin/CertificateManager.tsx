"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { displayName, formatSize, matchParticipant, renderPreview } from "./certificate-tools";

export type AdminCertificate = { key: string; pdf: string; preview: string | null; size: number; originalName: string | null };
export type CertificateRecord = { slug: string; title: string; graduates_json: string; certificates?: Record<string, AdminCertificate> };

type Pending = { file: File; name: string };

async function uploadCertificate(slug: string, name: string, file: File) {
  const preview = await renderPreview(file);
  const body = new FormData();
  body.set("slug", slug);
  body.set("name", name);
  body.set("pdf", file, file.name);
  if (preview) body.set("preview", preview, "preview.jpg");
  const response = await fetch("/api/admin/certificates", { method: "POST", body });
  const data = await response.json().catch(() => ({})) as { ok?: boolean; message?: string };
  if (!response.ok || !data.ok) throw new Error(data.message || "Yükleme tamamlanamadı.");
}

export default function CertificateManager({ record, storageReady, onChanged }: { record: CertificateRecord; storageReady: boolean; onChanged: () => Promise<void> }) {
  const graduates = useMemo(() => JSON.parse(record.graduates_json || "[]") as string[], [record.graduates_json]);
  const certificates = record.certificates || {};
  const uploaded = graduates.filter((name) => certificates[name]).length;
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const duplicates = useMemo(() => {
    const seen = new Set<string>(); const repeated = new Set<string>();
    for (const item of pending) if (item.name) { if (seen.has(item.name)) repeated.add(item.name); seen.add(item.name); }
    return repeated;
  }, [pending]);

  async function uploadOne(name: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(name); setError(""); setMessage("");
    try {
      await uploadCertificate(record.slug, name, file);
      await onChanged();
      setMessage(`${displayName(name)} için sertifika yüklendi.`);
    } catch (x) {
      setError(x instanceof Error ? x.message : "Yükleme tamamlanamadı.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(name: string) {
    if (!window.confirm(`${displayName(name)} adlı katılımcının sertifikası kaldırılsın mı?`)) return;
    setBusy(name); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/certificates", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: record.slug, name }) });
      const data = await response.json().catch(() => ({})) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) throw new Error(data.message || "Sertifika kaldırılamadı.");
      await onChanged();
      setMessage(`${displayName(name)} için sertifika kaldırıldı.`);
    } catch (x) {
      setError(x instanceof Error ? x.message : "Sertifika kaldırılamadı.");
    } finally {
      setBusy(null);
    }
  }

  function chooseBulk(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).filter((file) => /\.pdf$/i.test(file.name) || file.type === "application/pdf");
    event.target.value = "";
    setError(""); setMessage("");
    setPending(files.map((file) => ({ file, name: matchParticipant(file.name, graduates) })));
  }

  async function uploadBulk() {
    const items = pending.filter((item) => item.name);
    setBusy("bulk"); setError(""); setMessage("");
    const failed: string[] = [];
    for (let index = 0; index < items.length; index++) {
      setMessage(`Yükleniyor ${index + 1} / ${items.length}: ${displayName(items[index].name)}`);
      try { await uploadCertificate(record.slug, items[index].name, items[index].file); }
      catch (x) { failed.push(`${items[index].file.name}: ${x instanceof Error ? x.message : "hata"}`); }
    }
    await onChanged();
    setPending([]);
    setBusy(null);
    setMessage(`${items.length - failed.length} sertifika yüklendi.`);
    if (failed.length) setError(`Yüklenemeyenler: ${failed.join(" · ")}`);
  }

  return (
    <section className="admin-card certificate-manager" id="sertifikalar">
      <header className="certificate-manager-head">
        <div>
          <p className="eyebrow">Sertifika dosyaları</p>
          <h2>{record.title}</h2>
          <p>{uploaded} / {graduates.length} katılımcının sertifikası yüklü. Katılımcı listesini değiştirdiyseniz önce kaydedin.</p>
        </div>
        <div className="certificate-manager-actions">
          <a href={`/${encodeURIComponent(record.slug)}`} target="_blank" rel="noreferrer">Sayfayı aç ↗</a>
          <label className={`button button-gold${!storageReady || busy ? " is-disabled" : ""}`}>
            Toplu PDF yükle
            <input type="file" accept="application/pdf,.pdf" multiple onChange={chooseBulk} disabled={!storageReady || Boolean(busy)} hidden />
          </label>
        </div>
      </header>

      {!storageReady && <p className="admin-error">Sertifika deposu bağlı değil. Yükleme yapılamaz.</p>}

      {pending.length > 0 && (
        <div className="certificate-bulk">
          <h3>Dosyaları katılımcılarla eşleştirin</h3>
          <p>Dosya adlarına göre otomatik eşleştirildi. Yanlış olanları düzeltin; boş bırakılan dosyalar yüklenmez.</p>
          <ul>
            {pending.map((item, index) => (
              <li key={`${item.file.name}-${index}`}>
                <span title={item.file.name}>{item.file.name}</span>
                <select value={item.name} onChange={(event) => setPending(pending.map((entry, i) => i === index ? { ...entry, name: event.target.value } : entry))} aria-label={`${item.file.name} için katılımcı`}>
                  <option value="">— Yükleme —</option>
                  {graduates.map((name) => <option key={name} value={name}>{name}{certificates[name] ? " (değiştirilecek)" : ""}</option>)}
                </select>
                {duplicates.has(item.name) && <b>Aynı kişi birden fazla seçili</b>}
              </li>
            ))}
          </ul>
          <div className="certificate-bulk-actions">
            <button type="button" className="button button-gold" onClick={uploadBulk} disabled={Boolean(busy) || duplicates.size > 0 || !pending.some((item) => item.name)}>
              {busy === "bulk" ? "Yükleniyor…" : `${pending.filter((item) => item.name).length} sertifikayı yükle`}
            </button>
            <button type="button" className="admin-forgot" onClick={() => setPending([])} disabled={busy === "bulk"}>Vazgeç</button>
          </div>
        </div>
      )}

      {message && <p className="admin-success" role="status">{message}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}

      <ol className="certificate-rows">
        {graduates.map((name) => {
          const certificate = certificates[name];
          return (
            <li key={name}>
              <div>
                <b>{name}</b>
                <small>{certificate ? `Yüklü · ${formatSize(certificate.size)}${certificate.preview ? "" : " · önizleme yok"}` : "Sertifika yok"}</small>
              </div>
              <div className="certificate-row-actions">
                {busy === name ? <span>İşleniyor…</span> : (
                  <>
                    {certificate && <a href={certificate.pdf} target="_blank" rel="noreferrer">Görüntüle</a>}
                    <label className={!storageReady || busy ? "is-disabled" : ""}>
                      {certificate ? "Değiştir" : "PDF yükle"}
                      <input type="file" accept="application/pdf,.pdf" onChange={(event) => uploadOne(name, event)} disabled={!storageReady || Boolean(busy)} hidden />
                    </label>
                    {certificate && <button type="button" onClick={() => remove(name)} disabled={Boolean(busy)}>Kaldır</button>}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

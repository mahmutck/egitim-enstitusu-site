"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { displayName, formatSize, matchParticipant, renderPreview } from "./certificate-tools";
import { CertificateSettings, DEFAULT_CERTIFICATE_SETTINGS, MAX_LINES } from "../certificates/settings";

export type AdminCertificate = { key: string; pdf: string; preview: string | null; size: number; originalName: string | null };
export type CertificateRecord = { slug: string; title: string; graduates_json: string; certificates?: Record<string, AdminCertificate>; certificate_settings?: CertificateSettings | null; participant_keys?: Record<string, string> };

function today() {
  const parts = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Istanbul" }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("day")}-${get("month")}-${get("year")}`;
}

function initialSettings(record: CertificateRecord): CertificateSettings {
  return record.certificate_settings ?? { ...DEFAULT_CERTIFICATE_SETTINGS, date: today(), serials: {} };
}

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
  const [settings, setSettings] = useState<CertificateSettings>(() => initialSettings(record));
  const [preview, setPreview] = useState<{ name: string; image: string | null; error: string } | null>(null);
  const previewRef = useRef<HTMLDialogElement>(null);
  // Re-sync the form when another record is selected or the saved settings change.
  const savedSettings = JSON.stringify(record.certificate_settings ?? null);
  const [syncedFrom, setSyncedFrom] = useState(`${record.slug}|${savedSettings}`);
  if (syncedFrom !== `${record.slug}|${savedSettings}`) {
    setSyncedFrom(`${record.slug}|${savedSettings}`);
    setSettings(initialSettings(record));
  }
  const dirty = JSON.stringify(settings) !== JSON.stringify(record.certificate_settings ?? initialSettings(record)) || !record.certificate_settings;
  const serialDuplicates = useMemo(() => {
    const counts = new Map<string, number>();
    for (const name of graduates) { const serial = settings.serials[name]; if (serial) counts.set(serial, (counts.get(serial) || 0) + 1); }
    return new Set([...counts].filter(([, count]) => count > 1).map(([serial]) => serial));
  }, [graduates, settings.serials]);
  const generatedCount = settings.enabled ? graduates.filter((name) => !certificates[name]).length : 0;

  function updateSettings(patch: Partial<CertificateSettings>) { setSettings((current) => ({ ...current, ...patch })); }
  function setSerial(name: string, serial: string) { setSettings((current) => ({ ...current, serials: { ...current.serials, [name]: serial } })); }

  function assignSerials() {
    setSettings((current) => {
      const serials = { ...current.serials }; let next = current.nextSerial;
      for (const name of graduates) if (!serials[name]?.trim()) serials[name] = `${current.serialPrefix}${next++}`;
      return { ...current, serials, nextSerial: next };
    });
  }

  async function saveSettings() {
    setBusy("settings"); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/certificate-settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: record.slug, settings }) });
      const data = await response.json().catch(() => ({})) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) throw new Error(data.message || "Ayarlar kaydedilemedi.");
      await onChanged();
      setMessage(settings.enabled ? "Sertifika ayarları kaydedildi. Doğrulama sayfasında sertifikalar şablondan üretiliyor." : "Sertifika ayarları kaydedildi (üretim kapalı).");
    } catch (x) {
      setError(x instanceof Error ? x.message : "Ayarlar kaydedilemedi.");
    } finally {
      setBusy(null);
    }
  }

  async function showPreview(name: string) {
    setPreview({ name, image: null, error: "" });
    requestAnimationFrame(() => previewRef.current?.showModal());
    try {
      const { renderCertificateImage, verificationUrl } = await import("../certificates/generator");
      const key = record.participant_keys?.[name] || "";
      const blob = await renderCertificateImage({ name, serial: settings.serials[name] || "", date: settings.date, tr: settings.tr, en: settings.en, url: verificationUrl(record.slug, key) });
      const image = URL.createObjectURL(blob);
      setPreview((current) => (current?.name === name ? { ...current, image } : (URL.revokeObjectURL(image), current)));
    } catch {
      setPreview((current) => (current ? { ...current, error: "Önizleme oluşturulamadı." } : current));
    }
  }

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

      <div className="certificate-template">
        <label className="certificate-toggle">
          <input type="checkbox" checked={settings.enabled} onChange={(event) => updateSettings({ enabled: event.target.checked })} />
          <span><b>Sertifikaları şablondan üret</b><small>Ad, tarih, seri no ve kişiye özel QR kod otomatik yerleşir. PDF yüklenmiş katılımcılarda yüklenen dosya gösterilir.</small></span>
        </label>
        <div className="admin-form certificate-template-form">
          <label className="wide">Türkçe metin <small>En fazla {MAX_LINES} satır; her satır sertifikada ayrı satır olur</small>
            <textarea rows={3} value={settings.tr.join("\n")} onChange={(event) => updateSettings({ tr: event.target.value.split("\n").slice(0, MAX_LINES) })} />
          </label>
          <label className="wide">İngilizce metin <small>En fazla {MAX_LINES} satır</small>
            <textarea rows={3} value={settings.en.join("\n")} onChange={(event) => updateSettings({ en: event.target.value.split("\n").slice(0, MAX_LINES) })} />
          </label>
          <label>Tarih <small>Date/Tarih altındaki tarih</small><input value={settings.date} onChange={(event) => updateSettings({ date: event.target.value })} placeholder="14-06-2026" /></label>
          <label>Seri no öneki ve sıradaki numara
            <span className="certificate-serial-start">
              <input value={settings.serialPrefix} onChange={(event) => updateSettings({ serialPrefix: event.target.value })} placeholder="HS-ON-" aria-label="Seri no öneki" />
              <input type="number" min={0} value={settings.nextSerial} onChange={(event) => updateSettings({ nextSerial: Number(event.target.value) || 0 })} aria-label="Sıradaki numara" />
            </span>
          </label>
        </div>
        <div className="certificate-template-actions">
          <button type="button" className="button button-gold" onClick={saveSettings} disabled={Boolean(busy)}>{busy === "settings" ? "Kaydediliyor…" : "Ayarları kaydet"}</button>
          <button type="button" className="admin-forgot" onClick={assignSerials} disabled={Boolean(busy)}>Boş seri numaralarını doldur</button>
          {graduates[0] && <button type="button" className="admin-forgot" onClick={() => showPreview(graduates[0])}>Önizle</button>}
          {dirty && <span className="certificate-dirty">Kaydedilmemiş değişiklik var</span>}
        </div>
        {serialDuplicates.size > 0 && <p className="admin-error">Aynı seri numarası birden fazla kişide: {[...serialDuplicates].join(", ")}</p>}
        {settings.enabled && <p className="certificate-template-note">{generatedCount} katılımcının sertifikası şablondan üretilecek.</p>}
      </div>

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
                <small>{certificate ? `Yüklü PDF · ${formatSize(certificate.size)}${certificate.preview ? "" : " · önizleme yok"}` : settings.enabled ? "Şablondan üretilecek" : "Sertifika yok"}</small>
                {settings.enabled && !certificate && (
                  <span className="certificate-row-serial">
                    <input value={settings.serials[name] || ""} onChange={(event) => setSerial(name, event.target.value)} placeholder="Seri no" aria-label={`${displayName(name)} seri numarası`} className={serialDuplicates.has(settings.serials[name] || "") ? "is-invalid" : ""} />
                    <button type="button" onClick={() => showPreview(name)}>Önizle</button>
                  </span>
                )}
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

      <dialog ref={previewRef} className="certificate-viewer" onClose={() => setPreview((current) => { if (current?.image) URL.revokeObjectURL(current.image); return null; })} onClick={(event) => { if (event.target === event.currentTarget) previewRef.current?.close(); }}>
        {preview && (
          <div className="certificate-viewer-inner">
            <header>
              <div><span>Önizleme · kaydedilmemiş ayarlarla</span><strong>{displayName(preview.name)}</strong></div>
              <button type="button" onClick={() => previewRef.current?.close()} aria-label="Kapat">×</button>
            </header>
            <div className="certificate-viewer-body">
              {preview.error ? <p className="certificate-viewer-status">{preview.error}</p> : preview.image ? <img src={preview.image} alt="Sertifika önizlemesi" /> : <p className="certificate-viewer-status">Önizleme hazırlanıyor…</p>}
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}

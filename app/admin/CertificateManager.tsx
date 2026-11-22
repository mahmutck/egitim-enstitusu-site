"use client";

import { useMemo, useRef, useState } from "react";
import { displayName } from "./certificate-tools";
import { applyTrainingRange, CertificateSettings, DEFAULT_CERTIFICATE_SETTINGS, MAX_LINES, TrainingRange, usesTrainingRange } from "../certificates/settings";

export type AdminCertificate = { key: string; pdf: string; preview: string | null; size: number; originalName: string | null };
export type CertificateRecord = {
  slug: string;
  title: string;
  graduates_json: string;
  /** Previously uploaded PDFs (legacy); they take precedence over generated certificates. */
  certificates?: Record<string, AdminCertificate>;
  certificate_settings?: CertificateSettings | null;
  participant_keys?: Record<string, string>;
  /** Permanent certificate link token per participant (QR code target). */
  certificate_links?: Record<string, string>;
  training_range?: TrainingRange | null;
};

function today() {
  const parts = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Istanbul" }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("day")}-${get("month")}-${get("year")}`;
}

function initialSettings(record: CertificateRecord): CertificateSettings {
  return record.certificate_settings ?? { ...DEFAULT_CERTIFICATE_SETTINGS, date: today(), serials: {} };
}

export default function CertificateManager({ record, onChanged }: { record: CertificateRecord; onChanged: () => Promise<void> }) {
  const graduates = useMemo(() => JSON.parse(record.graduates_json || "[]") as string[], [record.graduates_json]);
  const uploaded = record.certificates || {};
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<CertificateSettings>(() => initialSettings(record));
  const [viewer, setViewer] = useState<{ name: string; image: string | null; error: string } | null>(null);
  const viewerRef = useRef<HTMLDialogElement>(null);

  // Re-sync the form when another record is selected or the saved settings change.
  const savedSettings = JSON.stringify(record.certificate_settings ?? null);
  const [syncedFrom, setSyncedFrom] = useState(`${record.slug}|${savedSettings}`);
  if (syncedFrom !== `${record.slug}|${savedSettings}`) {
    setSyncedFrom(`${record.slug}|${savedSettings}`);
    setSettings(initialSettings(record));
  }

  const dirty = !record.certificate_settings || JSON.stringify(settings) !== savedSettings;
  const serialDuplicates = useMemo(() => {
    const counts = new Map<string, number>();
    for (const name of graduates) { const serial = settings.serials[name]; if (serial) counts.set(serial, (counts.get(serial) || 0) + 1); }
    return new Set([...counts].filter(([, count]) => count > 1).map(([serial]) => serial));
  }, [graduates, settings.serials]);
  const available = (name: string) => Boolean(uploaded[name]) || settings.enabled;

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
      setMessage(settings.enabled ? "Sertifika ayarları kaydedildi." : "Sertifika ayarları kaydedildi (üretim kapalı).");
    } catch (x) {
      setError(x instanceof Error ? x.message : "Ayarlar kaydedilemedi.");
    } finally {
      setBusy(null);
    }
  }

  async function certificateInput(name: string) {
    const { certificateLink } = await import("../certificates/generator");
    return { name, serial: settings.serials[name] || "", date: settings.date, tr: applyTrainingRange(settings.tr, record.training_range), en: applyTrainingRange(settings.en, record.training_range), url: certificateLink(record.certificate_links?.[name] || "") };
  }

  async function view(name: string) {
    const file = uploaded[name];
    if (file && !file.preview) { window.open(file.pdf, "_blank", "noopener"); return; }
    setViewer({ name, image: file?.preview || null, error: "" });
    requestAnimationFrame(() => viewerRef.current?.showModal());
    if (file) return;
    try {
      const { renderCertificateImage } = await import("../certificates/generator");
      const image = URL.createObjectURL(await renderCertificateImage(await certificateInput(name)));
      setViewer((current) => (current?.name === name ? { ...current, image } : (URL.revokeObjectURL(image), current)));
    } catch {
      setViewer((current) => (current ? { ...current, error: "Sertifika görüntülenemedi." } : current));
    }
  }

  async function copyLink(name: string) {
    const token = record.certificate_links?.[name];
    if (!token) return;
    const url = `https://eenstitu.com/sertifika/${token}`;
    try { await navigator.clipboard.writeText(url); setMessage(`${displayName(name)} için sertifika linki kopyalandı: ${url}`); }
    catch { setMessage(`${displayName(name)} için sertifika linki: ${url}`); }
  }

  async function download(name: string) {
    const file = uploaded[name];
    setBusy(name); setError("");
    try {
      const { buildCertificatePdf, certificateFileName, downloadBlob } = await import("../certificates/generator");
      if (file) {
        const response = await fetch(`${file.pdf}&indir=1`);
        if (!response.ok) throw new Error();
        downloadBlob(await response.blob(), certificateFileName(name));
      } else {
        downloadBlob(await buildCertificatePdf(await certificateInput(name)), certificateFileName(name));
      }
    } catch {
      setError(`${displayName(name)} için PDF hazırlanamadı.`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="admin-card certificate-manager" id="sertifikalar">
      <header className="certificate-manager-head">
        <div>
          <p className="eyebrow">Sertifikalar</p>
          <h2>{record.title}</h2>
          <p>Grup sayfasını ziyaret edenler sadece isim listesini görür. Bir sertifikayı yalnızca yöneticiler ve o sertifikanın karekodunu/linkini bilen kişi görebilir.</p>
        </div>
        <div className="certificate-manager-actions">
          <a href={`/${encodeURIComponent(record.slug)}`} target="_blank" rel="noreferrer">Sayfayı aç ↗</a>
        </div>
      </header>

      <div className="certificate-template">
        <label className="certificate-toggle">
          <input type="checkbox" checked={settings.enabled} onChange={(event) => updateSettings({ enabled: event.target.checked })} />
          <span><b>Sertifikaları şablondan üret</b><small>Ad, tarih, seri no ve karekod otomatik yerleşir. Karekod her katılımcının kalıcı sertifika linkine gider; okutan kişi sertifikayı doğrudan görür. Sertifikalar kaydedilmez, her açılışta yeniden üretilir.</small></span>
        </label>
        <div className="admin-form certificate-template-form">
          <p className="wide certificate-token-hint">Metinde <code>{"{tarih}"}</code> yazan yere Türkçe, <code>{"{date}"}</code> yazan yere İngilizce eğitim tarih aralığı gelir{record.training_range ? <>: <b>{record.training_range.tr}</b> / <b>{record.training_range.en}</b></> : "."}</p>
          {usesTrainingRange(settings) && !record.training_range && <p className="wide admin-error">Bu kayıtta eğitim tarih aralığı seçilmemiş. Yukarıdaki kayıt formundan aralığı seçip kaydedin.</p>}
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
          {dirty && <span className="certificate-dirty">Kaydedilmemiş değişiklik var</span>}
        </div>
        {serialDuplicates.size > 0 && <p className="admin-error">Aynı seri numarası birden fazla kişide: {[...serialDuplicates].join(", ")}</p>}
      </div>

      {message && <p className="admin-success" role="status">{message}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}

      <ol className="certificate-rows">
        {graduates.map((name) => (
          <li key={name}>
            <div>
              <b>{name}</b>
              {uploaded[name] ? <small>Yüklenmiş PDF</small> : settings.enabled ? (
                <span className="certificate-row-serial">
                  <input value={settings.serials[name] || ""} onChange={(event) => setSerial(name, event.target.value)} placeholder="Seri no" aria-label={`${displayName(name)} seri numarası`} className={serialDuplicates.has(settings.serials[name] || "") ? "is-invalid" : ""} />
                </span>
              ) : <small>Sertifika üretimi kapalı</small>}
            </div>
            <div className="certificate-row-actions">
              {busy === name ? <span>Hazırlanıyor…</span> : (
                <>
                  <button type="button" onClick={() => view(name)} disabled={!available(name) || Boolean(busy)}>Görüntüle</button>
                  <button type="button" onClick={() => download(name)} disabled={!available(name) || Boolean(busy)}>İndir</button>
                  <button type="button" onClick={() => copyLink(name)} disabled={!settings.enabled || !record.certificate_links?.[name] || Boolean(busy)} title="Karekodun açtığı kalıcı sertifika linki">Linki kopyala</button>
                </>
              )}
            </div>
          </li>
        ))}
      </ol>

      <dialog ref={viewerRef} className="certificate-viewer" onClose={() => setViewer((current) => { if (current?.image?.startsWith("blob:")) URL.revokeObjectURL(current.image); return null; })} onClick={(event) => { if (event.target === event.currentTarget) viewerRef.current?.close(); }}>
        {viewer && (
          <div className="certificate-viewer-inner">
            <header>
              <div><span>{dirty && !uploaded[viewer.name] ? "Sertifika · kaydedilmemiş ayarlarla" : "Sertifika"}</span><strong>{displayName(viewer.name)}</strong></div>
              <button type="button" onClick={() => viewerRef.current?.close()} aria-label="Kapat">×</button>
            </header>
            <div className="certificate-viewer-body">
              {viewer.error ? <p className="certificate-viewer-status">{viewer.error}</p> : viewer.image ? <img src={viewer.image} alt={`${displayName(viewer.name)} sertifikası`} /> : <p className="certificate-viewer-status">Sertifika hazırlanıyor…</p>}
            </div>
            <footer>
              <button type="button" className="button button-gold" onClick={() => download(viewer.name)} disabled={busy === viewer.name}>{busy === viewer.name ? "Hazırlanıyor…" : <>PDF indir <span aria-hidden="true">↓</span></>}</button>
            </footer>
          </div>
        )}
      </dialog>
    </section>
  );
}

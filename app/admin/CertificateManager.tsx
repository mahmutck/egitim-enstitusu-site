"use client";

import { useMemo, useState } from "react";
import { displayName } from "./certificate-tools";
import { CertificateSettings, DEFAULT_CERTIFICATE_SETTINGS, MAX_LINES, TrainingRange, usesTrainingRange } from "../certificates/settings";

export type CertificateRecord = {
  slug: string;
  title: string;
  graduates_json: string;
  certificate_settings?: CertificateSettings | null;
  /** Permanent certificate link token per participant (QR code target). */
  certificate_links?: Record<string, string>;
  training_range?: TrainingRange | null;
};

const certificateUrl = (token: string) => `/sertifika/${token}`;

function initialSettings(record: CertificateRecord): CertificateSettings {
  const saved = record.certificate_settings;
  return saved ? { ...DEFAULT_CERTIFICATE_SETTINGS, ...saved, names: saved.names || {}, serials: saved.serials || {} } : { ...DEFAULT_CERTIFICATE_SETTINGS, serials: {}, names: {} };
}

/** Participant list with Görüntüle · İndir · Düzenle; text/date settings stay folded away. */
export default function CertificateManager({ record, onChanged }: { record: CertificateRecord; onChanged: () => Promise<void> }) {
  const graduates = useMemo(() => JSON.parse(record.graduates_json || "[]") as string[], [record.graduates_json]);
  const links = record.certificate_links || {};
  const [settings, setSettings] = useState<CertificateSettings>(() => initialSettings(record));
  const [editing, setEditing] = useState<{ name: string; certificateName: string; serial: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Re-sync when another record is selected or the saved settings change.
  const savedSettings = JSON.stringify(record.certificate_settings ?? null);
  const [syncedFrom, setSyncedFrom] = useState(`${record.slug}|${savedSettings}`);
  if (syncedFrom !== `${record.slug}|${savedSettings}`) {
    setSyncedFrom(`${record.slug}|${savedSettings}`);
    setSettings(initialSettings(record));
  }

  async function save(next: CertificateSettings, success: string) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/certificate-settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: record.slug, settings: next }) });
      const data = await response.json().catch(() => ({})) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) throw new Error(data.message || "Kaydedilemedi.");
      await onChanged();
      setMessage(success);
      return true;
    } catch (x) {
      setError(x instanceof Error ? x.message : "Kaydedilemedi.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveParticipant() {
    if (!editing) return;
    const names = { ...settings.names }; const serials = { ...settings.serials };
    const certificateName = editing.certificateName.trim();
    if (certificateName && certificateName !== displayName(editing.name)) names[editing.name] = certificateName; else delete names[editing.name];
    if (editing.serial.trim()) serials[editing.name] = editing.serial.trim(); else delete serials[editing.name];
    if (await save({ ...settings, names, serials }, `${certificateName || displayName(editing.name)} için sertifika güncellendi.`)) setEditing(null);
  }

  function assignSerials() {
    const serials = { ...settings.serials }; let next = settings.nextSerial;
    for (const name of graduates) if (!serials[name]?.trim()) serials[name] = `${settings.serialPrefix}${next++}`;
    setSettings({ ...settings, serials, nextSerial: next });
  }

  async function copyLink(name: string) {
    const url = `https://eenstitu.com${certificateUrl(links[name])}`;
    try { await navigator.clipboard.writeText(url); setMessage(`Link kopyalandı: ${url}`); } catch { setMessage(`Sertifika linki: ${url}`); }
  }

  const missingRange = usesTrainingRange(settings) && !record.training_range;

  return (
    <section className="admin-card certificate-manager" id="sertifikalar">
      <header className="certificate-manager-head">
        <div>
          <p className="eyebrow">Sertifikalar</p>
          <h2>{record.title}</h2>
          <p>{graduates.length} katılımcı{record.training_range ? ` · ${record.training_range.tr}` : ""}</p>
        </div>
        <a className="certificate-manager-page" href={`/${encodeURIComponent(record.slug)}`} target="_blank" rel="noreferrer">Sayfayı aç ↗</a>
      </header>

      {missingRange && <p className="admin-error">Bu kayıtta eğitim tarih aralığı yok; sertifikada tarih boş çıkar. Kayıt formunda Düzenle → Eğitim tarih aralığı.</p>}
      {message && <p className="admin-success" role="status">{message}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}

      <ol className="cert-list">
        {graduates.map((name, index) => {
          const token = links[name];
          const shownName = settings.names[name] || displayName(name);
          const isEditing = editing?.name === name;
          return (
            <li key={name} className={isEditing ? "is-editing" : undefined}>
              <span className="cert-no">{String(index + 1).padStart(2, "0")}</span>
              <div className="cert-person">
                <b>{shownName}</b>
                <small>{settings.serials[name] ? `Seri no: ${settings.serials[name]}` : "Seri no yok"}{shownName !== displayName(name) ? ` · Listede: ${name}` : ""}</small>
              </div>
              <div className="cert-actions">
                {token ? <a href={certificateUrl(token)} target="_blank" rel="noreferrer">Görüntüle</a> : <span>Görüntüle</span>}
                {token ? <a href={`${certificateUrl(token)}?indir=1`}>İndir</a> : <span>İndir</span>}
                <button type="button" onClick={() => setEditing(isEditing ? null : { name, certificateName: shownName, serial: settings.serials[name] || "" })} aria-expanded={isEditing}>Düzenle</button>
              </div>
              {isEditing && editing && (
                <div className="cert-edit">
                  <label>Sertifikadaki ad<input value={editing.certificateName} onChange={(event) => setEditing({ ...editing, certificateName: event.target.value })} /></label>
                  <label>Seri no<input value={editing.serial} onChange={(event) => setEditing({ ...editing, serial: event.target.value })} placeholder={`${settings.serialPrefix}${settings.nextSerial}`} /></label>
                  <div className="cert-edit-actions">
                    <button type="button" className="button button-gold" onClick={saveParticipant} disabled={busy}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
                    <button type="button" className="admin-forgot" onClick={() => setEditing(null)}>Vazgeç</button>
                    {token && <button type="button" className="admin-forgot" onClick={() => copyLink(name)}>Linki kopyala</button>}
                  </div>
                  <small>Ad düzeltmesi sadece sertifikayı değiştirir; karekod ve link aynı kalır.</small>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <details className="cert-settings">
        <summary>Sertifika metni, tarih ve seri numaraları</summary>
        <div className="admin-form certificate-template-form">
          <p className="wide certificate-token-hint">Metinde <code>{"{tarih}"}</code> yerine Türkçe, <code>{"{date}"}</code> yerine İngilizce eğitim tarih aralığı yazılır{record.training_range ? <>: <b>{record.training_range.tr}</b> / <b>{record.training_range.en}</b></> : "."}</p>
          <label className="wide">Türkçe metin <small>En fazla {MAX_LINES} satır</small>
            <textarea rows={3} value={settings.tr.join("\n")} onChange={(event) => setSettings({ ...settings, tr: event.target.value.split("\n").slice(0, MAX_LINES) })} />
          </label>
          <label className="wide">İngilizce metin <small>En fazla {MAX_LINES} satır</small>
            <textarea rows={3} value={settings.en.join("\n")} onChange={(event) => setSettings({ ...settings, en: event.target.value.split("\n").slice(0, MAX_LINES) })} />
          </label>
          <label>Tarih <small>Boş bırakılırsa eğitimin bitiş tarihi</small><input value={settings.date} onChange={(event) => setSettings({ ...settings, date: event.target.value })} placeholder="14-06-2026" /></label>
          <label>Seri no öneki ve sıradaki numara
            <span className="certificate-serial-start">
              <input value={settings.serialPrefix} onChange={(event) => setSettings({ ...settings, serialPrefix: event.target.value })} placeholder="HS-ON-" aria-label="Seri no öneki" />
              <input type="number" min={0} value={settings.nextSerial} onChange={(event) => setSettings({ ...settings, nextSerial: Number(event.target.value) || 0 })} aria-label="Sıradaki numara" />
            </span>
          </label>
        </div>
        <div className="certificate-template-actions">
          <button type="button" className="button button-gold" onClick={() => save(settings, "Sertifika ayarları kaydedildi.")} disabled={busy}>{busy ? "Kaydediliyor…" : "Ayarları kaydet"}</button>
          <button type="button" className="admin-forgot" onClick={assignSerials} disabled={busy}>Boş seri numaralarını doldur</button>
        </div>
      </details>
    </section>
  );
}

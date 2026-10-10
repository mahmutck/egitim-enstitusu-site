"use client";

import { FormEvent, useState } from "react";
import SubpageHeader from "../components/SubpageHeader";
import ContactTiles from "../components/ContactTiles";

const programs = [
  ["biosomatik", "Biosomatik Eğitimi"],
  ["hipnosomatik", "Hipnosomatik Eğitimi"],
  ["hipnoz-uygulayici-sertifika-programi", "Hipnoz Uygulayıcı Sertifika Programı"],
];

export default function ContactPage() {
  const [formStatus, setFormStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [formMessage, setFormMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setFormStatus("sending");
    setFormMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data.entries())),
      });
      const result = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message || "Mesaj gönderilemedi.");
      form.reset();
      setFormStatus("success");
      setFormMessage("Başvurunuz alındı. Ekibimiz çalışma saatleri içinde sizinle iletişime geçecek.");
    } catch (error) {
      setFormStatus("error");
      setFormMessage(error instanceof Error ? error.message : "Mesaj gönderilemedi. Lütfen tekrar deneyin.");
    }
  }

  return (
    <main>
      <SubpageHeader />
      <section className="contact-section dedicated-contact">
        <div className="contact-intro">
          <p className="eyebrow light">İletişim</p>
          <h1>Eğitim yolculuğunuzu birlikte planlayalım.</h1>
          <p>Programlarımız hakkında bilgi almak veya başvuru yapmak için formu doldurun. Ekibimiz çalışma saatleri içinde sizinle iletişime geçsin.</p>
          <div className="contact-direct"><span>Doğrudan iletişim</span><a href="/whatsapp">WhatsApp ön bilgi formu <i className="external-link-icon" aria-hidden="true" /></a><a href="https://www.instagram.com/egitimenstitu/" target="_blank" rel="noreferrer">Instagram · @egitimenstitu <i className="external-link-icon" aria-hidden="true" /></a><small>Pazartesi – Cuma · 09:00–17:00<br />Cumartesi – Pazar · Kapalı</small></div>
        </div>
        <form onSubmit={submit} className="application-form">
          <label className="form-honeypot" aria-hidden="true">Web sitesi<input name="website" tabIndex={-1} autoComplete="off" /></label>
          <input type="hidden" name="language" value="tr" />
          <label>Ad Soyad<input required name="name" autoComplete="name" /></label>
          <div className="form-row"><label>E-posta<input required type="email" name="email" autoComplete="email" /></label><label>Telefon<input name="phone" autoComplete="tel" /></label></div>
          <label>İlgilendiğiniz Program<select name="program" defaultValue=""><option value="" disabled>Seçiniz</option>{programs.map(([value, title]) => <option key={value} value={title}>{title}</option>)}</select></label>
          <label>Mesajınız<textarea name="message" rows={5} /></label>
          <label className="consent"><input required type="checkbox" /><span>Kişisel verilerimin Gizlilik Politikası ve KVKK Aydınlatma Metni kapsamında işlenmesini kabul ediyorum.</span></label>
          <button className="button button-gold" type="submit" disabled={formStatus === "sending"}>{formStatus === "sending" ? "Gönderiliyor…" : "Başvuruyu gönder"} <i className="forward-icon" aria-hidden="true" /></button>
          {formMessage && <p className={`form-message ${formStatus}`} role="status">{formMessage}</p>}
        </form>
      </section>
      <ContactTiles />
      <footer className="subpage-footer"><p>© 2026 Psikolojik Araştırmalar Enstitüsü. Tüm Hakları Saklıdır.</p></footer>
    </main>
  );
}

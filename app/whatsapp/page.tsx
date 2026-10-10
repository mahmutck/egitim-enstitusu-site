"use client";

import { FormEvent, useState } from "react";
import SubpageHeader from "../components/SubpageHeader";

const programs = [
  "Biosomatik Eğitimi",
  "Hipnosomatik Eğitimi",
  "Hipnoz Uygulayıcı Sertifika Programı",
  "Henüz karar vermedim",
];

export default function WhatsAppFormPage() {
  const [message, setMessage] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const fields = Object.fromEntries(data.entries());
    const text = [
      "Merhaba Eğitim Enstitüsü, ön bilgi formunu doldurdum.",
      "",
      `Ad Soyad: ${fields.name}`,
      `Telefon: ${fields.phone}`,
      `İlgilendiğim program: ${fields.program}`,
      `Ulaşım amacım: ${fields.purpose}`,
      `Bizi nereden duydum: ${fields.source}`,
      `Ülke: ${fields.country}`,
      `İl: ${fields.city}`,
      `Tercih ettiğim dönüş kanalı: ${fields.contactPreference}`,
      fields.note ? `Not: ${fields.note}` : "",
    ].filter(Boolean).join("\n");

    const whatsappUrl = `https://wa.me/905055053420?text=${encodeURIComponent(text)}`;
    const whatsappWindow = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    if (whatsappWindow) whatsappWindow.opener = null;
    setMessage(whatsappWindow
      ? "WhatsApp yeni bir sekmede açıldı. Bu sayfayı açık tutarak formunuza dönebilirsiniz."
      : "WhatsApp yeni sekmede açılamadı. Lütfen tarayıcınızın açılır pencere iznini kontrol edin.");
  }

  return (
    <main>
      <SubpageHeader />
      <section className="whatsapp-form-page">
        <div className="whatsapp-form-intro">
          <p className="eyebrow light">WhatsApp ile bilgi alın</p>
          <h1>Önce sizi tanıyalım, sonra doğru bilgiyle dönelim.</h1>
          <p>Bu kısa form, ekibimizin ihtiyacınıza uygun program ve içerikle yanıt vermesini sağlar. Formu tamamladığınızda yalnızca sizin onayınızla WhatsApp açılır.</p>
          <div className="whatsapp-form-notice"><img src="/brand/whatsapp.svg" alt="" width="28" height="28" /><span>Form gönderilmeden WhatsApp’a mesaj iletilmez.</span></div>
        </div>
        <form className="application-form whatsapp-intake-form" onSubmit={submit}>
          <label>Ad Soyad<input required name="name" autoComplete="name" /></label>
          <label>Telefon<input required name="phone" type="tel" autoComplete="tel" inputMode="tel" /></label>
          <label>İlgilendiğiniz Program<select required name="program" defaultValue=""><option value="" disabled>Seçiniz</option>{programs.map((program) => <option key={program} value={program}>{program}</option>)}</select></label>
          <label>Ulaşım Amacınız<select required name="purpose" defaultValue=""><option value="" disabled>Seçiniz</option><option value="Program hakkında bilgi almak">Program hakkında bilgi almak</option><option value="Kayıt ve kontenjan bilgisi almak">Kayıt ve kontenjan bilgisi almak</option><option value="Eğitim takvimini öğrenmek">Eğitim takvimini öğrenmek</option><option value="Sertifika süreci hakkında bilgi almak">Sertifika süreci hakkında bilgi almak</option><option value="Kurum iş birliği görüşmek">Kurum iş birliği görüşmek</option></select></label>
          <label>Bizi Nereden Duydunuz?<select required name="source" defaultValue=""><option value="" disabled>Seçiniz</option><option value="Instagram">Instagram</option><option value="Google / arama motoru">Google / arama motoru</option><option value="Arkadaş veya meslektaş önerisi">Arkadaş veya meslektaş önerisi</option><option value="Daha önceki eğitimler">Daha önceki eğitimler</option><option value="Diğer">Diğer</option></select></label>
          <label>Ülke<input required name="country" autoComplete="country-name" placeholder="Yaşadığınız ülke" /></label>
          <label>İl<input required name="city" autoComplete="address-level1" placeholder="Yaşadığınız il" /></label>
          <label>Tercih Ettiğiniz Dönüş Kanalı<select required name="contactPreference" defaultValue="WhatsApp"><option value="WhatsApp">WhatsApp</option><option value="Telefon">Telefon</option><option value="E-posta">E-posta</option></select></label>
          <label>Eklemek İstedikleriniz <span className="form-optional">(opsiyonel)</span><textarea name="note" rows={4} placeholder="Mesleğiniz, uygun olduğunuz günler veya özellikle merak ettikleriniz…" /></label>
          <label className="consent"><input required type="checkbox" /><span>Kişisel verilerimin Gizlilik Politikası ve KVKK Aydınlatma Metni kapsamında işlenmesini kabul ediyorum.</span></label>
          <button className="button button-gold" type="submit">WhatsApp’a devam et <span aria-hidden="true">↗</span></button>
          {message && <p className="form-message success" role="status">{message}</p>}
        </form>
      </section>
      <footer className="subpage-footer"><p>© 2026 Psikolojik Araştırmalar Enstitüsü. Tüm Hakları Saklıdır.</p></footer>
    </main>
  );
}

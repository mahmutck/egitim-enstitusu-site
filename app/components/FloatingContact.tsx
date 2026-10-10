export default function FloatingContact() {
  return (
    <aside className="floating-contact" aria-label="Hızlı iletişim">
      <a className="floating-button appointment-button" href="/iletisim" aria-label="Randevu ve başvuru formunu aç">
        <strong>Randevu</strong>
        <span className="floating-button-mark floating-calendar"><svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 11h18M8 15h2M14 15h2"/></svg></span>
      </a>
      <a className="floating-button whatsapp-button" href="/whatsapp" aria-label="WhatsApp ön bilgi formunu aç" title="WhatsApp ön bilgi formu">
        <strong>WhatsApp</strong>
        <span className="floating-button-mark"><img src="/brand/whatsapp.svg" alt="" width="25" height="25" /></span>
      </a>
      <a className="floating-button instagram-button" href="https://www.instagram.com/egitimenstitu/" target="_blank" rel="noreferrer" aria-label="Instagram sayfasını aç" title="Instagram">
        <strong>Instagram</strong>
        <span className="floating-button-mark"><img src="/brand/instagram.svg" alt="" width="25" height="25" /></span>
      </a>
    </aside>
  );
}

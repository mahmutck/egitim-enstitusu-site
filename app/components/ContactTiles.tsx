const instagramProfile = "https://www.instagram.com/egitimenstitu?igsh=MXZwYWpneXd5b3hlbA%253D%253D&utm_source=qr&utm_medium=social&utm_content=link_in_bio&fbclid=PAcGRvZgJleHRuA2FlbQIxMQBzcnRjBmFwcF9pZA85MzY2MTk3NDMzOTI0NTkAAaeBa7NRVUcyG1mM_vldpWmMrLiZghXT6HG3q5cZZlsgaEMBXGU6jckfieaNZw_aem_cQY0wTS2vl1lOzwpi68GYg";

export default function ContactTiles() {
  return (
    <section className="contact-tiles" aria-label="Hızlı iletişim seçenekleri">
      <a className="contact-tile appointment-tile" href="/iletisim">
        <span>Randevu</span><strong>Takvim</strong>
      </a>
      <a className="contact-tile whatsapp-tile" href="/whatsapp">
        <span>WhatsApp</span><strong><img src="/brand/whatsapp.svg" alt="" width="25" height="25" /></strong>
      </a>
      <a className="contact-tile instagram-tile" href={instagramProfile} target="_blank" rel="noreferrer">
        <span>Instagram</span><strong><img src="/brand/instagram.svg" alt="" width="24" height="24" /></strong>
      </a>
    </section>
  );
}

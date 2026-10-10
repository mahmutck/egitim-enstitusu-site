import SubpageHeader from "../components/SubpageHeader";

const posts = ["DD2OtrWtw6U", "DPCGSu6jdnB", "DbrBM-fx399", "Da0FVHkKrqm", "DaBupVDM9rF"];

export default function InstagramPage() {
  return (
    <main>
      <SubpageHeader />
      <section className="subpage-hero instagram-hero">
        <p className="eyebrow light">Instagram · @egitimenstitu</p>
        <h1>İçeriklerimizi ve videolarımızı keşfedin.</h1>
        <p>Seminer duyuruları, uzman görüşleri ve eğitim içerikleri; sayfada hızlıca inceleyin, dilediğiniz paylaşımı Instagram’da açın.</p>
        <a className="button button-gold" href="https://www.instagram.com/egitimenstitu/" target="_blank" rel="noreferrer">Instagram’da takip et <i className="external-link-icon" aria-hidden="true" /></a>
      </section>
      <section className="instagram-feed" aria-label="Instagram gönderileri">
        {posts.map((post, index) => (
          <article className="instagram-embed" key={post}>
            <span>Gönderi {String(index + 1).padStart(2, "0")}</span>
            <a className="instagram-post-link" href={`https://www.instagram.com/p/${post}/`} target="_blank" rel="noreferrer">
              <img src={`/images/instagram/${post}.jpg`} alt={`Eğitim Enstitüsü Instagram gönderisi ${index + 1}`} loading="lazy" />
              <strong>Instagram’da görüntüle <i className="external-link-icon" aria-hidden="true" /></strong>
            </a>
          </article>
        ))}
      </section>
      <footer className="subpage-footer"><p>© 2026 Psikolojik Araştırmalar Enstitüsü. Tüm Hakları Saklıdır.</p></footer>
    </main>
  );
}

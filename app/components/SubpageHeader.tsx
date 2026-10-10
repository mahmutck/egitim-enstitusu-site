export default function SubpageHeader() {
  return (
    <>
      <div className="academic-bar"><span>Psikolojik ve Somatik Araştırmalarda Öncü</span><span>Araştırma · Eğitim · Uygulama</span></div>
      <header className="site-header subpage-header">
        <a className="brand" href="/" aria-label="Eğitim Enstitüsü ana sayfa">
          <img src="/images/logo-emblem.png" alt="" width="76" height="80" />
          <span><strong>Psikolojik Araştırmalar Enstitüsü</strong><small>Eğitim Enstitüsü · Türkiye</small></span>
        </a>
        <nav aria-label="Ana navigasyon">
          <a href="/#hakkimizda">Hakkımızda</a>
          <a href="/programlar">Programlar</a>
          <a href="/#yaklasim">Yaklaşımımız</a>
          <a href="/instagram">Instagram</a>
          <a href="/iletisim">İletişim</a>
        </nav>
        <details className="mobile-menu">
          <summary>Menü</summary>
          <div>
            <a href="/#hakkimizda">Hakkımızda</a>
            <a href="/programlar">Programlar</a>
            <a href="/#yaklasim">Yaklaşımımız</a>
            <a href="/instagram">Instagram</a>
            <a href="/iletisim">İletişim</a>
          </div>
        </details>
        <a className="button button-small" href="/iletisim">Başvuru Formu</a>
      </header>
    </>
  );
}

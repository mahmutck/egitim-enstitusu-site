import ProgramArtwork, { ArrowIcon } from "../components/ProgramArtwork";
import SubpageHeader from "../components/SubpageHeader";


const programs = [
  {
    number: "01", level: "Temel Seviye", slug: "biosomatik", title: "Biosomatik Eğitimi", tagline: "Beden hafızasını ve enerji akışını anlamak",
    summary: "Beden temelli egzersizlerle kas hafızasını, duruşu ve enerji yönetimini çalışan uygulamalı sınıf içi eğitim programı.",
    audience: ["Psikoloji ve kişisel gelişime ilgi duyan yetişkinler", "Sınıf çalışmalarına uyumlu katılımcılar", "Ücretsiz ön görüşme sonrasında eğitim kaydı oluşturabilecek adaylar"],
    curriculum: ["Beden ve bilinçaltı ilişkisine giriş", "Kas hafızası ve duruş analizi çalışmaları", "Enerji yönetimi egzersizleri", "Uygulamalı atölye çalışmaları ve geri bildirim"],
    format: "Uygulamalı, sınıf içi grup eğitimi · 10–20 kişilik sınıflar", duration: "Temel düzey 2 gün (yılda 3 kez); ileri düzey 2 gün (yılda 1 kez). Duyurular yaklaşık 1 ay önce yapılır; her ay ücretsiz ön kayıt ve ön görüşme alınır.", certificate: "Eğitim sonunda Psikolojik Araştırmalar Enstitüsü sertifikası verilir. Aynı düzeyde tekrar katılım, kontenjan kapsamında ücretsizdir.",
  },
  {
    number: "02", level: "Orta Seviye", slug: "hipnosomatik", title: "Hipnosomatik Eğitimi", tagline: "Bilinçaltı ile beden arasındaki köprü",
    summary: "Bilinçaltı çalışmalarını beden temelli tekniklerle birleştiren, uygulamalı sınıf içi ve çevrim içi seçenekler sunan eğitim programı.",
    audience: ["Psikoloji ve kişisel gelişime ilgi duyan yetişkinler", "Sınıf çalışmalarına uyumlu katılımcılar", "Ücretsiz ön görüşme sonrasında eğitim kaydı oluşturabilecek adaylar"],
    curriculum: ["Hipnosomatik yaklaşımın temel ilkeleri", "Bilinçaltı-beden egzersizleri", "Vaka çalışmaları üzerinden uygulama", "Süpervizyonlu pratik seansları"],
    format: "Uygulamalı sınıf içi ve çevrim içi grup eğitimi · 10–20 kişilik sınıflar", duration: "Temel düzey sınıf içi eğitim 2 gün (yılda 4 kez); çevrim içi eğitim 6 gün (yılda 4 kez). Duyurular yaklaşık 1 ay önce yapılır; her ay ücretsiz ön kayıt ve ön görüşme alınır.", certificate: "Eğitim sonunda Psikolojik Araştırmalar Enstitüsü sertifikası verilir. Aynı düzeyde tekrar katılım, kontenjan kapsamında ücretsizdir.",
  },
  {
    number: "03", level: "Sertifika", slug: "hipnoz-uygulayici-sertifika-programi", title: "Hipnoz Uygulayıcı Sertifika Programı", tagline: "Psikosomatik hipnoza giriş ve uygulama sertifikası",
    summary: "Psikosomatik hipnoza giriş bilgilerini aktaran, zihin-beden bağlantısını uzmanlarla ele alan sertifika programı.",
    audience: ["Lisans veya doktora düzeyinde ilgili alanlarda çalışan ya da öğrenim gören kişiler", "Pratiğine hipnoz temelli teknik eklemek isteyenler", "Uzman eğitmenlerden sertifikalı eğitim almak isteyenler"],
    curriculum: ["Hipnoza giriş ve güvenli uygulama ilkeleri", "Zihin-beden bağlantısı ve psikosomatik süreçler", "Uzman doktor ve eğitmenlerle seminerler", "Uygulayıcı sertifikası değerlendirme süreci"],
    format: "Seminer ve atölye ağırlıklı, yüz yüze ve online", duration: "Takvim ve kabul koşulları başvuru sonrası paylaşılır.", certificate: "Eğitim sonunda Psikolojik Araştırmalar Enstitüsü’nden sertifika verilir.",
  },
];

export default function ProgramsPage() {
  return (
    <main>
      <SubpageHeader />
      <section className="subpage-hero programs-hero">
        <p className="eyebrow light">Programlarımız</p>
        <h1>Bilginizi adım adım derinleştirin.</h1>
        <p>Başlangıçtan uygulayıcı sertifikasına uzanan üç eğitim yolu; sınıf içi ve çevrim içi seçenekler program bazında değişir.</p>
      <nav className="program-path" aria-label="Eğitim yolları">{programs.map(p => <a key={p.slug} href={`#${p.slug}`}><span>{p.number}</span>{p.title}<i aria-hidden="true"><ArrowIcon diagonal /></i></a>)}</nav>
      </section>
      <section className="section dedicated-programs program-showcase">
        <div className="program-list showcase-list">
          {programs.map(program => (
            <article className={`program-card showcase-card showcase-${program.number}`} id={program.slug} key={program.slug}>
              <ProgramArtwork number={program.number} />
              <div className="showcase-content">
              <div className="program-top"><span className="program-number">{program.number}</span><span className="program-level">{program.level}</span></div>
              <div><h3>{program.title}</h3><p className="program-tagline">{program.tagline}</p></div>
              <p className="program-summary">{program.summary}</p>
              <div className="program-actions"><a className="button button-gold" href={`/iletisim?program=${program.slug}`}>Bu programa başvur <ArrowIcon diagonal /></a><a className="program-consult" href="/whatsapp">Ön görüşme alın <ArrowIcon /></a></div>
              </div>
              <details>
                <summary>Program ayrıntıları<span>+</span></summary>
                <div className="program-detail-grid">
                  <div><h4>Program içeriği</h4><ul>{program.curriculum.map(item => <li key={item}>{item}</li>)}</ul></div>
                  <div><h4>Kimler için uygun?</h4><ul>{program.audience.map(item => <li key={item}>{item}</li>)}</ul></div>
                </div>
                <dl className="program-facts"><div><dt>Format</dt><dd>{program.format}</dd></div><div><dt>Süre ve takvim</dt><dd>{program.duration}</dd></div><div><dt>Belgelendirme</dt><dd>{program.certificate}</dd></div></dl>
              </details>

            </article>
          ))}
        </div>
      </section>
      <footer className="subpage-footer"><p>© 2026 Psikolojik Araştırmalar Enstitüsü. Tüm Hakları Saklıdır.</p></footer>
    </main>
  );
}

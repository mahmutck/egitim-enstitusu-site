"use client";

import { FormEvent, useState } from "react";
import ProgramArtwork, { ArrowIcon } from "./components/ProgramArtwork";
import ContactTiles from "./components/ContactTiles";

type Language = "tr" | "en";

const instagramUrl = "https://www.instagram.com/egitimenstitu/";
const instagramPosts = [
  "DD2OtrWtw6U",
  "DPCGSu6jdnB",
  "DbrBM-fx399",
  "Da0FVHkKrqm",
  "DaBupVDM9rF",
  "profile",
];

const navHrefs = ["/#hakkimizda", "/programlar", "/#yaklasim", "/instagram", "/iletisim"];

const content = {
  tr: {
    brand: "Psikolojik Araştırmalar Enstitüsü",
    shortBrand: "Eğitim Enstitüsü",
    eyebrow: "Biosomatik & Hipnosomatik Eğitim",
    nav: ["Hakkımızda", "Programlar", "Yaklaşımımız", "Medya", "İletişim"],
    navIds: ["hakkimizda", "programlar", "yaklasim", "medya", "iletisim"],
    apply: "Başvuru Formu",
    heroTitle: "Bedenin bilgisini, zihnin derinliğiyle buluşturun.",
    heroBody:
      "Psikolojik ve somatik araştırmalardan beslenen programlarımızla beden, bilinçaltı ve kas hafızasını anlamaya yönelik uygulamalı bir eğitim yolculuğu sunuyoruz.",
    explore: "Programları İncele",
    whatsapp: "WhatsApp’tan Bilgi Al",
    note: "Eğitim içeriklerimiz terapi, tedavi veya teşhis amacı taşımaz.",
    stats: [
      ["27.000+", "Instagram takipçisi"],
      ["3", "Aktif eğitim programı"],
      ["130+", "Eğitim içeriği"],
    ],
    aboutEyebrow: "Kurumumuz",
    aboutTitle: "Akademik titizlik, uygulamalı öğrenme.",
    aboutBody:
      "Eğitim Enstitüsü, psikolojik ve somatik araştırmalardan beslenen biosomatik ve hipnosomatik teknikleri lisans ve doktora düzeyinde destek eğitimleriyle buluşturan bir kurumdur. Uzman doktor ve eğitmen kadromuzla, katılımcılarımızın beden ve bilinçaltı farkındalığını geliştirmesini hedefliyoruz.",
    mission: "Misyonumuz",
    missionBody:
      "Biosomatik ve hipnosomatik yöntemleri güvenilir, şeffaf ve uygulamaya dönük bir eğitim anlayışıyla geniş kitlelere ulaştırmak.",
    vision: "Vizyonumuz",
    visionBody:
      "Türkiye’de psikolojik ve somatik araştırmalar alanında referans gösterilen, uzman kadrosuyla tanınan bir eğitim kurumu olmak.",
    programsEyebrow: "Programlarımız",
    programsTitle: "Bilginizi adım adım derinleştirin.",
    programsIntro:
      "Başlangıçtan uygulayıcı sertifikasına uzanan üç eğitim yolu; sınıf içi ve çevrim içi seçenekler program bazında değişir.",
    suitable: "Kimler için uygun?",
    curriculum: "Program içeriği",
    format: "Format",
    duration: "Süre",
    certificate: "Belgelendirme",
    details: "Program ayrıntıları",
    applyProgram: "Bu program için başvur",
    whyEyebrow: "Yaklaşımımız",
    whyTitle: "Güven, açıklık ve nitelikli öğrenme üzerine kurulu.",
    why: [
      ["Uzman Kadro", "İçerikler, doktorlar ve alanında deneyimli eğitmenlerle birlikte hazırlanır."],
      ["Uygulamalı Öğrenme", "Bilgiyi pratiğe taşıyan atölyeler, vaka çalışmaları ve geri bildirim süreçleri."],
      ["Şeffaf Yaklaşım", "Eğitimlerimizin terapi, tedavi veya teşhis olmadığını her adımda açıkça belirtiriz."],
      ["Esnek Katılım", "Yüz yüze ve çevrim içi seçeneklerle farklı takvimlere uyum sağlarız."],
    ],
    teamTitle: "Eğitmen Kadromuz",
    teamBody:
      "Eğitimlerimiz; psikoloji, psikiyatri, sosyoloji ve uygulama alanlarından gelen disiplinlerarası bir kadroyla yürütülür.",
    mediaEyebrow: "Medyada Biz",
    mediaTitle: "Araştırmayı daha geniş bir toplulukla paylaşıyoruz.",
    mediaBody:
      "TV programları, seminerler ve sosyal medya içerikleriyle biosomatik ve hipnosomatik yöntemler üzerine uzman görüşlerini paylaşıyoruz.",
    openPost: "Instagram’da görüntüle",
    follow: "@egitimenstitu hesabını takip et",
    contactEyebrow: "İletişim",
    contactTitle: "Eğitim yolculuğunuzu birlikte planlayalım.",
    contactBody:
      "Programlarımız hakkında bilgi almak veya başvuru yapmak için formu doldurun. Ekibimiz çalışma saatleri içinde sizinle iletişime geçsin.",
    name: "Ad Soyad",
    email: "E-posta",
    phone: "Telefon",
    program: "İlgilendiğiniz Program",
    select: "Seçiniz",
    message: "Mesajınız",
    consent: "Kişisel verilerimin Gizlilik Politikası ve KVKK Aydınlatma Metni kapsamında işlenmesini kabul ediyorum.",
    send: "E-posta ile Gönder",
    faster: "Daha hızlı bir yanıt için",
    hours: "Pazartesi – Cuma · 09:00–17:00",
    closed: "Cumartesi – Pazar · Kapalı",
    privacy: "Gizlilik Politikası ve KVKK Aydınlatma Metni",
    privacyNote: "Bu metin genel bir taslaktır; yayına almadan önce hukuk danışmanı kontrolü önerilir.",
    privacySections: [
      ["Veri Sorumlusu", "Kişisel verileriniz, Uluslararası Akreditasyon ve Psikolojik Araştırmalar Enstitüsü Eğitim Danışmanlık Ltd. Şti. tarafından işlenir. Vergi/MERSİS no: 8900483864."],
      ["Hangi Veriler Toplanır", "İletişim formu veya WhatsApp üzerinden bize ulaştığınızda ad-soyad, e-posta adresi, telefon numarası, ilgilendiğiniz program bilgisi ve mesajınızda paylaştığınız diğer bilgiler işlenebilir."],
      ["Verilerin İşlenme Amacı", "Toplanan veriler; başvurunuzu değerlendirmek, programlarımız hakkında bilgi vermek ve sorularınızı yanıtlamak amacıyla işlenir. Verileriniz pazarlama amacıyla üçüncü taraflarla paylaşılmaz veya satılmaz."],
      ["Yasal Dayanak ve Saklama", "Verileriniz, KVKK md. 5/2 kapsamında açık rızanız veya meşru menfaat hukuki sebebine dayanılarak, talebinizin sonuçlandırılması için gerekli süre boyunca saklanır; ardından silinir veya anonim hale getirilir."],
      ["Çerezler ve Üçüncü Taraf İçerikler", "Instagram gönderileri, Instagram’ın kendi çerez ve gizlilik politikalarına tabi hizmetleri üzerinden görüntülenebilir. Sitemiz kendi adına takip amaçlı çerez kullanmaz."],
      ["Haklarınız", "KVKK madde 11 uyarınca verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, amacını öğrenme, düzeltme, silme ve işleme itiraz etme haklarına sahipsiniz."],
      ["KVKK Başvuru İletişimi", "Haklarınızı kullanmak veya sorularınız için info@eenstitu.com adresine yazabilir; yazılı başvurularınızı Nurtepe Mahallesi Çeşme Sokak No:30/1 Ekşioğlu Sadabat Park Evleri C Blok 18, Kağıthane / İstanbul adresine iletebilirsiniz."],
    ],
    footerAbout: "Psikolojik ve somatik araştırmalardan beslenen eğitim programları.",
    rights: "Tüm Hakları Saklıdır.",
  },
  en: {
    brand: "Institute for Psychological Research",
    shortBrand: "Education Institute",
    eyebrow: "Biosomatic & Hypnosomatic Education",
    nav: ["About", "Programs", "Our Approach", "Media", "Contact"],
    navIds: ["hakkimizda", "programlar", "yaklasim", "medya", "iletisim"],
    apply: "Apply Now",
    heroTitle: "Where the intelligence of the body meets the depth of the mind.",
    heroBody:
      "Grounded in psychological and somatic research, our applied programs explore the body, subconscious processes, and muscle memory.",
    explore: "Explore Programs",
    whatsapp: "Ask on WhatsApp",
    note: "Our educational content does not constitute therapy, treatment, or diagnosis.",
    stats: [
      ["27,000+", "Instagram followers"],
      ["3", "Active training programs"],
      ["130+", "Educational resources"],
    ],
    aboutEyebrow: "The Institute",
    aboutTitle: "Academic rigor. Applied learning.",
    aboutBody:
      "The Institute brings together psychological and somatic research with biosomatic and hypnosomatic techniques through undergraduate and graduate-level support training. With expert physicians and instructors, we help participants deepen body and subconscious awareness.",
    mission: "Our Mission",
    missionBody:
      "To make biosomatic and hypnosomatic methods accessible through reliable, transparent, and practice-led education.",
    vision: "Our Vision",
    visionBody:
      "To become a trusted reference institution in psychological and somatic research, recognized for its expert faculty.",
    programsEyebrow: "Our Programs",
    programsTitle: "Deepen your knowledge, one stage at a time.",
    programsIntro:
      "Three learning pathways, from foundations to practitioner certification, with in-person and online formats that vary by program.",
    suitable: "Who is it for?",
    curriculum: "Curriculum",
    format: "Format",
    duration: "Duration",
    certificate: "Credential",
    details: "Program details",
    applyProgram: "Apply for this program",
    whyEyebrow: "Our Approach",
    whyTitle: "Built on trust, clarity, and meaningful learning.",
    why: [
      ["Expert Faculty", "Content is developed with physicians and experienced instructors in the field."],
      ["Applied Learning", "Workshops, case studies, and feedback help turn knowledge into practice."],
      ["Transparent Practice", "We clearly state that our education is not therapy, treatment, or diagnosis."],
      ["Flexible Access", "In-person and online formats accommodate different schedules."],
    ],
    teamTitle: "Our Instructors",
    teamBody:
      "Our programs are delivered by an interdisciplinary faculty with experience across psychology, psychiatry, sociology, and applied learning.",
    mediaEyebrow: "In the Media",
    mediaTitle: "Sharing research with a wider community.",
    mediaBody:
      "We share expert perspectives on biosomatic and hypnosomatic methods through TV appearances, seminars, and social content.",
    openPost: "View on Instagram",
    follow: "Follow @egitimenstitu",
    contactEyebrow: "Contact",
    contactTitle: "Let’s plan your learning journey.",
    contactBody:
      "Complete the form to learn more or apply. Our team will contact you during business hours.",
    name: "Full Name",
    email: "Email",
    phone: "Phone",
    program: "Program of Interest",
    select: "Select",
    message: "Your Message",
    consent: "I consent to my personal data being processed under the Privacy Policy & Data Notice.",
    send: "Send by Email",
    faster: "For a faster response",
    hours: "Monday – Friday · 09:00–17:00",
    closed: "Saturday – Sunday · Closed",
    privacy: "Privacy Policy & Data Notice",
    privacyNote: "This is a general draft; legal review is recommended before publication.",
    privacySections: [
      ["Data Controller", "Your personal data is processed by Uluslararası Akreditasyon ve Psikolojik Araştırmalar Enstitüsü Eğitim Danışmanlık Ltd. Şti. Tax/MERSIS no: 8900483864."],
      ["Data We Collect", "When you contact us through the form or WhatsApp, we may process your full name, email, phone number, program of interest, and information included in your message."],
      ["Purpose of Processing", "Data is used to evaluate your inquiry, provide program information, and answer questions. It is not sold or shared with third parties for marketing."],
      ["Legal Basis & Retention", "Data is retained based on explicit consent or legitimate interest under KVKK Art. 5/2 for the time needed to resolve your request, then deleted or anonymized."],
      ["Cookies & Third-Party Content", "Instagram content may be displayed through services governed by Instagram’s own cookie and privacy policies. This site does not use its own tracking cookies."],
      ["Your Rights", "Under KVKK Article 11, you may ask whether your data is processed, request information, learn its purpose, request correction or deletion, and object to processing."],
      ["KVKK Contact", "To exercise your rights or ask a question, email info@eenstitu.com or submit a written application to Nurtepe Mahallesi Çeşme Sokak No:30/1 Ekşioğlu Sadabat Park Evleri C Blok 18, Kağıthane / İstanbul."],
    ],
    footerAbout: "Education grounded in psychological and somatic research.",
    rights: "All Rights Reserved.",
  },
} as const;

const programs = [
  {
    slug: "biosomatik",
    number: "01",
    level: { tr: "Temel Seviye", en: "Foundation" },
    tr: {
      title: "Biosomatik Eğitimi",
      tagline: "Beden hafızasını ve enerji akışını anlamak",
      summary: "Beden temelli egzersizlerle kas hafızasını, duruşu ve enerji yönetimini çalışan uygulamalı sınıf içi eğitim programı.",
      audience: ["Psikoloji ve kişisel gelişime ilgi duyan yetişkinler", "Sınıf çalışmalarına uyumlu katılımcılar", "Ücretsiz ön görüşme sonrasında eğitim kaydı oluşturabilecek adaylar"],
      curriculum: ["Beden ve bilinçaltı ilişkisine giriş", "Kas hafızası ve duruş analizi çalışmaları", "Enerji yönetimi egzersizleri", "Uygulamalı atölye çalışmaları ve geri bildirim"],
      format: "Uygulamalı, sınıf içi grup eğitimi · 10–20 kişilik sınıflar",
      duration: "Temel düzey 2 gün (yılda 3 kez); ileri düzey 2 gün (yılda 1 kez). Duyurular yaklaşık 1 ay önce yapılır; her ay ücretsiz ön kayıt ve ön görüşme alınır.",
      certificate: "Eğitim sonunda Psikolojik Araştırmalar Enstitüsü sertifikası verilir. Aynı düzeyde tekrar katılım, kontenjan kapsamında ücretsizdir.",
    },
    en: {
      title: "Biosomatic Training",
      tagline: "Understanding body memory and energy flow",
      summary: "A foundational program using body-based exercises to work with muscle memory, posture, and energy management.",
      audience: ["Those seeking a body-based approach to personal development", "Coaches, consultants, and educators", "Newcomers to biosomatic methods"],
      curriculum: ["Introduction to the body–subconscious connection", "Muscle memory and posture analysis", "Energy management practices", "Hands-on workshops with feedback"],
      format: "Applied, in-person group training · classes of 10–20 participants",
      duration: "Foundation level: 2 days, offered 3 times per year; advanced level: 2 days, offered once per year. Announcements are made about one month ahead; free pre-registration and consultation are available monthly.",
      certificate: "A Psikolojik Araştırmalar Enstitüsü certificate is issued. Repeat attendance at the same level is free subject to capacity.",
    },
  },
  {
    slug: "hipnosomatik",
    number: "02",
    level: { tr: "Orta Seviye", en: "Intermediate" },
    tr: {
      title: "Hipnosomatik Eğitimi",
      tagline: "Bilinçaltı ile beden arasındaki köprü",
      summary: "Bilinçaltı çalışmalarını beden temelli tekniklerle birleştiren, uygulamalı sınıf içi ve çevrim içi seçenekler sunan eğitim programı.",
      audience: ["Psikoloji ve kişisel gelişime ilgi duyan yetişkinler", "Sınıf çalışmalarına uyumlu katılımcılar", "Ücretsiz ön görüşme sonrasında eğitim kaydı oluşturabilecek adaylar"],
      curriculum: ["Hipnosomatik yaklaşımın temel ilkeleri", "Bilinçaltı-beden egzersizleri", "Vaka çalışmaları üzerinden uygulama", "Süpervizyonlu pratik seansları"],
      format: "Uygulamalı sınıf içi ve çevrim içi grup eğitimi · 10–20 kişilik sınıflar",
      duration: "Temel düzey sınıf içi eğitim 2 gün (yılda 4 kez); çevrim içi eğitim 6 gün (yılda 4 kez). Duyurular yaklaşık 1 ay önce yapılır; her ay ücretsiz ön kayıt ve ön görüşme alınır.",
      certificate: "Eğitim sonunda Psikolojik Araştırmalar Enstitüsü sertifikası verilir. Aynı düzeyde tekrar katılım, kontenjan kapsamında ücretsizdir.",
    },
    en: {
      title: "Hypnosomatic Training",
      tagline: "The bridge between the subconscious and the body",
      summary: "An intermediate program combining subconscious work with body-based techniques, building on biosomatic training.",
      audience: ["Graduates of biosomatic training", "Those who want to deepen subconscious work", "Practitioners refining their own practice"],
      curriculum: ["Core principles of the hypnosomatic approach", "Subconscious–body exercises", "Applied case studies", "Supervised practice sessions"],
      format: "Applied in-person and online group training · classes of 10–20 participants",
      duration: "Foundation in-person training: 2 days, offered 4 times per year; online training: 6 days, offered 4 times per year. Announcements are made about one month ahead; free pre-registration and consultation are available monthly.",
      certificate: "A Psikolojik Araştırmalar Enstitüsü certificate is issued. Repeat attendance at the same level is free subject to capacity.",
    },
  },
  {
    slug: "hipnoz-uygulayici-sertifika-programi",
    number: "03",
    level: { tr: "Sertifika", en: "Certificate" },
    tr: {
      title: "Hipnoz Uygulayıcı Sertifika Programı",
      tagline: "Psikosomatik hipnoza giriş ve uygulama sertifikası",
      summary: "Psikosomatik hipnoza giriş bilgilerini aktaran, zihin-beden bağlantısını uzmanlarla ele alan sertifika programı.",
      audience: ["Lisans veya doktora düzeyinde ilgili alanlarda çalışan/öğrenim gören kişiler", "Pratiğine hipnoz temelli teknik eklemek isteyenler", "Uzman eğitmenlerden sertifikalı eğitim almak isteyenler"],
      curriculum: ["Hipnoza giriş ve güvenli uygulama ilkeleri", "Zihin-beden bağlantısı ve psikosomatik süreçler", "Uzman doktor ve eğitmenlerle seminerler", "Uygulayıcı sertifikası değerlendirme süreci"],
      format: "Seminer ve atölye ağırlıklı, yüz yüze ve online",
      duration: "Program süresi ve takvim başvuru sonrası paylaşılır",
      certificate: "Şartları tamamlayanlara Hipnoz Uygulayıcı Sertifikası",
    },
    en: {
      title: "Certified Hypnosis Practitioner Program",
      tagline: "Introduction to psychosomatic hypnosis and certification",
      summary: "A certificate program covering psychosomatic hypnosis and the mind-body connection with expert physicians and instructors.",
      audience: ["Undergraduate or graduate-level professionals in related fields", "Practitioners adding hypnosis-based techniques", "Those seeking certified expert-led training"],
      curriculum: ["Introduction to hypnosis and safe practice", "Mind-body connection and psychosomatic processes", "Seminars with expert physicians and instructors", "Practitioner certification assessment"],
      format: "Seminar and workshop-based, in-person and online",
      duration: "Schedule shared after application",
      certificate: "Certified Hypnosis Practitioner certificate upon completion",
    },
  },
] as const;

const faculty = [
  {
    name: "Ahmet Demir",
    image: "/images/faculty/ahmet-demir.jpg",
    title: "Hukuk YL. · Psikoloji YL. · Sosyoloji · Çocuk Gelişimi",
    bio: "Hipnosomatik patent sahibidir ve Psikolojik Araştırmalar Enstitüsü’nün kurucusudur.",
  },
  {
    name: "Begüm Arıtan",
    image: "/images/faculty/begum-aritan.jpg",
    title: "Uzm. Dr. · Psikiyatri",
    bio: "Psikiyatri alanındaki uzmanlığıyla eğitim içeriklerinin klinik perspektifle ele alınmasına katkı sunar.",
  },
  {
    name: "Arzu Demir",
    image: "/images/faculty/arzu-demir.jpg",
    title: "Psikoloji Lisans",
    bio: "Psikoloji alanındaki eğitimiyle katılımcı deneyimi ve uygulamalı öğrenme süreçlerinde görev alır.",
  },
  {
    name: "Hasan Demir",
    image: "/images/faculty/hasan-demir.jpg",
    title: "Psikoloji Lisans (devam) · Mühendis · Hipnoz kitap yazarı",
    bio: "Disiplinlerarası bir bakışla eğitim içeriklerinin uygulama ve anlatı boyutuna katkı sağlar.",
  },
  {
    name: "Mercan Kaya",
    image: "/images/faculty/mercan-kaya.jpg",
    title: "Eğitim Asistanı",
    bio: "",
  },
  {
    name: "Gülay ÖzKahveci",
    image: "/images/faculty/gulay-ozkahveci.jpg",
    title: "Eğitim Asistanı",
    bio: "",
  },
] as const;

export default function Home() {
  const [language, setLanguage] = useState<Language>("tr");
  const [formStatus, setFormStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [formMessage, setFormMessage] = useState("");
  const t = content[language];

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
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
      if (!response.ok || !result.ok) throw new Error(result.message || (language === "tr" ? "Mesaj gönderilemedi." : "Your message could not be sent."));
      form.reset();
      setFormStatus("success");
      setFormMessage(language === "tr" ? "Başvurunuz alındı. Ekibimiz çalışma saatleri içinde sizinle iletişime geçecek." : "Your application has been received. Our team will contact you during business hours.");
    } catch (error) {
      setFormStatus("error");
      setFormMessage(error instanceof Error ? error.message : (language === "tr" ? "Mesaj gönderilemedi. Lütfen tekrar deneyin." : "Your message could not be sent. Please try again."));
    }
  }

  return (
    <main lang={language}>
      <div className="academic-bar">
        <span>{language === "tr" ? "Psikolojik ve Somatik Araştırmalarda Öncü" : "Leaders in Psychological and Somatic Research"}</span>
        <span>{language === "tr" ? "Araştırma · Eğitim · Uygulama" : "Research · Education · Practice"}</span>
      </div>
      <header className="site-header">
        <a className="brand" href="#top" aria-label={t.brand}>
          <img src="/images/logo-emblem.png" alt="" width="58" height="64" />
          <span><strong>{t.brand}</strong><small>{language === "tr" ? "Eğitim Enstitüsü · Türkiye" : "Education Institute · Türkiye"}</small></span>
        </a>
        <nav aria-label="Main navigation">
          {t.nav.map((label, index) => <a key={label} href={navHrefs[index]}>{label}</a>)}
        </nav>
        <details className="mobile-menu">
          <summary>{language === "tr" ? "Menü" : "Menu"}</summary>
          <div>
            {t.nav.map((label, index) => <a key={label} href={navHrefs[index]}>{label}</a>)}
          </div>
        </details>
        <div className="header-actions">
          <button className="language" onClick={() => setLanguage(language === "tr" ? "en" : "tr")} aria-label="Change language">
            {language === "tr" ? "EN" : "TR"}
          </button>
          <a className="button button-small" href="/iletisim">{t.apply}</a>
        </div>
      </header>

      <section id="top" className="hero">
        <div className="hero-copy">
          <p className="eyebrow light">{t.eyebrow}</p>
          <h1>{t.heroTitle}</h1>
          <p className="hero-lead">{t.heroBody}</p>
          <div className="hero-actions">
            <a className="button button-gold" href="#programlar">{t.explore}</a>
            <a className="text-link light-link" href="/whatsapp">{t.whatsapp} <i className="external-link-icon" aria-hidden="true" /></a>
          </div>
          <p className="hero-note"><span>i</span>{t.note}</p>
        </div>
        <div className="hero-mark" aria-hidden="true">
          <div className="seal-ring">
            <img src="/images/logo-emblem-light.png" alt="" width="250" height="290" />
          </div>
          <p>RESEARCH <span>•</span> EDUCATION <span>•</span> PRACTICE</p>
        </div>
        <div className="hero-index" aria-hidden="true">01</div>
      </section>

      <section className="stat-strip" aria-label="Institute statistics">
        {t.stats.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
      </section>

      <section className="institutional-motto" aria-label="Kurumsal yaklaşım">
        <span>Scientia</span><i>•</i><span>Humanitas</span><i>•</i><span>Praxis</span>
      </section>

      <section id="hakkimizda" className="section about-section">
        <div className="section-heading">
          <p className="eyebrow">{t.aboutEyebrow}</p>
          <h2>{t.aboutTitle}</h2>
        </div>
        <div className="about-grid">
          <p className="large-copy">{t.aboutBody}</p>
          <div className="principles">
            <article><span>01</span><h3>{t.mission}</h3><p>{t.missionBody}</p></article>
            <article><span>02</span><h3>{t.vision}</h3><p>{t.visionBody}</p></article>
          </div>
        </div>
      </section>

      <section id="programlar" className="section programs-section">
        <div className="section-heading split-heading">
          <div><p className="eyebrow">{t.programsEyebrow}</p><h2>{t.programsTitle}</h2></div>
          <p>{t.programsIntro}</p>
        </div>
        <div className="program-list showcase-list">
          {programs.map((program) => {
            const p = program[language];
            return (
              <article className={`program-card showcase-card showcase-${program.number}`} key={program.slug}>
                <ProgramArtwork number={program.number} language={language} />
                <div className="showcase-content">
                <div className="program-top">
                  <span className="program-number">{program.number}</span>
                  <span className="program-level">{program.level[language]}</span>
                </div>
                <h3>{p.title}</h3>
                <p className="program-tagline">{p.tagline}</p>
                <p className="program-summary">{p.summary}</p>
                <div className="program-actions"><a className="button button-gold" href={`/iletisim?program=${program.slug}`}>{t.applyProgram}<ArrowIcon diagonal /></a><a className="program-consult" href="/whatsapp">{language === "tr" ? "Ön görüşme alın" : "Book a consultation"}<ArrowIcon /></a></div>
                </div>
                <details>
                  <summary>{t.details}<span>+</span></summary>
                  <div className="program-detail-grid">
                    <div><h4>{t.curriculum}</h4><ul>{p.curriculum.map(item => <li key={item}>{item}</li>)}</ul></div>
                    <div><h4>{t.suitable}</h4><ul>{p.audience.map(item => <li key={item}>{item}</li>)}</ul></div>
                  </div>
                  <dl className="program-facts">
                    <div><dt>{t.format}</dt><dd>{p.format}</dd></div>
                    <div><dt>{t.duration}</dt><dd>{p.duration}</dd></div>
                    <div><dt>{t.certificate}</dt><dd>{p.certificate}</dd></div>
                  </dl>
                </details>
              </article>
            );
          })}
        </div>
      </section>

      <section id="yaklasim" className="section approach-section">
        <div className="section-heading approach-heading">
          <p className="eyebrow light">{t.whyEyebrow}</p>
          <h2>{t.whyTitle}</h2>
        </div>
        <div className="approach-grid">
          {t.why.map(([title, body], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{body}</p></article>)}
        </div>
        <div className="faculty-note">
          <div><p className="eyebrow light">Faculty</p><h3>{t.teamTitle}</h3></div>
          <p>{t.teamBody}</p>
          <div className="faculty-grid">
            {faculty.map((member) => (
              <article className={`faculty-card${"image" in member ? " faculty-card-with-photo" : ""}`} key={member.name}>
                {"image" in member ? <img className="faculty-photo" src={member.image} alt={member.name} width={560} height={700} loading="lazy" /> : <span>{member.name.split(" ").map((part) => part[0]).join("")}</span>}
                <div><h4>{member.name}</h4><b>{member.title}</b>{member.bio && <p>{member.bio}</p>}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="medya" className="section media-section">
        <div className="section-heading split-heading">
          <div><p className="eyebrow">{t.mediaEyebrow}</p><h2>{t.mediaTitle}</h2></div>
          <div><p>{t.mediaBody}</p><a className="text-link" href={instagramUrl} target="_blank" rel="noreferrer">{t.follow} <i className="external-link-icon" aria-hidden="true" /></a></div>
        </div>
        <div className="media-grid">
          {instagramPosts.map((post, index) => (
            <a className={`media-card media-embed-card media-${index + 1} ${post === "profile" ? "media-profile-card" : ""}`} key={post} href={post === "profile" ? instagramUrl : `https://www.instagram.com/p/${post}/`} target="_blank" rel="noreferrer">
              <span className="media-label">Instagram · {String(index + 1).padStart(2, "0")}</span>
              {post === "profile" ? (
                <div className="media-profile-content">
                  <img src="/brand/instagram.svg" alt="" width="76" height="76" />
                  <p>@egitimenstitu</p>
                  <small>Yeni videolar, seminer duyuruları ve eğitim içerikleri için hesabımızı takip edin.</small>
                </div>
              ) : <img src={`/images/instagram/${post}.jpg`} alt={`Eğitim Enstitüsü Instagram paylaşımı ${index + 1}`} loading="lazy" />}
              <strong>{post === "profile" ? "Instagram’da tüm içerikleri gör" : t.openPost} <i className="external-link-icon" aria-hidden="true" /></strong>
            </a>
          ))}
        </div>
      </section>

      <ContactTiles />

      <section id="iletisim" className="contact-section">
        <div className="contact-intro">
          <p className="eyebrow light">{t.contactEyebrow}</p>
          <h2>{t.contactTitle}</h2>
          <p>{t.contactBody}</p>
          <div className="contact-direct">
            <span>{t.faster}</span>
            <a href="/whatsapp">WhatsApp ön bilgi formu <i className="external-link-icon" aria-hidden="true" /></a>
            <a href={instagramUrl} target="_blank" rel="noreferrer">Instagram · @egitimenstitu <i className="external-link-icon" aria-hidden="true" /></a>
            <small>{t.hours}<br />{t.closed}</small>
          </div>
        </div>
        <form onSubmit={submitApplication} className="application-form">
          <label className="form-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
          <input type="hidden" name="language" value={language} />
          <label>{t.name}<input required name="name" autoComplete="name" /></label>
          <div className="form-row">
            <label>{t.email}<input required type="email" name="email" autoComplete="email" /></label>
            <label>{t.phone}<input name="phone" autoComplete="tel" /></label>
          </div>
          <label>{t.program}<select name="program" defaultValue=""><option value="" disabled>{t.select}</option>{programs.map(p => <option key={p.slug} value={p[language].title}>{p[language].title}</option>)}</select></label>
          <label>{t.message}<textarea name="message" rows={4} /></label>
          <label className="consent"><input required type="checkbox" /><span>{t.consent}</span></label>
          <button className="button button-gold" type="submit" disabled={formStatus === "sending"}>{formStatus === "sending" ? (language === "tr" ? "Gönderiliyor…" : "Sending…") : (language === "tr" ? "Başvuruyu Gönder" : "Send Application")} <i className="forward-icon" aria-hidden="true" /></button>
          {formMessage && <p className={`form-message ${formStatus}`} role="status">{formMessage}</p>}
        </form>
      </section>

      <section className="privacy-section">
        <details>
          <summary>{t.privacy}<span>+</span></summary>
          <div className="privacy-content"><p className="privacy-note">{t.privacyNote}</p>{t.privacySections.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div>
        </details>
      </section>

      <footer>
        <div className="footer-brand"><img src="/images/logo-emblem-light.png" alt="" width="62" height="72" /><div><strong>{t.brand}</strong><p>{t.footerAbout}</p></div></div>
        <div className="footer-links">{t.nav.map((label, index) => <a key={label} href={navHrefs[index]}>{label}</a>)}</div>
        <p className="copyright">© 2026 {t.brand}. {t.rights}</p>
      </footer>
    </main>
  );
}

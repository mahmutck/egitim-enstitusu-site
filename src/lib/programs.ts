import type { Locale } from "./i18n";

export type Program = {
  slug: string;
  icon: "body" | "mind" | "certificate";
  tr: {
    title: string;
    tagline: string;
    summary: string;
    audience: string[];
    content: string[];
    format: string;
    duration: string;
    certificate: string;
  };
  en: {
    title: string;
    tagline: string;
    summary: string;
    audience: string[];
    content: string[];
    format: string;
    duration: string;
    certificate: string;
  };
};

export const programs: Program[] = [
  {
    slug: "biosomatik",
    icon: "body",
    tr: {
      title: "Biosomatik Eğitimi",
      tagline: "Beden hafızasını ve enerji akışını anlamak",
      summary:
        "Beden temelli egzersizlerle kas hafızasını, duruşu ve enerji yönetimini çalışan temel seviye eğitim programı.",
      audience: [
        "Kişisel gelişime beden üzerinden yaklaşmak isteyenler",
        "Koçluk, danışmanlık veya eğitim alanında çalışanlar",
        "Biosomatik yöntemleri ilk kez tanıyacak katılımcılar",
      ],
      content: [
        "Beden ve bilinçaltı ilişkisine giriş",
        "Kas hafızası ve duruş analizi çalışmaları",
        "Enerji yönetimi egzersizleri",
        "Uygulamalı atölye çalışmaları ve geri bildirim",
      ],
      format: "Yüz yüze ve online seçenekli grup eğitimi",
      duration: "Program süresi ve takvim başvuru sonrası paylaşılır",
      certificate: "Katılım belgesi verilir",
    },
    en: {
      title: "Biosomatic Training",
      tagline: "Understanding body memory and energy flow",
      summary:
        "A foundational program using body-based exercises to work with muscle memory, posture, and energy management.",
      audience: [
        "Those who want a body-based approach to personal development",
        "Coaches, consultants, and educators",
        "Newcomers to biosomatic methods",
      ],
      content: [
        "Introduction to the body–subconscious connection",
        "Muscle memory and posture analysis exercises",
        "Energy management practices",
        "Hands-on workshops with feedback",
      ],
      format: "In-person and online group training",
      duration: "Schedule shared after application",
      certificate: "Certificate of attendance provided",
    },
  },
  {
    slug: "hipnosomatik",
    icon: "mind",
    tr: {
      title: "Hipnosomatik Eğitimi",
      tagline: "Bilinçaltı ile beden arasındaki köprü",
      summary:
        "Bilinçaltı çalışmalarını beden temelli tekniklerle birleştiren, biosomatik eğitiminin üzerine inşa edilen orta seviye program.",
      audience: [
        "Biosomatik eğitimini tamamlamış katılımcılar",
        "Bilinçaltı çalışmalarını derinleştirmek isteyenler",
        "Kendi uygulama pratiğini geliştirmek isteyen kişisel gelişim uzmanları",
      ],
      content: [
        "Hipnosomatik yaklaşımın temel ilkeleri",
        "Bilinçaltı-beden egzersizleri",
        "Vaka çalışmaları üzerinden uygulama",
        "Süpervizyonlu pratik seansları",
      ],
      format: "Yüz yüze ve online seçenekli grup eğitimi",
      duration: "Program süresi ve takvim başvuru sonrası paylaşılır",
      certificate: "Katılım belgesi verilir",
    },
    en: {
      title: "Hypnosomatic Training",
      tagline: "The bridge between the subconscious and the body",
      summary:
        "An intermediate program that combines subconscious work with body-based techniques, building on the biosomatic training.",
      audience: [
        "Graduates of the biosomatic training",
        "Those who want to deepen subconscious work",
        "Personal development practitioners refining their own practice",
      ],
      content: [
        "Core principles of the hypnosomatic approach",
        "Subconscious–body exercises",
        "Applied case studies",
        "Supervised practice sessions",
      ],
      format: "In-person and online group training",
      duration: "Schedule shared after application",
      certificate: "Certificate of attendance provided",
    },
  },
  {
    slug: "hipnoz-uygulayici-sertifika-programi",
    icon: "certificate",
    tr: {
      title: "Hipnoz Uygulayıcı Sertifika Programı",
      tagline: "Psikosomatik hipnoza giriş ve uygulama sertifikası",
      summary:
        "Psikosomatik hipnoza giriş bilgilerini aktaran, zihin-beden bağlantısını psikosomatik süreçlerle ele alan uzmanlarla birlikte yürütülen sertifika programı.",
      audience: [
        "Lisans veya doktora düzeyinde ilgili alanlarda çalışan/öğrenim gören kişiler",
        "Danışmanlık ve koçluk pratiğine hipnoz temelli teknik eklemek isteyenler",
        "Alanında uzman eğitmenlerden sertifikalı eğitim almak isteyenler",
      ],
      content: [
        "Hipnoza giriş: temel kavramlar ve güvenli uygulama ilkeleri",
        "Zihin-beden bağlantısı ve psikosomatik süreçler",
        "Uzman doktor ve eğitmenler eşliğinde seminerler",
        "Uygulayıcı sertifikası için değerlendirme süreci",
      ],
      format: "Seminer ve atölye ağırlıklı, yüz yüze ve online seçenekli",
      duration: "Program süresi ve takvim başvuru sonrası paylaşılır",
      certificate: "Hipnoz Uygulayıcı Sertifikası (program şartlarını tamamlayanlara)",
    },
    en: {
      title: "Certified Hypnosis Practitioner Program",
      tagline: "Introduction to psychosomatic hypnosis and certification",
      summary:
        "A certificate program covering the fundamentals of psychosomatic hypnosis and the mind-body connection, delivered with expert physicians and instructors.",
      audience: [
        "Undergraduate/graduate-level professionals in related fields",
        "Coaches and consultants who want to add hypnosis-based techniques",
        "Anyone seeking a certified program from experienced instructors",
      ],
      content: [
        "Introduction to hypnosis: core concepts and safe practice principles",
        "Mind-body connection and psychosomatic processes",
        "Seminars with expert physicians and instructors",
        "Assessment process for practitioner certification",
      ],
      format: "Seminar and workshop-based, in-person and online",
      duration: "Schedule shared after application",
      certificate: "Certified Hypnosis Practitioner certificate (upon completion)",
    },
  },
];

export function getProgram(slug: string) {
  return programs.find((p) => p.slug === slug);
}

export function programField(p: Program, locale: Locale) {
  return p[locale];
}

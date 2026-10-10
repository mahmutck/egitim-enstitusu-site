import type { Metadata } from "next";
import RemoteCertificateRecord from "../components/RemoteCertificateRecord";

type GraduateRecord = {
  title: string;
  subtitle?: string;
  graduates?: string[];
  note?: string;
  certificateUrl?: string;
  certificateLabel?: string;
};

const records: Record<string, GraduateRecord> = {
  "hipnosomatik-17": {
    title: "Hipnosomatik Eğitimi · 21–25 Kasım 2025",
    subtitle: "Başarı ile tamamlayanların listesi aşağıdaki gibidir.",
    graduates: ["Ayşegül Tosun", "Dilek Ahrian", "Fatma Emin", "Ganime Saadet Çavuşoğlu", "Gülcan Kavlak", "Elif Başkut", "Burcu Atalay", "Hasan Demir", "Kübra Gümüştepe", "Leman Müezzinoğlu", "Nadide Sedef Suyun", "Nazlı Fırat", "Nilüfer Yurtseven", "Nurevşan Sema Hazırlar", "Cemalettin Sarı", "Tuğba Tutar", "Yasemin Budak", "Yıldız Makbul", "Yusuf Kılıçlar"],
  },
  "hipnosomatik-0018": {
    title: "Mezun Listesi",
    subtitle: "12–16 Aralık 2025 tarihli Hipnosomatik teorik eğitimini başarı ile tamamlayanlar",
    graduates: ["Arzu Demir", "Aydan Kekik", "Ayşe Evin", "Ayşegül Tan", "Ayşe Gül Genç", "Ayşegül Işık", "Eda Karaçadır", "Merve Seher Hazırlar", "Naime Çöğür", "Mehmet Bastem", "Şengül Demirel", "Saniye Tuana Küçüksu", "Ümran Fırat"],
  },
  "hipnosomatik-00019": {
    title: "Hipnosomatik Teorik Eğitimi · 15–22 Mayıs 2026",
    subtitle: "Başarı ile tamamlayanların listesi aşağıdadır.",
    graduates: ["Alev İlhan Göçmezoğlu", "Alicia Balcı Karamağara", "Ayşe Özdemir", "Berna Kartal", "Bahriye Turan", "Deniz Kabaklı", "Elif Cemre Işık", "Hacer Sünger", "Laila Diril", "Zeynep Kabaklı", "Nimet Atasoy", "Nurtaç Doğan", "Nuran Topalak", "Meral Can", "Banu Acar", "Saniye Emel Kulüp", "Juraeva Zulaykho", "Zehra Kodal Kassem"],
  },
  biosomatik11: {
    title: "Biosomatik Eğitimi · 10–20 Nisan 2025",
    subtitle: "Başarı ile tamamlayan katılımcılar",
    graduates: ["Banu Acar · Sertifika No: IS-11-025", "Psk. Gizem Badem · Sertifika No: IS-11-017"],
    note: "Mezunumuz Psk. Gizem Badem’in sertifika kaydına aşağıdaki bağlantıdan ulaşabilirsiniz.",
    certificateUrl: "/certificates/biosomatik-sertifika.pdf",
    certificateLabel: "Biosomatik sertifikasını görüntüle",
  },
  "eğitim-enstitüsü1": {
    title: "Eğitim Enstitüsü Sertifika Kaydı",
    subtitle: "Sertifika belgesi",
    note: "Bu sayfa, Eğitim Enstitüsü tarafından düzenlenen sertifika belgesinin doğrulama kaydı için oluşturulmuştur.",
    certificateUrl: "/certificates/egitim-enstitusu-sertifika.pdf",
    certificateLabel: "Sertifika belgesini görüntüle",
  },
  "hipnosomatik-0020": {
    title: "Hipnosomatik Eğitimi · 12–13 Temmuz",
    subtitle: "Eğitimi başarı ile tamamlayanlar",
    graduates: ["Fiten Demiral", "Hasan Demir", "Nilay Yağızer", "Nilüfer Yurtseven", "Nimet Atasoy", "Nuran Topalak", "Öznur Demiral", "Yusuf Kılıçlar"],
    note: "Mezunlarımıza başarılar dileriz.",
  },
  "21-grup-hipnosomatik": {
    title: "21. Grup Hipnosomatik Eğitimi · 25–26 Temmuz 2026",
    subtitle: "Eğitimi başarı ile tamamlayanlar",
    graduates: ["Alev İlhan", "Andreea Stati", "Arzu Demir", "Burcu Atalay", "Hacer Sünger", "Belma Yüksel", "Bedriye Esen", "Evren Arslan", "Fatma Emin", "Firdevs Arslan", "Hülya Tağısoy", "Hasan Demir", "Laila Diril", "Müslim Dişkaya", "Nadide Sedef Süyün", "Nilay Yağızer", "Nuran Topalak", "Yıldız Makbule Teke"],
  },
  mezunlar: {
    title: "Mezunlarımız",
    subtitle: "Eğitimlerini başarıyla tamamlayan katılımcıların sertifika doğrulama kayıtları",
    note: "Bu doğrulama alanı, sertifikalar üzerinde yer alan QR kodlar aracılığıyla erişilmek üzere hazırlanmıştır.",
  },
};

function recordFor(slug: string[]) {
  const joined = slug.join("/");
  return records[joined] ?? (joined === "egitim-enstitusu1" ? records["eğitim-enstitüsü1"] : undefined);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const record = recordFor((await params).slug);
  return {
    title: record ? `${record.title} | Eğitim Enstitüsü` : "Sayfa bulunamadı | Eğitim Enstitüsü",
    robots: { index: false, follow: false },
  };
}

export default async function GraduateVerificationPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const slug = (await params).slug.join("/");
  return <main className="certificate-page"><header className="certificate-header"><a className="certificate-brand" href="/" aria-label="Eğitim Enstitüsü ana sayfa"><img src="/images/logo-emblem.png" alt="Eğitim Enstitüsü" width="70" height="74" /><span><strong>Psikolojik Araştırmalar Enstitüsü</strong><small>Eğitim Enstitüsü · Sertifika Doğrulama</small></span></a><span className="certificate-status"><i /> Doğrulama kaydı</span></header><RemoteCertificateRecord slug={slug}/><footer className="certificate-footer">© 2026 Psikolojik Araştırmalar Enstitüsü · Sertifika doğrulama kaydı</footer></main>;
}

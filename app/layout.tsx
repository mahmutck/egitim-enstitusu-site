import type { Metadata } from "next";
import "./globals.css";
import FloatingContactVisibility from "./components/FloatingContactVisibility";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "Psikolojik Araştırmalar Enstitüsü",
  alternateName: "Eğitim Enstitüsü",
  legalName: "Uluslararası Akreditasyon ve Psikolojik Araştırmalar Enstitüsü Eğitim Danışmanlık Ltd. Şti.",
  url: "https://eenstitu.com/",
  logo: "https://eenstitu.com/apple-touch-icon.png",
  email: "info@eenstitu.com",
  telephone: "+90 505 505 34 20",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Nurtepe Mahallesi Çeşme Sokak No:30/1 Ekşioğlu Sadabat Park Evleri C Blok 18",
    addressLocality: "Kağıthane",
    addressRegion: "İstanbul",
    addressCountry: "TR",
  },
  sameAs: ["https://www.instagram.com/egitimenstitu/"],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://eenstitu.com"),
  title: "Psikolojik Araştırmalar Enstitüsü | Eğitim Enstitüsü",
  description: "Biosomatik, hipnosomatik ve hipnoz uygulayıcı eğitim programları. Psikolojik ve somatik araştırmalarda güvenilir, uygulamalı eğitim.",
  applicationName: "Eğitim Enstitüsü",
  manifest: "/manifest.webmanifest",
  themeColor: "#0b1d33",
  appleWebApp: {
    capable: true,
    title: "Eğitim Enstitüsü",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/images/favicon.png", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/images/favicon.png",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Psikolojik Araştırmalar Enstitüsü",
    description: "Bedenin bilgisini, zihnin derinliğiyle buluşturun.",
    type: "website",
    locale: "tr_TR",
    alternateLocale: "en_US",
    images: [{ url: "/og.png", width: 1733, height: 910, alt: "Psikolojik Araştırmalar Enstitüsü" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Psikolojik Araştırmalar Enstitüsü",
    description: "Bedenin bilgisini, zihnin derinliğiyle buluşturun.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr"><body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />{children}<FloatingContactVisibility /></body></html>;
}

import { notFound } from "next/navigation";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;

  return (
    <>
      <Header lang={locale} />
      <main>{children}</main>
      <Footer lang={locale} />
      <WhatsAppFloat
        message={
          locale === "tr"
            ? "Merhaba, eğitim programlarınız hakkında bilgi almak istiyorum."
            : "Hello, I would like more information about your programs."
        }
      />
    </>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Psikolojik Araştırmalar Enstitüsü",
  description:
    "Biosomatik ve hipnosomatik teknikler üzerine lisans ve doktora destek eğitimleri.",
  icons: { icon: "/images/favicon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased">{children}</body>
    </html>
  );
}

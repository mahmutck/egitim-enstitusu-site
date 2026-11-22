import type { Metadata } from "next";
import Link from "next/link";
import PublicCertificate from "../../components/PublicCertificate";

export const metadata: Metadata = {
  title: "Sertifika | Eğitim Enstitüsü",
  robots: { index: false, follow: false },
};

export default async function CertificatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="certificate-page">
      <header className="certificate-header">
        <Link className="certificate-brand" href="/" aria-label="Eğitim Enstitüsü ana sayfa">
          <img src="/images/logo-emblem.png" alt="Eğitim Enstitüsü" width="70" height="74" />
          <span><strong>Psikolojik Araştırmalar Enstitüsü</strong><small>Eğitim Enstitüsü · Sertifika Doğrulama</small></span>
        </Link>
        <span className="certificate-status"><i /> Sertifika kaydı</span>
      </header>
      <PublicCertificate token={token} />
      <footer className="certificate-footer">© 2026 Psikolojik Araştırmalar Enstitüsü · Sertifika doğrulama kaydı</footer>
    </main>
  );
}

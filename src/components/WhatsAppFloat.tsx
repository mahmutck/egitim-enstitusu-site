import { whatsappUrl } from "@/lib/site";

export default function WhatsAppFloat({ message }: { message: string }) {
  return (
    <a
      href={whatsappUrl(message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-navy-900/20 transition hover:scale-105"
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="currentColor" aria-hidden="true">
        <path d="M16.004 3C9.377 3 4 8.373 4 15c0 2.29.638 4.437 1.744 6.264L4 29l7.955-1.706A11.93 11.93 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3Zm6.976 16.87c-.297.836-1.47 1.53-2.406 1.73-.64.136-1.475.245-4.29-.92-3.596-1.49-5.91-5.13-6.09-5.37-.178-.24-1.454-1.936-1.454-3.693s.918-2.62 1.244-2.98c.297-.325.65-.407.867-.407.217 0 .434.002.624.012.2.01.47-.076.735.56.297.71.99 2.467 1.077 2.646.09.18.15.39.03.63-.118.24-.178.39-.355.6-.178.21-.373.47-.533.63-.178.18-.363.375-.157.735.208.36.923 1.523 1.98 2.466 1.36 1.213 2.507 1.59 2.868 1.77.36.18.57.15.78-.09.208-.24.892-1.04 1.13-1.398.238-.36.475-.3.8-.18.327.12 2.07.977 2.425 1.155.356.18.593.27.68.42.09.15.09.87-.207 1.706Z" />
      </svg>
    </a>
  );
}

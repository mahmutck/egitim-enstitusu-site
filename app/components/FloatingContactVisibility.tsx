"use client";

import { usePathname } from "next/navigation";
import FloatingContact from "./FloatingContact";

const publicPaths = new Set(["/", "/iletisim", "/instagram", "/programlar", "/whatsapp"]);

export default function FloatingContactVisibility() {
  const pathname = usePathname();
  const decodedPathname = decodeURIComponent(pathname);

  if (!publicPaths.has(decodedPathname)) return null;

  return <FloatingContact />;
}

"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";

// Azok az útvonalak, ahol NEM szeretnénk Navbar-t és Footer-t megjeleníteni –
// pl. a chat/párosító oldal, mert ott a saját, teljes képernyős (h-[100dvh])
// elrendezését használja, és a fejléc/lábléc csak zavarna.
// Ha az útvonal máshol van, csak ezt a listát kell módosítani.
const NAVBAR_FOOTER_NELKUL = ["/dashboard"];

function elrejtveEEzenAzUtvonalon(pathname: string | null) {
  if (!pathname) return false;
  return NAVBAR_FOOTER_NELKUL.some(
    (utvonal) => pathname === utvonal || pathname.startsWith(`${utvonal}/`)
  );
}

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const elrejtve = elrejtveEEzenAzUtvonalon(pathname);

  return (
    <>
      {!elrejtve && <Navbar />}
      <div className="flex-1">{children}</div>
      {!elrejtve && <Footer />}
    </>
  );
}
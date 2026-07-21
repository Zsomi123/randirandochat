import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-[#0a0c11] border-t border-white/[0.06] text-gray-400 text-xs py-12 mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand info */}
        <div className="space-y-3">
          <div className="font-[family-name:var(--font-fraunces)] italic text-xl font-medium text-white">
            Randirandochat
          </div>
          <p className="text-gray-500 text-[11px] leading-relaxed">
            Biztonságos, villámgyors és 100%-ban anonim vakrandi chat. Találd
            meg a hozzád illő embert a közös hobbik és megyék alapján!
          </p>
        </div>

        {/* Gyorslinkek */}
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">Navigáció</h4>
          <ul className="space-y-2 text-[12px]">
            <li><a href="#hogyan-működik" className="hover:text-pink-400 transition">Hogyan működik?</a></li>
            <li><a href="#biztonsag" className="hover:text-pink-400 transition">Anonimitás & Biztonság</a></li>
            <li><a href="#gyik" className="hover:text-pink-400 transition">Gyakori kérdések</a></li>
            <li><a href="#parositas" className="hover:text-pink-400 transition">Párosítás elindítása</a></li>
          </ul>
        </div>

        {/* Jogi dolgok */}
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">Jogi nyilatkozatok</h4>
          <ul className="space-y-2 text-[12px]">
            <li><Link href="#" className="hover:text-pink-400 transition">Általános Szerződési Feltételek</Link></li>
            <li><Link href="#" className="hover:text-pink-400 transition">Adatvédelmi Tájékoztató</Link></li>
            <li><Link href="#" className="hover:text-pink-400 transition">Sütiszabályzat (Cookies)</Link></li>
          </ul>
        </div>

        {/* 18+ Figyelmeztetés */}
        <div className="space-y-2">
          <h4 className="text-white font-semibold mb-3 text-sm">Korhatár</h4>
          <div className="inline-block px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded-md font-bold text-xs">
            🔞 Kizárólag 18 éven felülieknek!
          </div>
          <p className="text-[10px] text-gray-500 leading-normal">
            Az oldalt csak 18. életévüket betöltött személyek használhatják.
            Kérjük, tartsd be a közösségi irányelveket a beszélgetések során.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 border-t border-white/[0.06] mt-8 pt-6 text-center text-[11px] text-gray-600">
        © {new Date().getFullYear()} Randirandochat. Minden jog fenntartva.
      </div>
    </footer>
  );
}
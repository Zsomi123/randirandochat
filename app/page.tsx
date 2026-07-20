"use client"; // Megmondjuk a Next.js-nek, hogy ez az oldal interaktív (kliensoldali) lesz

import { useState } from "react";
import { useRouter } from "next/navigation"; // Behozzuk a navigációs eszközt
import MagyarorszagTerkep from "./components/MagyarorszagTerkep"; // Behozzuk a frissített térkép komponenst

export default function Home() {
  const router = useRouter(); // Létrehozzuk a navigátort az oldalak közötti váltáshoz

  // A felhasználói adatok memóriája (State-ek)
  const [nev, setNev] = useState("");
  const [kor, setKor] = useState("");
  const [nem, setNem] = useState("férfi");
  const [keresettNem, setKeresettNem] = useState("nő");
  
  // A megyék memóriája: stringek listáját (tömböt) tárol, kezdetben üres = Egész ország
  const [kijeloltMegyek, setKijeloltMegyek] = useState<string[]>([]); 
  const [hobbik, setHobbik] = useState("");

  // Ez a függvény fut le, amikor a felhasználó rákattint a "Párosítás indítása" gombra
  const handleInditas = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nev.trim() || !kor) return;

    const zonaParameter = kijeloltMegyek.length === 0 ? "Egész ország" : kijeloltMegyek.join(",");

    // Átirányítás a dashboardra, de most már továbbítjuk az összes fontos adatot
    router.push(
      `/dashboard?nev=${encodeURIComponent(nev)}&kor=${encodeURIComponent(kor)}&nem=${encodeURIComponent(nem)}&keresettNem=${encodeURIComponent(keresettNem)}&megye=${encodeURIComponent(zonaParameter)}&hobbik=${encodeURIComponent(hobbik)}`
    );
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-900 text-white">
      <div className="w-full max-w-md p-8 bg-gray-800 rounded-2xl shadow-xl border border-gray-700">
        
        <h1 className="text-3xl font-bold mb-2 text-center text-pink-500 tracking-wide">
          Randirandochat
        </h1>
        <p className="text-sm text-gray-400 text-center mb-6">
          Kizárólag felnőtteknek! Találd meg a partnered vakrandin.
        </p>

        {/* Az űrlap kezdete */}
        <form onSubmit={handleInditas} className="space-y-4">
          
          {/* Név mező */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Becenév
            </label>
            <input 
              type="text" 
              required
              placeholder="Pl. Anonimusz"
              value={nev}
              onChange={(e) => setNev(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:border-pink-500 text-white text-sm"
            />
          </div>

          {/* Kor mező */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Életkor (18+)
            </label>
            <input 
              type="number" 
              required
              min="18"
              max="100"
              placeholder="Pl. 25"
              value={kor}
              onChange={(e) => setKor(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:border-pink-500 text-white text-sm"
            />
          </div>

          {/* Nemek (Két oszlopban) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Te nemed
              </label>
              <select 
                value={nem} 
                onChange={(e) => setNem(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:border-pink-500 text-white text-sm"
              >
                <option value="férfi">Férfi</option>
                <option value="nő">Nő</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Kit keresel?
              </label>
              <select 
                value={keresettNem} 
                onChange={(e) => setKeresettNem(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:border-pink-500 text-white text-sm"
              >
                <option value="nő">Nőt</option>
                <option value="férfi">Férfit</option>
                <option value="bárki">Bárkit</option>
              </select>
            </div>
          </div>

          {/* INTERAKTÍV TÉRKÉP PANEL
              Átadjuk a kijelölt megyék listáját és a frissítő függvényt a komponensnek */}
          <MagyarorszagTerkep 
  kijeloltMegyek={kijeloltMegyek} 
  onMegyekModositasa={setKijeloltMegyek} 
/>

          {/* Hobbik mező */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Hobbik, tulajdonságok (vesszővel elválasztva)
            </label>
            <input 
              type="text" 
              placeholder="Pl. főzés, gaming, mozi"
              value={hobbik}
              onChange={(e) => setHobbik(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:border-pink-500 text-white text-sm"
            />
          </div>

          {/* Indító gomb */}
          <button 
            type="submit"
            className="w-full mt-2 p-4 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold rounded-lg shadow-lg transition duration-200 transform active:scale-95 text-sm"
          >
            Párosítás indítása
          </button>

        </form>
      </div>
    </main>
  );
}
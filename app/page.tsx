"use client"; // Megmondjuk a Next.js-nek, hogy ez az oldal interaktív (kliensoldali) lesz

import { useState } from "react";
import { useRouter } from "next/navigation"; // Behozzuk a navigációs eszközt
import MagyarorszagTerkep from "./components/MagyarorszagTerkep"; // Behozzuk a frissített térkép komponenst

// Előre megadott hobbik / érdeklődési körök, amikből lehet választani
const HOBBI_JAVASLATOK = [
  "főzés", "gaming", "mozi", "sorozatok", "sport", "edzés", "zene",
  "utazás", "olvasás", "természetjárás", "fotózás", "tánc", "állatok",
  "kertészkedés", "borozás", "kávézás", "festés", "programozás",
];

export default function Home() {
  const router = useRouter(); // Létrehozzuk a navigátort az oldalak közötti váltáshoz

  // A felhasználói adatok memóriája (State-ek)
  const [nev, setNev] = useState("");
  const [kor, setKor] = useState("");
  const [nem, setNem] = useState("férfi");
  const [keresettNem, setKeresettNem] = useState("nő");

  // Milyen korú partnert keres (tartomány)
  const [korMin, setKorMin] = useState("18");
  const [korMax, setKorMax] = useState("99");

  // A megyék memóriája: stringek listáját (tömböt) tárol, kezdetben üres = Egész ország
  const [kijeloltMegyek, setKijeloltMegyek] = useState<string[]>([]);

  // Hobbik / érdeklődési körök: választható lista + egyedi hozzáadás
  const [kijeloltHobbik, setKijeloltHobbik] = useState<string[]>([]);
  const [egyediHobbi, setEgyediHobbi] = useState("");

  const [hibaUzenet, setHibaUzenet] = useState("");

  const toggleHobbi = (hobbi: string) => {
    setKijeloltHobbik((prev) =>
      prev.includes(hobbi) ? prev.filter((h) => h !== hobbi) : [...prev, hobbi]
    );
  };

  const hozzaadEgyediHobbi = () => {
    const tiszta = egyediHobbi.trim().toLowerCase();
    if (tiszta && !kijeloltHobbik.includes(tiszta)) {
      setKijeloltHobbik((prev) => [...prev, tiszta]);
    }
    setEgyediHobbi("");
  };

  // Ez a függvény fut le, amikor a felhasználó rákattint a "Párosítás indítása" gombra
  const handleInditas = async (e: React.FormEvent) => {
    e.preventDefault();
    setHibaUzenet("");

    if (!nev.trim() || !kor) return;

    const kMin = parseInt(korMin, 10);
    const kMax = parseInt(korMax, 10);
    if (isNaN(kMin) || isNaN(kMax) || kMin < 18 || kMax < kMin) {
      setHibaUzenet("Kérlek adj meg egy érvényes korhatár-tartományt (min. 18 év).");
      return;
    }

    const zonaLista = kijeloltMegyek.length === 0 ? ["Egész ország"] : kijeloltMegyek;

    try {
      // 1. Beküldjük az adatokat a PostgreSQL adatbázisba
      const res = await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nev,
          kor,
          nem,
          keresettNem,
          megyek: zonaLista,
          hobbik: kijeloltHobbik, // <-- ITT: kijeloltHobbik-ra cseréltük!
        }),
      });

      const data = await res.json();

      if (data.success) {
        // 2. Ha sikeres volt az elmentés, átlépünk a dashboardra a kapott userId-val!
        router.push(
          `/dashboard?userId=${data.userId}&nev=${encodeURIComponent(nev)}&kor=${encodeURIComponent(kor)}&nem=${encodeURIComponent(nem)}&keresettNem=${encodeURIComponent(keresettNem)}&korMin=${encodeURIComponent(korMin)}&korMax=${encodeURIComponent(korMax)}&megye=${encodeURIComponent(zonaLista.join(","))}&hobbik=${encodeURIComponent(kijeloltHobbik.join(","))}`
        );
      } else {
        setHibaUzenet("Hiba a mentés során: " + data.error);
      }
    } catch (err) {
      console.error(err);
      setHibaUzenet("Nem sikerült kapcsolódni a szerverhez.");
    }
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

          {/* Korhatár tartomány, hogy hány éves partnert keres */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Milyen korú partnert keresel?
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                required
                min="18"
                max="100"
                value={korMin}
                onChange={(e) => setKorMin(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:border-pink-500 text-white text-sm"
              />
              <span className="text-gray-500 text-xs">–</span>
              <input
                type="number"
                required
                min="18"
                max="100"
                value={korMax}
                onChange={(e) => setKorMax(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:border-pink-500 text-white text-sm"
              />
            </div>
            {hibaUzenet && (
              <p className="text-[11px] text-red-400 mt-1">{hibaUzenet}</p>
            )}
          </div>

          {/* INTERAKTÍV TÉRKÉP PANEL
              Átadjuk a kijelölt megyék listáját és a frissítő függvényt a komponensnek */}
          <MagyarorszagTerkep
            kijeloltMegyek={kijeloltMegyek}
            onMegyekModositasa={setKijeloltMegyek}
          />

          {/* Hobbik / érdeklődési körök választó */}
          <div className="w-full bg-gray-950 p-4 rounded-xl border border-gray-750">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Hobbik, érdeklődési körök{" "}
              <span className="text-pink-500 normal-case font-bold">
                ({kijeloltHobbik.length} kiválasztva)
              </span>
            </label>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {HOBBI_JAVASLATOK.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => toggleHobbi(h)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                    kijeloltHobbik.includes(h)
                      ? "bg-pink-600/20 border-pink-500 text-pink-400"
                      : "bg-gray-850 border-gray-700 text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Saját hobbi hozzáadása..."
                value={egyediHobbi}
                onChange={(e) => setEgyediHobbi(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    hozzaadEgyediHobbi();
                  }
                }}
                className="flex-1 p-2.5 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:border-pink-500 text-white text-xs"
              />
              <button
                type="button"
                onClick={hozzaadEgyediHobbi}
                className="px-3 text-xs font-semibold bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 transition"
              >
                + Hozzáad
              </button>
            </div>

            {kijeloltHobbik.some((h) => !HOBBI_JAVASLATOK.includes(h)) && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {kijeloltHobbik
                  .filter((h) => !HOBBI_JAVASLATOK.includes(h))
                  .map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => toggleHobbi(h)}
                      className="text-[11px] px-2 py-1 rounded-full bg-pink-600/20 border border-pink-500 text-pink-400 hover:bg-pink-600/30 transition flex items-center gap-1"
                    >
                      {h}
                      <span className="text-pink-300">×</span>
                    </button>
                  ))}
              </div>
            )}

            <p className="text-[10px] text-gray-500 mt-2 italic text-center">
              Legalább 1 közös hobbi/érdeklődési kör kell majd a párosításhoz (ha mindkét fél megadott legalább egyet).
            </p>
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
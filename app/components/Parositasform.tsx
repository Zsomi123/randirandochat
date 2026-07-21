"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import MagyarorszagTerkep from "./MagyarorszagTerkep";

const HOBBI_LISTA = [
  "Zene", "Film & sorozat", "Sport", "Utazás", "Olvasás", "Gaming",
  "Főzés", "Természetjárás", "Fotózás", "Művészet", "Állatok",
  "Fitness", "Tánc", "Borkultúra", "Kávékultúra", "Motorozás",
];

export default function ParositasForm() {
  const router = useRouter();

  const [becenev, setBecenev] = useState("");
  const [kor, setKor] = useState("");
  const [nem, setNem] = useState("férfi");
  const [keresettNem, setKeresettNem] = useState("nő");
  const [korMin, setKorMin] = useState("18");
  const [korMax, setKorMax] = useState("40");
  const [megyek, setMegyek] = useState<string[]>([]);
  const [hobbik, setHobbik] = useState<string[]>([]);
  const [hiba, setHiba] = useState("");

  const hobbiValt = (h: string) => {
    setHobbik((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHiba("");

    const korSzam = Number(kor);
    const korMinSzam = Number(korMin);
    const korMaxSzam = Number(korMax);

    if (!becenev.trim()) {
      setHiba("Adj meg egy becenevet a folytatáshoz.");
      return;
    }
    if (!korSzam || korSzam < 18) {
      setHiba("A szolgáltatás csak 18 éven felülieknek elérhető.");
      return;
    }
    if (korMinSzam < 18 || korMaxSzam < korMinSzam) {
      setHiba("Ellenőrizd a korhatár mezőket – a minimum nem lehet 18 alatt.");
      return;
    }

    const params = new URLSearchParams({
      nev: becenev.trim(),
      kor: String(korSzam),
      nem,
      keresettNem,
      korMin: String(korMinSzam),
      korMax: String(korMaxSzam),
      megye: megyek.length === 0 || megyek.length === 20 ? "Egész ország" : megyek.join(","),
      hobbik: hobbik.join(","),
    });

    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Alapadatok */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
            Becenév
          </label>
          <input
            type="text"
            value={becenev}
            onChange={(e) => setBecenev(e.target.value)}
            placeholder="pl. Napsugár22"
            maxLength={20}
            className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/10 focus:border-pink-500 text-white text-sm transition outline-none"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
            Korod
          </label>
          <input
            type="number"
            min={18}
            max={99}
            value={kor}
            onChange={(e) => setKor(e.target.value)}
            placeholder="18+"
            className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/10 focus:border-pink-500 text-white text-sm transition outline-none"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
            Nemed
          </label>
          <select
            value={nem}
            onChange={(e) => setNem(e.target.value)}
            className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/10 focus:border-pink-500 text-white text-sm transition outline-none"
          >
            <option className="bg-[#12151c]" value="férfi">Férfi</option>
            <option className="bg-[#12151c]" value="nő">Nő</option>
            <option className="bg-[#12151c]" value="egyéb">Egyéb</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
            Kit keresel?
          </label>
          <select
            value={keresettNem}
            onChange={(e) => setKeresettNem(e.target.value)}
            className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/10 focus:border-pink-500 text-white text-sm transition outline-none"
          >
            <option className="bg-[#12151c]" value="férfi">Férfit</option>
            <option className="bg-[#12151c]" value="nő">Nőt</option>
            <option className="bg-[#12151c]" value="mindegy">Mindegy</option>
          </select>
        </div>
      </div>

      {/* Korhatár tartomány */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
          Partner korhatára: <span className="text-pink-400 normal-case font-bold">{korMin}–{korMax} év</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="range"
            min={18}
            max={99}
            value={korMin}
            onChange={(e) => setKorMin(e.target.value)}
            className="w-full accent-pink-500"
          />
          <input
            type="range"
            min={18}
            max={99}
            value={korMax}
            onChange={(e) => setKorMax(e.target.value)}
            className="w-full accent-pink-500"
          />
        </div>
      </div>

      {/* Megye térkép */}
      <MagyarorszagTerkep kijeloltMegyek={megyek} onMegyekModositasa={setMegyek} />

      {/* Hobbik */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
          Érdeklődési körök <span className="text-gray-600 normal-case font-normal">(opcionális, jobb párosításhoz)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {HOBBI_LISTA.map((h) => (
            <button
              type="button"
              key={h}
              onClick={() => hobbiValt(h)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                hobbik.includes(h)
                  ? "bg-pink-500/15 border-pink-500/50 text-pink-300"
                  : "bg-white/[0.03] border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300"
              }`}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      {hiba && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {hiba}
        </p>
      )}

      <button
        type="submit"
        className="w-full py-4 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-sm tracking-wide shadow-lg shadow-pink-500/20 transition active:scale-[0.99]"
      >
        Párosítás indítása →
      </button>
      <p className="text-[10px] text-gray-500 text-center -mt-3">
        A gomb megnyomásával megerősíted, hogy 18. életévedet betöltötted.
      </p>
    </form>
  );
}
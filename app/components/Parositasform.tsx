"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import MagyarorszagTerkep from "./MagyarorszagTerkep";

const HOBBI_LISTA = [
  "Zene", "Film & sorozat", "Sport", "Utazás", "Olvasás", "Gaming",
  "Főzés", "Természetjárás", "Fotózás", "Művészet", "Állatok",
  "Fitness", "Tánc", "Borkultúra", "Kávékultúra", "Motorozás",
];

export default function ParositasForm() {
  const router = useRouter();
  
  // Lekérjük a bejelentkezett felhasználó adatait
  const { data: session } = useSession(); 

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHiba("");

    // Ha nincs bejelentkezve, elindítjuk a Google bejelentkezést!
    if (!session || !session.user?.email) {
      signIn("google");
      return;
    }

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

    const veglegesMegyek = megyek.length === 0 || megyek.length === 20 ? ["Egész ország"] : megyek;
    const megyeString = veglegesMegyek.join(",");

    try {
      const res = await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nev: becenev.trim(),
          kor: String(korSzam),
          nem,
          keresettNem,
          megyek: veglegesMegyek,
          hobbik,
          email: session.user.email, // Átadjuk az email címet az azonosításhoz!
        }),
      });

      const data = await res.json();

      if (data.success) {
        const params = new URLSearchParams({
          userId: data.userId,
          nev: becenev.trim(),
          kor: String(korSzam),
          nem,
          keresettNem,
          korMin: String(korMinSzam),
          korMax: String(korMaxSzam),
          megye: megyeString,
          hobbik: hobbik.join(","),
        });

        router.push(`/dashboard?${params.toString()}`);
      } else {
        setHiba("Hiba az adatbázis mentés során: " + data.error);
      }
    } catch (err) {
      console.error(err);
      setHiba("Nem sikerült kapcsolódni a szerverhez.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ... (Ide jönnek a korábbi mezők: Becenév, Kor, Nem, Térkép, Hobbik - ez a rész teljesen változatlan) ... */}
      
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

      {/* DINAMIKUS GOMB */}
      <button
        type="submit"
        className="w-full py-4 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-sm tracking-wide shadow-lg shadow-pink-500/20 transition active:scale-[0.99] flex justify-center items-center gap-2"
      >
        {!session ? (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Belépés Google-lel a kezdéshez
          </>
        ) : (
          "Párosítás indítása →"
        )}
      </button>

      <p className="text-[10px] text-gray-500 text-center -mt-3">
        {session ? "A gomb megnyomásával frissítjük a profilodat és indul a keresés." : "A szolgáltatás használatához bejelentkezés szükséges."}
      </p>
    </form>
  );
}
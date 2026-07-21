"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";

type Uzenet = { felado: "en" | "partner" | "rendszer"; szoveg: string };
type PartnerAdat = { becenev: string; nem: string; kor: number; hobbik?: string[] } | null;

function DashboardTartalom() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sajatNev = searchParams.get("nev") || "Ismeretlen";
  const sajatKor = searchParams.get("kor") || "18";
  const sajatNem = searchParams.get("nem") || "férfi";
  const keresettNem = searchParams.get("keresettNem") || "nő";
  const korMin = searchParams.get("korMin") || "18";
  const korMax = searchParams.get("korMax") || "99";
  const megye = searchParams.get("megye") || "Egész ország";
  const hobbik = searchParams.get("hobbik") || "";

  const [socket, setSocket] = useState<Socket | null>(null);
  const [keresesFolyamatban, setKeresesFolyamatban] = useState(true);
  const [partner, setPartner] = useState<PartnerAdat>(null);
  const [kozosHobbik, setKozosHobbik] = useState<string[]>([]);
  const [uzenetek, setUzenetek] = useState<Uzenet[]>([]);
  const [uzenetSzoveg, setUzenetSzoveg] = useState("");
  const [szoba, setSzoba] = useState("");

  const uzenetVegRef = useRef<HTMLDivElement>(null);

  // Egy helyen tartjuk a regisztrációs csomagot, hogy ne kelljen mindenhol újraépíteni
  const regisztraciosAdat = () => ({
    nev: sajatNev,
    kor: sajatKor,
    nem: sajatNem,
    keresettNem: keresettNem,
    korMin: korMin,
    korMax: korMax,
    megyek: megye === "Egész ország" ? [] : megye.split(","),
    hobbik: hobbik ? hobbik.split(",").filter(Boolean) : [],
  });

  useEffect(() => {
    const ujSocket = io("http://localhost:5001", { forceNew: true });
    setSocket(ujSocket);

    ujSocket.on("connect", () => {
      console.log("🟢 Sikeresen csatlakozva a backendhez!");
      ujSocket.emit("regisztracio_parositasra", regisztraciosAdat());
    });

    // Amikor sikeres a párosítás, megkapjuk a partner valódi adatait a szervertől
    ujSocket.on("parositas_sikeres", (adat) => {
      // Védekezés: ha valamiért hiányos adat érkezne (pl. duplikált/elavult
      // socket-esemény dev módban), ne omoljon össze az app, csak hagyjuk figyelmen kívül.
      if (!adat || !adat.partner) {
        console.warn("⚠️ Hiányos parositas_sikeres esemény érkezett, figyelmen kívül hagyva:", adat);
        return;
      }
      setSzoba(adat.szoba);
      setPartner(adat.partner);
      setKozosHobbik(adat.kozosHobbik || []);
      setKeresesFolyamatban(false);
      setUzenetek([
        {
          felado: "rendszer",
          szoveg: `Sikeres párosítás! Beszélgetőtársad: ${adat.partner.becenev}.${
            adat.kozosHobbik && adat.kozosHobbik.length > 0
              ? ` Közös érdeklődés: ${adat.kozosHobbik.join(", ")}.`
              : ""
          }`,
        },
      ]);
    });

    // FIGYELJÜK A BEJÖVŐ ÜZENETEKET
    ujSocket.on("chat_uzenet_erkezett", (adat) => {
      setUzenetek((prev) => [...prev, { felado: "partner", szoveg: adat.szoveg }]);
    });

    // FIGYELJÜK HA A PARTNER KILÉPETT VAGY ELNYOMOTT MINKET
    ujSocket.on("partner_tovabbnyomta", () => {
      setUzenetek((prev) => [...prev, { felado: "rendszer", szoveg: "A partner megszakította a kapcsolatot." }]);
      // Kis késleltetéssel automatikusan új keresést indítunk nekik
      setTimeout(() => {
        setKeresesFolyamatban(true);
        setPartner(null);
        setKozosHobbik([]);
        setUzenetek([]);
        ujSocket.emit("regisztracio_parositasra", regisztraciosAdat());
      }, 2000);
    });

    return () => {
      ujSocket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sajatNev, sajatKor, sajatNem, keresettNem, korMin, korMax, megye, hobbik]);

  useEffect(() => {
    uzenetVegRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [uzenetek, keresesFolyamatban]);

  // ÜZENET KÜLDÉSE A VALÓSÁGBAN
  const handleKuldes = (e: React.FormEvent) => {
    e.preventDefault();
    const szoveg = uzenetSzoveg.trim();
    if (!szoveg || !socket || !szoba) return;

    // Hozzáadjuk a saját képernyőnkhöz
    setUzenetek((prev) => [...prev, { felado: "en", szoveg }]);

    // KILŐJÜK A SZERVERNEK A SZOBA AZONOSÍTÓVAL EGYÜTT
    socket.emit("chat_uzenet", { szoba, szoveg });

    setUzenetSzoveg("");
  };

  // TOVÁBBNYOMÁS A VALÓSÁGBAN
  const handleKovetkezoPartner = () => {
    if (!socket) return;

    // Szólunk a szervernek, hogy lépnénk
    socket.emit("partner_eldobasa");

    // Visszaállítjuk a töltőképernyőt és újra sorba állunk
    setKeresesFolyamatban(true);
    setPartner(null);
    setKozosHobbik([]);
    setUzenetek([]);

    socket.emit("regisztracio_parositasra", regisztraciosAdat());
  };

  if (keresesFolyamatban) {
    return (
      <main className="flex h-screen flex-col items-center justify-center bg-[#0a0c11] p-6 text-white">
        <div className="flex flex-col items-center gap-2 p-8 sm:p-10 bg-white/[0.02] rounded-3xl border border-white/[0.08] shadow-xl max-w-sm w-full text-center">
          {/* Jelzőfény animáció újrahasznosítva a "keresés folyamatban" állapotra */}
          <svg viewBox="0 0 200 120" className="w-40 h-24 mb-2" aria-hidden="true">
            <line x1="50" y1="85" x2="150" y2="35" stroke="#ec489966" strokeWidth="2" className="jelzofeny-vonal" />
            <circle cx="50" cy="85" r="24" fill="#ec489918" className="jelzofeny-gyuru" />
            <circle cx="50" cy="85" r="7" fill="#ec4899" className="jelzofeny-pont" />
            <circle cx="150" cy="35" r="24" fill="#f5b75918" className="jelzofeny-gyuru" style={{ animationDelay: "1.2s" }} />
            <circle cx="150" cy="35" r="7" fill="#f5b759" className="jelzofeny-pont" style={{ animationDelay: "1.2s" }} />
          </svg>
          <div>
            <p className="text-base font-semibold text-white">Partner keresése…</p>
            <p className="text-xs text-gray-500 mt-2">Várólista ellenőrzése a szerveren</p>
            <div className="flex items-center justify-center gap-3 mt-4 text-[11px] text-gray-500 font-[family-name:var(--font-geist-mono)]">
              <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10">Zóna: {megye}</span>
              <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10">{korMin}–{korMax} év</span>
            </div>
          </div>
          <button
            onClick={() => router.push("/")}
            className="mt-6 text-xs text-gray-500 hover:text-pink-400 transition"
          >
            ← Vissza a beállításokhoz
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col bg-[#0a0c11] text-white overflow-hidden">
      <header className="p-4 bg-[#0d0f15]/90 backdrop-blur border-b border-white/[0.07] shadow-md flex items-center justify-between z-10">
        <div className="min-w-0 flex-1 pr-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => router.push("/")}
              aria-label="Vissza a főoldalra"
              className="p-1 text-gray-500 hover:text-pink-500 transition text-sm font-bold"
            >
              ←
            </button>
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            <h2 className="font-[family-name:var(--font-fraunces)] italic text-xl text-pink-400 truncate">
              {partner?.becenev}
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 font-semibold uppercase tracking-wider border border-pink-500/20">
              {partner?.nem} · {partner?.kor}
            </span>
          </div>
          {kozosHobbik.length > 0 && (
            <p className="text-[11px] text-gray-500 mt-1 truncate">
              Közös érdeklődés: <span className="text-pink-400">{kozosHobbik.join(", ")}</span>
            </p>
          )}
        </div>

        <button
          onClick={() => alert("Jelentés beküldve.")}
          className="px-3 py-1.5 text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition whitespace-nowrap active:scale-95"
        >
          Jelentés
        </button>
      </header>

      <section className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 scrollbar-thin">
        {uzenetek.map((uz, i) => (
          <div
            key={i}
            className={`flex ${uz.felado === "en" ? "justify-end" : uz.felado === "rendszer" ? "justify-center" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] sm:max-w-[65%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                uz.felado === "en"
                  ? "bg-gradient-to-br from-pink-500 to-rose-600 text-white rounded-br-md"
                  : uz.felado === "rendszer"
                  ? "bg-white/[0.04] text-gray-400 text-xs text-center rounded-lg border border-white/[0.06] px-4"
                  : "bg-white/[0.06] text-gray-100 rounded-bl-md"
              }`}
            >
              {uz.szoveg}
            </div>
          </div>
        ))}
        <div ref={uzenetVegRef} />
      </section>

      <footer className="p-3 sm:p-4 bg-[#0d0f15]/90 backdrop-blur border-t border-white/[0.07] flex flex-col sm:flex-row gap-3 items-stretch sm:items-center z-10">
        <button
          onClick={handleKovetkezoPartner}
          className="w-full sm:w-auto px-5 py-3 bg-white/[0.03] hover:bg-white/[0.07] text-gray-300 hover:text-white font-semibold rounded-xl transition duration-200 flex items-center justify-center gap-2 border border-white/10 whitespace-nowrap active:scale-95"
        >
          Következő partner →
        </button>

        <form onSubmit={handleKuldes} className="w-full flex gap-2">
          <input
            type="text"
            placeholder={partner ? `Írj ${partner.becenev} részére…` : "Írj egy üzenetet…"}
            value={uzenetSzoveg}
            onChange={(e) => setUzenetSzoveg(e.target.value)}
            maxLength={500}
            autoFocus
            className="flex-1 p-3 rounded-xl bg-white/[0.03] border border-white/10 focus:border-pink-500 text-white text-sm transition outline-none"
          />
          <button
            type="submit"
            disabled={!uzenetSzoveg.trim()}
            className="px-6 bg-pink-500 hover:bg-pink-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition active:scale-95"
          >
            Küldés
          </button>
        </form>
      </footer>
    </main>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0a0c11] flex items-center justify-center text-gray-500 text-sm">
          Betöltés…
        </main>
      }
    >
      <DashboardTartalom />
    </Suspense>
  );
}
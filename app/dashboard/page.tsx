"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client"; // Behozzuk a Socket.io klienst

type Uzenet = { felado: "en" | "partner" | "rendszer"; szoveg: string };
type PartnerAdat = { becenev: string; nem: string; kor: number; megye: string } | null;

function DashboardTartalom() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Adatok kinyerése az URL-ből
  const sajatNev = searchParams.get("nev") || "Ismeretlen";
  const sajatKor = searchParams.get("kor") || "18";
  const sajatNem = searchParams.get("nem") || "férfi";
  const keresettNem = searchParams.get("keresettNem") || "nő";
  const megye = searchParams.get("megye") || "Egész ország";
  const hobbik = searchParams.get("hobbik") || "";

  // State-ek a valós adatokhoz
  const [socket, setSocket] = useState<Socket | null>(null);
  const [keresesFolyamatban, setKeresesFolyamatban] = useState(true);
  const [partner, setPartner] = useState<PartnerAdat>(null);
  const [uzenetek, setUzenetek] = useState<Uzenet[]>([]);
  const [uzenetSzoveg, setUzenetSzoveg] = useState("");
  const [szoba, setSzoba] = useState("");
  
  const uzenetVegRef = useRef<HTMLDivElement>(null);

  // EFEKT: Kapcsolódás a backend szerverhez a belépéskor
  useEffect(() => {
    // Kapcsolódunk a Node.js szerverünkhöz az 5001-es porton
    const ujSocket = io("http://localhost:5001");
    setSocket(ujSocket);

    // Amint sikeres a kapcsolat, elküldjük a regisztrációs adatainkat a szervernek
    ujSocket.on("connect", () => {
      console.log("🟢 Sikeresen csatlakozva a backendhez!");
      ujSocket.emit("regisztracio_parositasra", {
        nev: sajatNev,
        kor: sajatKor,
        nem: sajatNem,
        keresettNem: keresettNem,
        megyek: megye.split(",")
      });
    });

    // Figyeljük, ha a szerver azt mondja: SIKERES PÁROSÍTÁS
    ujSocket.on("parositas_sikeres", (adat) => {
      console.log("✨ Párosítás sikeres!", adat);
      setSzoba(adat.szoba);
      setKeresesFolyamatban(false);
      
      // Beállítunk egy gyors ideiglenes partnert, amíg a szerver nem küld pontosabb profilt
      setPartner({
        becenev: "Valódi Partner",
        nem: keresettNem,
        kor: 25,
        megye: megye
      });

      setUzenetek([{ felado: "rendszer", szoveg: "Sikeresen összekapcsolva! Kezdjetek el beszélgetni." }]);
    });

    // Figyeljük a státuszfrissítéseket a szervertől
    ujSocket.on("statusz_frissites", (szoveg) => {
      console.log("ℹ️ Szerver státusz:", szoveg);
    });

    // Amikor az oldal bezárul, lekapcsoljuk a socketet
    return () => {
      ujSocket.disconnect();
    };
  }, [sajatNev, sajatKor, sajatNem, keresettNem, megye]);

  // Automatikus görgetés az új üzenetekhez
  useEffect(() => {
    uzenetVegRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [uzenetek, keresesFolyamatban]);

  const handleKuldes = (e: React.FormEvent) => {
    e.preventDefault();
    const szoveg = uzenetSzoveg.trim();
    if (!szoveg || !socket) return;

    // Helyileg hozzáadjuk a saját üzenetünket a képernyőhöz
    setUzenetek((prev) => [...prev, { felado: "en", szoveg }]);
    setUzenetSzoveg("");

    // Későbbi fázis: itt fogjuk socket.emit-tel kiküldeni a szobába az üzenetet
  };

  const handleKovetkezoPartner = () => {
    if (!socket) return;
    setKeresesFolyamatban(true);
    setPartner(null);
    setUzenetek([]);
    
    // Lekapcsolódunk és újraregisztrálunk, hogy a szerver új listába tegyen minket
    socket.emit("regisztracio_parositasra", {
      nev: sajatNev,
      kor: sajatKor,
      nem: sajatNem,
      keresettNem: keresettNem,
      megyek: megye.split(",")
    });
  };

  // 1. TÖLTŐKÉPERNYŐ (Amíg a szerver párt keres)
  if (keresesFolyamatban) {
    return (
      <main className="flex h-screen flex-col items-center justify-center bg-gray-950 p-6 text-white font-sans">
        <div className="flex flex-col items-center gap-4 p-8 bg-gray-900 rounded-2xl border border-gray-800 shadow-xl max-w-sm w-full text-center">
          <div className="h-12 w-12 rounded-full border-4 border-gray-800 border-t-pink-500 animate-spin" />
          <div>
            <p className="text-base font-semibold text-white">Partner keresése a szerveren...</p>
            <p className="text-xs text-gray-400 mt-2">Várólista ellenőrzése...</p>
            <p className="text-[11px] text-gray-500 mt-1">Zóna: {megye}</p>
          </div>
        </div>
      </main>
    );
  }

  // 2. A KÉSZ CHAT ABLAK (Ha talált párt a szerver)
  return (
    <main className="flex h-screen flex-col bg-gray-950 text-white font-sans overflow-hidden">
      
      <header className="p-4 bg-gray-900 border-b border-gray-800 shadow-md flex items-center justify-between z-10">
        <div className="min-w-0 flex-1 pr-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => router.push("/")}
              className="mr-1 p-1 text-gray-500 hover:text-pink-500 transition text-sm font-bold"
            >
              ➔
            </button>
            <h2 className="text-xl font-bold text-pink-500 truncate">{partner?.becenev}</h2>
            <span className="text-sm px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 font-semibold uppercase tracking-wider text-[10px]">
              {partner?.nem} ({partner?.kor})
            </span>
          </div>
        </div>

        <button 
          onClick={() => alert("Jelentés beküldve.")}
          className="px-3 py-1.5 text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition whitespace-nowrap active:scale-95"
        >
          Jelentés
        </button>
      </header>

      <section className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-950/50 scrollbar-thin">
        {uzenetek.map((uz, i) => (
          <div 
            key={i} 
            className={`flex ${uz.felado === "en" ? "justify-end" : uz.felado === "rendszer" ? "justify-center" : "justify-start"}`}
          >
            <div className={`max-w-[75%] p-3 rounded-2xl text-sm shadow-sm transition-all ${
              uz.felado === "en" 
                ? "bg-pink-600 text-white rounded-tr-none" 
                : uz.felado === "rendszer"
                ? "bg-gray-800/50 text-gray-400 text-xs text-center italic rounded-lg border border-gray-800/30 px-4"
                : "bg-gray-800 text-gray-200 rounded-tl-none"
            }`}>
              {uz.szoveg}
            </div>
          </div>
        ))}
        <div ref={uzenetVegRef} />
      </section>

      <footer className="p-4 bg-gray-900 border-t border-gray-800 flex flex-col sm:flex-row gap-3 items-center z-10">
        <button 
          onClick={handleKovetkezoPartner}
          className="w-full sm:w-auto px-5 py-3 bg-gray-850 hover:bg-gray-800 text-gray-300 hover:text-white font-semibold rounded-xl transition duration-200 flex items-center justify-center gap-2 border border-gray-700 whitespace-nowrap active:scale-95"
        >
          Következő partner ➔
        </button>

        <form onSubmit={handleKuldes} className="w-full flex gap-2">
          <input 
            type="text" 
            placeholder="Írj egy üzenetet..."
            value={uzenetSzoveg}
            onChange={(e) => setUzenetSzoveg(e.target.value)}
            className="flex-1 p-3 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-pink-500 text-white text-sm transition"
          />
          <button 
            type="submit"
            className="px-6 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl transition active:scale-95"
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
    <Suspense fallback={<main className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500 text-sm">Betöltés…</main>}>
      <DashboardTartalom />
    </Suspense>
  );
}
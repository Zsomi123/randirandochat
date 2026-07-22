"use client";

import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react"; // <-- Új import a Google hitelesítéshez

type Uzenet = { felado: "en" | "partner" | "rendszer"; szoveg: string; ido: number };
type PartnerAdat = { becenev: string; nem: string; kor: number; hobbik?: string[] } | null;

// Saját, adatbázisból jövő adataink típusa
type SajatAdat = {
  nev: string;
  kor: string;
  nem: string;
  keresettNem: string;
  megyek: string[];
  hobbik: string[];
} | null;

type NapiLimitAdat = { limit: number; hasznalt: number; ujraindulasMs: number } | null;

const MAX_UZENET_HOSSZ = 500;
const TEXTAREA_MAX_MAGASSAG = 120; // px

function idoFormazas(ts: number) {
  return new Date(ts).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });
}

function hatralevoIdoFormazas(ms: number) {
  const osszesMasodperc = Math.max(0, Math.floor(ms / 1000));
  const ora = Math.floor(osszesMasodperc / 3600);
  const perc = Math.floor((osszesMasodperc % 3600) / 60);
  const masodperc = osszesMasodperc % 60;
  const ket = (n: number) => String(n).padStart(2, "0");
  return `${ket(ora)}:${ket(perc)}:${ket(masodperc)}`;
}

function DashboardTartalom() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Hitelesítés ellenőrzése
  const { data: session, status } = useSession();

  // Preferenciák a URL-ből (Ezeket nem baj, ha a user módosítja, ez csak a keresésre vonatkozik)
  const korMin = searchParams.get("korMin") || "18";
  const korMax = searchParams.get("korMax") || "99";

  const [sajatAdatok, setSajatAdatok] = useState<SajatAdat>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [keresesFolyamatban, setKeresesFolyamatban] = useState(true);
  const [partner, setPartner] = useState<PartnerAdat>(null);
  const [kozosHobbik, setKozosHobbik] = useState<string[]>([]);
  const [uzenetek, setUzenetek] = useState<Uzenet[]>([]);
  const [uzenetSzoveg, setUzenetSzoveg] = useState("");
  const [szoba, setSzoba] = useState("");
  const [alulVagyunk, setAlulVagyunk] = useState(true);
  const [olvasatlanSzam, setOlvasatlanSzam] = useState(0);

  // NAPI LIMIT ÁLLAPOT
  const [napiLimit, setNapiLimit] = useState<NapiLimitAdat>(null);
  const [ujraindulasCelIdo, setUjraindulasCelIdo] = useState<number | null>(null);
  const [hatralevoIdo, setHatralevoIdo] = useState(0);

  const gorditoRef = useRef<HTMLDivElement>(null);
  const uzenetVegRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 1. ADATBÁZIS LEKÉRDEZÉS (Valós, nem hamisítható adatok betöltése)
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/"); // Ha nincs belépve, visszadobjuk a főoldalra
      return;
    }

    if (status === "authenticated") {
      fetch("/api/user/me")
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            console.error("Hiba az adatok lekérésekor:", data.error);
            router.push("/");
          } else {
            setSajatAdatok({
              nev: data.becenev,
              kor: String(data.kor),
              nem: data.nem,
              keresettNem: data.keresettNem,
              megyek: data.megyek,
              hobbik: data.hobbik,
            });
          }
        });
    }
  }, [status, router]);

  // A regisztrációs csomag most már a biztonságos, adatbázisból származó adatokat használja
  const regisztraciosAdat = () => {
    if (!sajatAdatok) return null;
    return {
      nev: sajatAdatok.nev,
      kor: sajatAdatok.kor,
      nem: sajatAdatok.nem,
      keresettNem: sajatAdatok.keresettNem,
      korMin: korMin,
      korMax: korMax,
      megyek: sajatAdatok.megyek.length === 0 ? [] : sajatAdatok.megyek,
      hobbik: sajatAdatok.hobbik,
      email: session?.user?.email || null,
    };
  };

  // 2. SOCKET CSATLAKOZÁS (Csak miután megjöttek a hitelesített adatok!)
  useEffect(() => {
    if (!sajatAdatok) return; // Addig nem csatlakozunk a backendhez, amíg nincs meg a személyazonosság

    const ujSocket = io("http://localhost:5001", { forceNew: true });
    setSocket(ujSocket);

    ujSocket.on("connect", () => {
      console.log("🟢 Sikeresen csatlakozva a backendhez!");
      const adatok = regisztraciosAdat();
      if (adatok) ujSocket.emit("regisztracio_parositasra", adatok);
    });

    ujSocket.on("parositas_sikeres", (adat) => {
      if (!adat || !adat.partner) {
        console.warn("⚠️ Hiányos parositas_sikeres esemény érkezett.");
        return;
      }
      setSzoba(adat.szoba);
      setPartner(adat.partner);
      setKozosHobbik(adat.kozosHobbik || []);
      setKeresesFolyamatban(false);
      setOlvasatlanSzam(0);
      setUzenetek([
        {
          felado: "rendszer",
          szoveg: `Sikeres párosítás! Beszélgetőtársad: ${adat.partner.becenev}.${
            adat.kozosHobbik && adat.kozosHobbik.length > 0
              ? ` Közös érdeklődés: ${adat.kozosHobbik.join(", ")}.`
              : ""
          }`,
          ido: Date.now(),
        },
      ]);
    });

    ujSocket.on("napi_limit_elerve", (adat) => {
      console.warn("🚫 Napi párosítási limit elérve:", adat);
      setNapiLimit(adat);
      setUjraindulasCelIdo(Date.now() + (adat?.ujraindulasMs || 0));
      setKeresesFolyamatban(false);
    });

    ujSocket.on("chat_uzenet_erkezett", (adat) => {
      setUzenetek((prev) => [...prev, { felado: "partner", szoveg: adat.szoveg, ido: Date.now() }]);
    });

    ujSocket.on("partner_tovabbnyomta", () => {
      setUzenetek((prev) => [
        ...prev,
        { felado: "rendszer", szoveg: "A partner megszakította a kapcsolatot.", ido: Date.now() },
      ]);
      setTimeout(() => {
        setKeresesFolyamatban(true);
        setPartner(null);
        setKozosHobbik([]);
        setUzenetek([]);
        const adatok = regisztraciosAdat();
        if (adatok) ujSocket.emit("regisztracio_parositasra", adatok);
      }, 2000);
    });

    return () => {
      ujSocket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sajatAdatok, korMin, korMax]); // A dependenciák most a biztonságos objektumok

  // ... (A komponens további része: useEffect a görgetéshez, handleGordites, handleKuldes, és a JSX return része MARAD a régi!)
  // Csak akkor görgetünk automatikusan legaljára, ha a felhasználó már ott volt –
  // ha felfele görgetett a régi üzenetek olvasásához, ne rántsuk el onnan.
  useEffect(() => {
    if (uzenetek.length === 0) return;
    const utolso = uzenetek[uzenetek.length - 1];

    if (alulVagyunk) {
      uzenetVegRef.current?.scrollIntoView({ behavior: "smooth" });
      setOlvasatlanSzam(0);
    } else if (utolso.felado !== "en") {
      setOlvasatlanSzam((n) => n + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uzenetek]);

  useEffect(() => {
    if (!keresesFolyamatban) {
      uzenetVegRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [keresesFolyamatban]);

  // NAPI LIMIT VISSZASZÁMLÁLÓ – másodpercenként frissül, és lejáratkor automatikusan újrapróbálkozik
  useEffect(() => {
    if (!ujraindulasCelIdo) return;

    const intervallum = setInterval(() => {
      const maradek = ujraindulasCelIdo - Date.now();
      if (maradek <= 0) {
        setHatralevoIdo(0);
        setNapiLimit(null);
        setUjraindulasCelIdo(null);
        setKeresesFolyamatban(true);
        if (socket) {
          const adatok = regisztraciosAdat();
          if (adatok) socket.emit("regisztracio_parositasra", adatok);
        }
      } else {
        setHatralevoIdo(maradek);
      }
    }, 1000);

    return () => clearInterval(intervallum);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ujraindulasCelIdo, socket]);

  const handleGordites = () => {
    const el = gorditoRef.current;
    if (!el) return;
    const tavolsagAljatol = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAlulVagyunk(tavolsagAljatol < 80);
    if (tavolsagAljatol < 80) setOlvasatlanSzam(0);
  };

  const ugrasAljara = () => {
    uzenetVegRef.current?.scrollIntoView({ behavior: "smooth" });
    setOlvasatlanSzam(0);
  };

  // Textarea automatikus magasság-igazítása gépelés közben
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_MAGASSAG)}px`;
  }, [uzenetSzoveg]);

  // ÜZENET KÜLDÉSE A VALÓSÁGBAN
  const handleKuldes = (e?: React.FormEvent) => {
    e?.preventDefault();
    const szoveg = uzenetSzoveg.trim();
    if (!szoveg || !socket || !szoba) return;

    // Hozzáadjuk a saját képernyőnkhöz
    setUzenetek((prev) => [...prev, { felado: "en", szoveg, ido: Date.now() }]);
    setAlulVagyunk(true);

    // KILŐJÜK A SZERVERNEK A SZOBA AZONOSÍTÓVAL EGYÜTT
    socket.emit("chat_uzenet", { szoba, szoveg });

    setUzenetSzoveg("");
  };

  const handleBillentyu = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleKuldes();
    }
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
    setOlvasatlanSzam(0);
    setAlulVagyunk(true);

    socket.emit("regisztracio_parositasra", regisztraciosAdat());
  };

  if (napiLimit) {
    return (
      <main className="flex h-screen flex-col items-center justify-center bg-[#0a0c11] p-6 text-white">
        <div className="flex flex-col items-center gap-3 p-8 sm:p-10 bg-white/[0.02] rounded-3xl border border-pink-500/20 shadow-xl max-w-sm w-full text-center">
          <span className="text-4xl">💎</span>
          <h2 className="font-[family-name:var(--font-fraunces)] italic text-xl text-pink-400">
            Elérted a mai limitet
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            Mára elhasználtad mind a(z) <span className="text-white font-semibold">{napiLimit.limit}</span> ingyenes
            párosítást. Válts Prémiumra a korlátlan cseveséshez, vagy várj, amíg a limit magától megújul.
          </p>

          <div className="mt-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 font-[family-name:var(--font-geist-mono)] text-sm text-gray-300">
            Új próbálkozás: {hatralevoIdoFormazas(hatralevoIdo)}
          </div>

          <button
            onClick={() => router.push("/premium")}
            className="mt-4 w-full px-5 py-3 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white text-sm font-bold rounded-xl transition active:scale-95 shadow-lg shadow-pink-500/20"
          >
            ✨ Váltás Prémiumra
          </button>

          <button
            onClick={() => router.push("/")}
            className="mt-1 text-xs text-gray-500 hover:text-pink-400 transition"
          >
            ← Vissza a beállításokhoz
          </button>
        </div>
      </main>
    );
  }

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
              <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10">
  Zóna: {sajatAdatok?.megyek && sajatAdatok.megyek.length > 0 ? sajatAdatok.megyek.join(", ") : "Egész ország"}
</span>
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
    <main className="relative h-[100dvh] w-full bg-[#0a0c11] text-white overflow-hidden flex items-center justify-center sm:p-6 lg:p-10">
      <style>{`
        @keyframes uzenet-becsuszik {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .uzenet-animalt { animation: uzenet-becsuszik 0.28s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          .uzenet-animalt { animation: none; }
        }
      `}</style>

      {/* Halvány, elmosott fényfoltok a chat-ablak mögött – csak ott látszanak, ahol
          a lapon tényleg van hely körülötte (sm és afelett). */}
      <div className="hidden sm:block pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-pink-500/10 blur-3xl" aria-hidden="true" />
      <div className="hidden sm:block pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-rose-500/10 blur-3xl" aria-hidden="true" />

      {/* ---------- CHAT ABLAK ---------- */}
      <div className="relative w-full h-full sm:h-[min(88dvh,760px)] sm:max-w-xl sm:rounded-3xl sm:border sm:border-white/[0.08] sm:shadow-2xl sm:shadow-black/40 flex flex-col bg-[#0a0c11] sm:bg-[#0d0f15] overflow-hidden">
      {/* ---------- FEJLÉC ---------- */}
      <header className="px-3 sm:px-5 py-3 bg-[#0d0f15]/90 backdrop-blur border-b border-white/[0.07] shadow-md flex items-start gap-2 z-10 shrink-0">
        <button
          onClick={() => router.push("/")}
          aria-label="Vissza a főoldalra"
          className="p-1.5 mt-0.5 shrink-0 text-gray-500 hover:text-pink-400 transition text-sm font-bold rounded-lg hover:bg-white/[0.04] active:scale-90"
        >
          ←
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <h2 className="font-[family-name:var(--font-fraunces)] italic text-lg sm:text-xl text-pink-400 truncate min-w-0">
              {partner?.becenev}
            </h2>
            <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 font-semibold uppercase tracking-wider border border-pink-500/20">
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
          aria-label="Partner jelentése"
          className="shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition active:scale-95"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          </svg>
          <span className="hidden sm:inline">Jelentés</span>
        </button>
      </header>

      {/* ---------- ÜZENETFAL ---------- */}
      <div className="relative flex-1 min-h-0">
        <section
          ref={gorditoRef}
          onScroll={handleGordites}
          className="h-full overflow-y-auto p-3 sm:p-6 space-y-1 scrollbar-thin"
        >
          {uzenetek.map((uz, i) => {
            const elozo = uzenetek[i - 1];
            const kovetkezo = uzenetek[i + 1];
            const csoportEleje = !elozo || elozo.felado !== uz.felado;
            const csoportVege = !kovetkezo || kovetkezo.felado !== uz.felado;

            if (uz.felado === "rendszer") {
              return (
                <div key={i} className="uzenet-animalt flex justify-center py-2">
                  <span className="max-w-[90%] px-4 py-1.5 rounded-full text-[11px] text-center text-gray-400 bg-white/[0.04] border border-white/[0.07]">
                    {uz.szoveg}
                  </span>
                </div>
              );
            }

            const enUzenem = uz.felado === "en";

            return (
              <div
                key={i}
                className={`uzenet-animalt flex items-end gap-2 ${enUzenem ? "justify-end" : "justify-start"} ${
                  csoportEleje ? "mt-3" : "mt-0.5"
                }`}
              >
                {!enUzenem &&
                  (csoportVege ? (
                    <span className="shrink-0 mb-0.5 w-7 h-7 rounded-full bg-gradient-to-br from-pink-500/40 to-rose-600/40 border border-pink-500/30 flex items-center justify-center text-[11px] font-bold text-pink-300">
                      {partner?.becenev?.[0]?.toUpperCase() || "?"}
                    </span>
                  ) : (
                    <span className="shrink-0 w-7" aria-hidden="true" />
                  ))}

                <div className={`flex flex-col ${enUzenem ? "items-end" : "items-start"} max-w-[78%] sm:max-w-[60%]`}>
                  <div
                    className={`px-4 py-2.5 text-sm shadow-sm break-words whitespace-pre-wrap leading-relaxed ${
                      enUzenem
                        ? `bg-gradient-to-br from-pink-500 to-rose-600 text-white rounded-2xl ${
                            csoportVege ? "rounded-br-md" : "rounded-br-2xl"
                          }`
                        : `bg-white/[0.06] text-gray-100 rounded-2xl ${
                            csoportVege ? "rounded-bl-md" : "rounded-bl-2xl"
                          }`
                    }`}
                  >
                    {uz.szoveg}
                  </div>
                  {csoportVege && (
                    <span className="text-[10px] text-gray-600 mt-1 px-1 font-[family-name:var(--font-geist-mono)]">
                      {idoFormazas(uz.ido)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={uzenetVegRef} />
        </section>

        {/* Lebegő "ugrás legalulra" gomb, ha felgörgettünk és új üzenet jött */}
        {!alulVagyunk && (
          <button
            onClick={ugrasAljara}
            className="absolute bottom-3 right-3 sm:right-6 flex items-center gap-1.5 pl-3 pr-2.5 py-2 rounded-full bg-[#161922] hover:bg-[#1d212c] border border-white/10 shadow-lg text-xs font-semibold text-gray-200 transition active:scale-95"
          >
            {olvasatlanSzam > 0 ? `${olvasatlanSzam} új üzenet` : "Legalulra"}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* ---------- BEVITELI SÁV ---------- */}
      <footer
        className="p-2.5 sm:p-4 bg-[#0d0f15]/90 backdrop-blur border-t border-white/[0.07] flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-end z-10 shrink-0"
        style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={handleKovetkezoPartner}
          className="order-2 sm:order-1 w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-white/[0.03] hover:bg-white/[0.07] text-gray-300 hover:text-white text-sm font-semibold rounded-xl transition duration-200 flex items-center justify-center gap-2 border border-white/10 whitespace-nowrap active:scale-95 shrink-0"
        >
          <span className="sm:hidden">Következő →</span>
          <span className="hidden sm:inline">Következő partner →</span>
        </button>

        <form onSubmit={handleKuldes} className="order-1 sm:order-2 w-full flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={partner ? `Írj ${partner.becenev} részére…` : "Írj egy üzenetet…"}
            value={uzenetSzoveg}
            onChange={(e) => setUzenetSzoveg(e.target.value)}
            onKeyDown={handleBillentyu}
            maxLength={MAX_UZENET_HOSSZ}
            autoFocus
            className="flex-1 p-3 rounded-xl bg-white/[0.03] border border-white/10 focus:border-pink-500 text-white text-sm transition outline-none resize-none leading-relaxed"
            style={{ maxHeight: TEXTAREA_MAX_MAGASSAG }}
          />
          <button
            type="submit"
            disabled={!uzenetSzoveg.trim()}
            aria-label="Üzenet küldése"
            className="shrink-0 h-[44px] px-4 sm:px-6 bg-pink-500 hover:bg-pink-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition active:scale-95 flex items-center justify-center gap-1.5"
          >
            <span className="hidden sm:inline text-sm">Küldés</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 2 11 13M22 2 15 22l-4-9-9-4Z" />
            </svg>
          </button>
        </form>
      </footer>
      </div>
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
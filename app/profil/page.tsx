"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProfilOldal() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [napiLimit, setNapiLimit] = useState<number | null>(null);
  
  // Állapotok a törlő ablakhoz
  const [torlesAblakNyitva, setTorlesAblakNyitva] = useState(false);
  const [torlesFolyamatban, setTorlesFolyamatban] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      fetch("/api/user/me")
        .then((res) => res.json())
        .then((data) => {
          if (data.napiLimit !== undefined) {
            setNapiLimit(data.napiLimit);
          }
        })
        .catch((err) => console.error("Hiba az adatok lekérésekor:", err));
    }
  }, [status, router]);

  // Ez a függvény fut le, amikor az ablakban rányom a végleges törlésre
  const veglegesTorles = async () => {
    setTorlesFolyamatban(true);
    try {
      const res = await fetch("/api/user/delete", { method: "DELETE" });
      if (res.ok) {
        // Sikeres törlés esetén azonnal kiléptetjük
        signOut({ callbackUrl: "/" });
      } else {
        alert("Hiba történt a törlés során. Kérlek, próbáld újra.");
        setTorlesFolyamatban(false);
        setTorlesAblakNyitva(false);
      }
    } catch (error) {
      console.error("Törlési hiba:", error);
      setTorlesFolyamatban(false);
      setTorlesAblakNyitva(false);
    }
  };

  if (status === "loading" || status === "unauthenticated") {
    return (
      <main className="min-h-screen bg-[#0a0c11] flex items-center justify-center text-gray-500 text-sm">
        Betöltés…
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-[#0a0c11] text-white py-10 px-4 sm:px-6 relative">
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* FEJLÉC ÉS VISSZA GOMB */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => router.push("/")}
              className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 transition text-gray-400 hover:text-white"
            >
              ← Vissza
            </button>
            <h1 className="text-2xl font-[family-name:var(--font-fraunces)] italic font-medium text-white">
              Saját fiók
            </h1>
          </div>

          {/* 1. SZEMÉLYES ADATOK BLOKK */}
          <section className="bg-[#12151c] rounded-3xl border border-white/10 p-6 sm:p-8 flex items-center gap-5 shadow-lg">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt="Profilkép"
                className="w-20 h-20 rounded-full border-2 border-white/10 shadow-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-pink-500/20 border border-pink-500/50 flex items-center justify-center text-3xl text-pink-300 font-bold shadow-md">
                {session?.user?.name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white truncate">
                {session?.user?.name}
              </h2>
              <p className="text-sm text-gray-400 truncate mt-1">
                {session?.user?.email}
              </p>
              <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold uppercase tracking-wider">
                Hitelesített Google Fiók
              </span>
            </div>
          </section>

          {/* 2. NAPI LIMIT BLOKK */}
          <section className="bg-[#12151c] rounded-3xl border border-white/10 p-6 sm:p-8 shadow-lg">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Aktivitás
            </h3>
            <div className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-2xl p-5">
              <div>
                <h4 className="font-medium text-white text-lg">Napi Chat Limit</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Ennyi új beszélgetést indíthatsz még ma.
                </p>
              </div>
              <div className="text-right flex flex-col items-end">
                <div className="text-3xl font-[family-name:var(--font-fraunces)] italic font-bold text-pink-400">
                  {napiLimit !== null ? napiLimit : "..."}
                </div>
                <p className="text-[10px] text-gray-500 uppercase mt-1">Hátra van</p>
              </div>
            </div>
          </section>

          {/* 3. ELŐFIZETÉS (PRÉMIUM) BLOKK */}
          <section className="relative overflow-hidden bg-gradient-to-br from-[#1a1525] to-[#121018] rounded-3xl border border-pink-500/30 p-6 sm:p-8 shadow-2xl shadow-pink-500/10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 blur-[80px] rounded-full pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">💎</span>
                <h3 className="text-xl font-bold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
                  Randirandochat Premium
                </h3>
              </div>
              <p className="text-sm text-gray-400 mb-6">
                Emeld a keresést a következő szintre, és oldd fel a korlátokat!
              </p>

              <ul className="space-y-3 mb-8">
                {[
                  "Korlátlan napi chat indítás és párosítás",
                  "Kiemelt profil (többször dob be másoknak)",
                  "Megnézheted, ki lépett ki a beszélgetésből",
                  "Prémium kitűző a beceneved mellett",
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-2.5 text-sm text-gray-200">
                    <svg className="w-5 h-5 text-pink-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>

              <button className="w-full py-3.5 rounded-xl bg-white text-gray-900 font-bold text-sm shadow-xl hover:bg-gray-100 transition active:scale-[0.98]">
                Előfizetés (Hamarosan...)
              </button>
            </div>
          </section>

          {/* 4. VESZÉLYES ZÓNA (KIJELENTKEZÉS ÉS TÖRLÉS) */}
          <section className="pt-6 border-t border-white/10 flex flex-col gap-4">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full py-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-semibold text-sm transition active:scale-[0.98]"
            >
              Kijelentkezés
            </button>

            <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-5 mt-4">
              <h4 className="text-red-400 font-semibold mb-2">Fiók megszüntetése</h4>
              <p className="text-xs text-red-400/70 mb-4">
                A fiók törlésével minden személyes adatod, beállításod és előzményed
                véglegesen és visszavonhatatlanul törlődik a szervereinkről.
              </p>
              <button
                onClick={() => setTorlesAblakNyitva(true)} // Gombnyomásra kinyitja az ablakot
                className="px-5 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold uppercase tracking-wider transition active:scale-95"
              >
                Fiók végleges törlése
              </button>
            </div>
          </section>
        </div>
      </main>

      {/* TÖRLÉS MEGERŐSÍTŐ ABLAK (MODAL) */}
      {torlesAblakNyitva && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity">
          <div className="bg-[#12151c] border border-red-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl shadow-red-500/10 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
                </svg>
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-white text-center mb-2">
              Biztosan törlöd a fiókodat?
            </h3>
            <p className="text-sm text-gray-400 text-center mb-8">
              Ezt a műveletet <span className="text-red-400 font-semibold">nem lehet visszavonni</span>. A profilod, a hobbijaid és az összes adatbázis bejegyzésed azonnal megsemmisül.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setTorlesAblakNyitva(false)}
                disabled={torlesFolyamatban}
                className="flex-1 py-3 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white text-sm font-semibold transition"
              >
                Mégse
              </button>
              <button
                onClick={veglegesTorles}
                disabled={torlesFolyamatban}
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-red-500/20 transition flex justify-center items-center gap-2"
              >
                {torlesFolyamatban ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                    Törlés folyamatban...
                  </>
                ) : (
                  "Igen, törlöm"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
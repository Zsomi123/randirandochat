"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function ProfilOldalTartalom() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [napiLimit, setNapiLimit] = useState<number | null>(null);
  // ÚJ ÁLLAPOT: Prémium tagság figyelése
  const [isPremium, setIsPremium] = useState<boolean>(false);
  
  const [torlesAblakNyitva, setTorlesAblakNyitva] = useState(false);
  const [torlesFolyamatban, setTorlesFolyamatban] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

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
          // BEÁLLÍTJUK A PRÉMIUM ÁLLAPOTOT AZ ADATBÁZISBÓL
          if (data.isPremium !== undefined) {
            setIsPremium(data.isPremium);
          }
        })
        .catch((err) => console.error("Hiba az adatok lekérésekor:", err));
    }
  }, [status, router]);

  const veglegesTorles = async () => {
    setTorlesFolyamatban(true);
    try {
      const res = await fetch("/api/user/delete", { method: "DELETE" });
      if (res.ok) {
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

  const handleCheckout = async () => {
    setIsCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Hiba történt: " + (data.error || "Ismeretlen hiba"));
        setIsCheckoutLoading(false);
      }
    } catch (error) {
      console.error("Fizetési hiba:", error);
      alert("Nem sikerült kapcsolódni a fizetési rendszerhez.");
      setIsCheckoutLoading(false);
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

          {success && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-2xl text-sm font-semibold flex items-center gap-3">
              <span className="text-xl">✅</span> 
              Sikeres tranzakció! Üdvözlünk a Prémium tagok között!
            </div>
          )}
          {canceled && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-sm font-semibold flex items-center gap-3">
              <span className="text-xl">❌</span> 
              A fizetés megszakítva. Nem vontunk le pénzt a számládról.
            </div>
          )}

          {/* 1. SZEMÉLYES ADATOK */}
          <section className="bg-[#12151c] rounded-3xl border border-white/10 p-6 sm:p-8 flex items-center gap-5 shadow-lg relative overflow-hidden">
            {/* Opcionális háttérfény a prémium tagoknak */}
            {isPremium && <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 blur-[50px] rounded-full pointer-events-none" />}
            
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt="Profilkép"
                className="w-20 h-20 rounded-full border-2 border-white/10 shadow-md relative z-10"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-pink-500/20 border border-pink-500/50 flex items-center justify-center text-3xl text-pink-300 font-bold shadow-md relative z-10">
                {session?.user?.name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            <div className="min-w-0 relative z-10">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 truncate">
                {session?.user?.name}
                {/* PRÉMIUM KITŰZŐ A NÉV MELLETT */}
                {isPremium && (
                  <span title="Prémium Tag" className="text-lg">💎</span>
                )}
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
                {/* HA PRÉMIUM, VÉGTELEN JEL, HA NEM, A MEGSZOKOTT SZÁM */}
                <div className="text-3xl font-[family-name:var(--font-fraunces)] italic font-bold text-pink-400">
                  {isPremium ? "∞" : (napiLimit !== null ? napiLimit : "...")}
                </div>
                <p className="text-[10px] text-gray-500 uppercase mt-1">
                  {isPremium ? "Korlátlan" : "Hátra van"}
                </p>
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

              {/* HA MÁR PRÉMIUM, NEM TUDJA ÚJRA MEGVÁSÁROLNI */}
              {isPremium ? (
                <div className="w-full py-4 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 font-bold text-sm text-center shadow-inner">
                  🎉 Már Prémium tag vagy! Élvezd a korlátlanságot!
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4 px-2">
                    <span className="text-gray-300 font-medium">Örökös tagság</span>
                    <span className="text-xl font-bold text-white">1.990 Ft</span>
                  </div>
                  <button 
                    onClick={handleCheckout}
                    disabled={isCheckoutLoading}
                    className="w-full py-4 rounded-xl bg-white text-gray-900 font-bold text-sm shadow-xl hover:bg-gray-200 transition active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                  >
                    {isCheckoutLoading ? (
                      <>
                        <div className="w-5 h-5 rounded-full border-2 border-gray-900/30 border-t-gray-900 animate-spin"></div>
                        Kapcsolódás a Stripe-hoz...
                      </>
                    ) : (
                      "✨ Előfizetés vásárlása"
                    )}
                  </button>
                </>
              )}
            </div>
          </section>

          {/* 4. VESZÉLYES ZÓNA */}
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
                onClick={() => setTorlesAblakNyitva(true)}
                className="px-5 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold uppercase tracking-wider transition active:scale-95"
              >
                Fiók végleges törlése
              </button>
            </div>
          </section>
        </div>
      </main>

      {/* TÖRLÉS MEGERŐSÍTŐ ABLAK */}
      {torlesAblakNyitva && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity">
           {/* ... Ablak kódja maradt a régi ... */}
           <div className="bg-[#12151c] border border-red-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl shadow-red-500/10">
            <h3 className="text-xl font-bold text-white text-center mb-2">Biztosan törlöd a fiókodat?</h3>
            <p className="text-sm text-gray-400 text-center mb-8">Ezt a műveletet nem lehet visszavonni.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setTorlesAblakNyitva(false)} className="flex-1 py-3 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white text-sm font-semibold transition">Mégse</button>
              <button onClick={veglegesTorles} className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-lg shadow-red-500/20 transition">Igen, törlöm</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ProfilOldal() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#0a0c11] text-white flex items-center justify-center">Betöltés...</main>}>
      <ProfilOldalTartalom />
    </Suspense>
  );
}
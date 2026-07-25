"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import confetti from "canvas-confetti";

function PremiumOldalTartalom() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");
  
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  // KONFETTI ANIMÁCIÓ SIKER ESETÉN
  useEffect(() => {
    if (success === "true") {
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const colors = ['#f472b6', '#fb7185', '#34d399', '#fbbf24', '#ffffff'];

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          particleCount,
          startVelocity: 30,
          spread: 360,
          origin: {
            x: randomInRange(0.1, 0.9),
            y: Math.random() - 0.2
          },
          colors: colors,
          zIndex: 300
        });
      }, 250);
    }
  }, [success]);

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

  return (
    <main className="min-h-screen bg-[#0a0c11] flex items-center justify-center p-4">
      <div className="bg-[#12151c] border border-white/5 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center">
        <div className="text-6xl mb-4">💎</div>
        <h1 className="text-3xl font-[family-name:var(--font-fraunces)] italic font-bold text-pink-400 mb-6">
          Prémium Tagság
        </h1>

        {/* --- SIKERES VÁSÁRLÁS NÉZET --- */}
        {success === "true" ? (
          <div className="space-y-6 animate-in zoom-in duration-300">
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-2xl text-sm font-semibold">
              🎉 Sikeres tranzakció! A Stripe feldolgozta a fizetést.
            </div>
            
            <p className="text-gray-300 text-sm leading-relaxed">
              Hivatalosan is Prémium tag lettél! Mostantól élvezheted a korlátlan párosításokat, és tiéd a <span className="font-bold text-white">💎 Prémium kitűző</span> is.
            </p>

            <button
  onClick={() => router.push("/profil")}
  className="w-full py-4 rounded-xl bg-white text-gray-900 font-bold text-sm shadow-xl hover:bg-gray-200 transition active:scale-[0.98]"
>
  Király, irány a profilom!
</button>
          </div>
        ) : (
          /* --- ALAPÉRTELMEZETT / VÁSÁRLÁS NÉZET --- */
          <div className="space-y-6">
            {canceled === "true" && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm font-semibold mb-4">
                ❌ A fizetés megszakítva.
              </div>
            )}

            <p className="text-gray-400 text-sm leading-relaxed mb-8">
              Szerezz korlátlan hozzáférést a partnerkeresőhöz! Nincs többé napi limit, csak végtelen beszélgetés.
            </p>

            <div className="text-4xl font-bold text-white mb-2">
              1.990 Ft <span className="text-lg text-gray-500 font-normal">/ örökös</span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isCheckoutLoading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-sm shadow-xl shadow-pink-500/20 transition active:scale-[0.98] disabled:opacity-75 flex justify-center items-center gap-2"
            >
              {isCheckoutLoading ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                  Feldolgozás...
                </>
              ) : (
                "✨ Vásárlás (Stripe)"
              )}
            </button>

            <button
              onClick={() => router.push("/")}
              className="text-gray-500 hover:text-white text-sm transition mt-4 block w-full"
            >
              ← Vissza a főoldalra
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function PremiumOldal() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0c11] flex items-center justify-center text-white">Betöltés...</div>}>
      <PremiumOldalTartalom />
    </Suspense>
  );
}
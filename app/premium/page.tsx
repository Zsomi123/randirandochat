"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function PremiumPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  // A Stripe ide irányít vissza minket: ?success=true vagy ?canceled=true
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // 1. Szólunk az API-nak, hogy generálja le a fizetési linket
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
      });
      const data = await res.json();

      // 2. Ha kaptunk URL-t, átirányítjuk a felhasználót a Stripe-ra!
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Hiba történt: " + (data.error || "Ismeretlen hiba"));
        setLoading(false);
      }
    } catch (error) {
      console.error("Fizetési hiba:", error);
      alert("Nem sikerült kapcsolódni a fizetési rendszerhez.");
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-[#0a0c11] text-gray-500 text-sm flex items-center justify-center">
        Betöltés…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0c11] text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
        <span className="text-6xl">💎</span>
        <h1 className="text-3xl font-[family-name:var(--font-fraunces)] italic font-bold text-pink-400">
          Prémium Tagság
        </h1>

        {/* Sikeres vagy megszakított fizetés üzenetei */}
        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-xl text-sm font-semibold">
            Sikeres tranzakció! A Stripe feldolgozta a fizetést.
          </div>
        )}
        {canceled && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm font-semibold">
            A fizetés megszakítva. Nem vontunk le pénzt.
          </div>
        )}

        <p className="text-gray-400 text-sm leading-relaxed">
          Szerezz korlátlan hozzáférést a partnerkeresőhöz! Nincs többé napi limit, csak végtelen beszélgetés.
        </p>

        <div className="text-3xl font-bold text-white py-2">
          1.990 Ft <span className="text-sm text-gray-500 font-normal">/ örökös</span>
        </div>

        <button
          onClick={handleCheckout}
          disabled={loading || status === "unauthenticated"}
          className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 font-bold rounded-xl shadow-lg shadow-pink-500/20 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Átirányítás a Stripe-hoz..." : "✨ Vásárlás (Stripe)"}
        </button>

        {status === "unauthenticated" && (
          <p className="text-xs text-red-400 mt-2">
            A vásárláshoz be kell jelentkezned a főoldalon!
          </p>
        )}

        <button
          onClick={() => router.push("/")}
          className="text-xs text-gray-500 hover:text-pink-400 transition block mx-auto pt-2"
        >
          ← Vissza a főoldalra
        </button>
      </div>
    </main>
  );
}
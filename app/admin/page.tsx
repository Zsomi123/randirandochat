"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Adattípus a felhasználóknak
interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  becenev: string | null;
  isPremium: boolean;
  isAdmin: boolean;
}

export default function AdminVezerlokozpont() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  
  // Fülek (Tabok) kezelése
  const [activeTab, setActiveTab] = useState<"dashboard" | "users" | "reports" | "bans">("dashboard");
  
  // Felhasználók adatai
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      fetch("/api/user/me")
        .then((res) => res.json())
        .then((data) => {
          if (data.isAdmin === true) {
            setIsAdmin(true);
          } else {
            router.replace("/");
          }
        })
        .catch(() => router.replace("/"));
    }
  }, [status, router]);

  // Ha a Felhasználók fülre kattint, lekérjük a listát
  useEffect(() => {
    if (activeTab === "users" && isAdmin) {
      setIsLoadingUsers(true);
      fetch("/api/admin/users")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setUsers(data);
          }
          setIsLoadingUsers(false);
        })
        .catch(err => {
          console.error("Hiba a felhasználók lekérésekor", err);
          setIsLoadingUsers(false);
        });
    }
  }, [activeTab, isAdmin]);

  if (status === "loading" || isAdmin === null) {
    return (
      <main className="min-h-screen bg-[#0a0c11] flex items-center justify-center text-gray-400">
        <div className="w-8 h-8 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0c11] text-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* FEJLÉC */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#12151c] p-6 rounded-3xl border border-white/10 shadow-lg">
          <div>
            <h1 className="text-3xl font-[family-name:var(--font-fraunces)] italic font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              👑 Vezérlőközpont
            </h1>
            <p className="text-gray-400 text-sm mt-1">Üdvözlünk az admin felületen, {session?.user?.name}!</p>
          </div>
          <div className="flex gap-3">
            {activeTab !== "dashboard" && (
              <button 
                onClick={() => setActiveTab("dashboard")} 
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition"
              >
                ← Főmenü
              </button>
            )}
            <button 
              onClick={() => router.push("/")} 
              className="px-5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-sm font-medium transition"
            >
              Kilépés az oldalra
            </button>
          </div>
        </div>
        
        {/* FŐMENÜ KÁRTYÁK */}
        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
            <div onClick={() => setActiveTab("users")} className="bg-[#12151c] p-6 rounded-3xl border border-white/5 hover:border-emerald-500/30 transition cursor-pointer group shadow-lg">
              <h2 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition flex items-center gap-2">👥 Felhasználók</h2>
              <p className="text-gray-400 text-sm">Tagok kezelése, limitek nullázása, prémium státuszok ellenőrzése.</p>
            </div>
            <div onClick={() => setActiveTab("reports")} className="bg-[#12151c] p-6 rounded-3xl border border-white/5 hover:border-orange-500/30 transition cursor-pointer group shadow-lg">
              <h2 className="text-xl font-bold text-white mb-2 group-hover:text-orange-400 transition flex items-center gap-2">🚩 Reportok</h2>
              <p className="text-gray-400 text-sm">Felhasználói panaszok és jelentett beszélgetések elbírálása.</p>
            </div>
            <div onClick={() => setActiveTab("bans")} className="bg-[#12151c] p-6 rounded-3xl border border-white/5 hover:border-red-500/30 transition cursor-pointer group shadow-lg">
              <h2 className="text-xl font-bold text-white mb-2 group-hover:text-red-400 transition flex items-center gap-2">🔨 Kitiltások</h2>
              <p className="text-gray-400 text-sm">Bannolt IP címek és e-mailek listája, tiltások feloldása.</p>
            </div>
          </div>
        )}

        {/* FELHASZNÁLÓK NÉZET */}
        {activeTab === "users" && (
          <div className="bg-[#12151c] rounded-3xl border border-white/10 shadow-lg overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-xl font-bold text-emerald-400">Regisztrált Tagok Listája</h2>
              <span className="bg-white/5 text-gray-300 px-3 py-1 rounded-full text-xs font-semibold">Összesen: {users.length} fő</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-white/5 text-gray-400 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Név / Becenév</th>
                    <th className="px-6 py-4 font-semibold">E-mail</th>
                    <th className="px-6 py-4 font-semibold text-center">Státusz</th>
                    <th className="px-6 py-4 font-semibold text-right">Műveletek</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoadingUsers ? (
                    <tr><td colSpan={4} className="text-center py-8">Betöltés...</td></tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white">{u.name || "Névtelen"}</div>
                          <div className="text-xs text-gray-500">@{u.becenev || "nincs_beallitva"}</div>
                        </td>
                        <td className="px-6 py-4">{u.email}</td>
                        <td className="px-6 py-4 text-center">
                          {u.isAdmin ? (
                            <span className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 text-xs font-bold mr-2">ADMIN</span>
                          ) : null}
                          {u.isPremium ? (
                            <span className="px-2 py-1 rounded bg-pink-500/10 text-pink-400 text-xs font-bold">💎 PRÉMIUM</span>
                          ) : (
                            <span className="px-2 py-1 rounded bg-gray-500/10 text-gray-400 text-xs font-bold">ALAP</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs transition">
                            Kezelés
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Placeholder a többi nézetnek */}
        {(activeTab === "reports" || activeTab === "bans") && (
          <div className="bg-[#12151c] p-10 rounded-3xl border border-white/10 text-center text-gray-400">
            Ez a modul még fejlesztés alatt áll.
          </div>
        )}

      </div>
    </main>
  );
}
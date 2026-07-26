"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

// Adattípus a felhasználóknak
interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  becenev: string | null;
  isPremium: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  bannedUntil: string | null;
  banReason: string | null;
  napiLimitOverride: number | null;
  lastIp: string | null;
  maiHasznalat?: number;
}

type Tab = "dashboard" | "users" | "admins" | "premium" | "reports" | "bans";

export default function AdminVezerlokozpont() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [hasLoadedUsers, setHasLoadedUsers] = useState(false);

  const [nevKereses, setNevKereses] = useState("");
  const [ipKereses, setIpKereses] = useState("");
  const [ipKeresesFolyamatban, setIpKeresesFolyamatban] = useState(false);

  const [managingUser, setManagingUser] = useState<UserData | null>(null);

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

  const betoltFelhasznalok = (ip?: string) => {
    setIsLoadingUsers(true);
    const url = ip ? `/api/admin/users?ip=${encodeURIComponent(ip)}` : "/api/admin/users";
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setUsers(data);
          setHasLoadedUsers(true);
        }
        setIsLoadingUsers(false);
        setIpKeresesFolyamatban(false);
      })
      .catch((err) => {
        console.error("Hiba a felhasználók lekérésekor", err);
        setIsLoadingUsers(false);
        setIpKeresesFolyamatban(false);
      });
  };

  // Első betöltés, amikor bármelyik felhasználó-alapú fülre lép
  useEffect(() => {
    const felhasznaloAlapuFul =
      activeTab === "users" ||
      activeTab === "admins" ||
      activeTab === "premium" ||
      activeTab === "bans";

    if (felhasznaloAlapuFul && isAdmin && !hasLoadedUsers) {
      betoltFelhasznalok();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAdmin, hasLoadedUsers]);

  const handleIpKereses = () => {
    setIpKeresesFolyamatban(true);
    betoltFelhasznalok(ipKereses.trim() || undefined);
  };

  const handleIpKeresesTorles = () => {
    setIpKereses("");
    betoltFelhasznalok();
  };

  const nevSzerintSzurt = useMemo(() => {
    if (!nevKereses.trim()) return users;
    const q = nevKereses.trim().toLowerCase();
    return users.filter(
      (u) =>
        (u.name?.toLowerCase().includes(q) ?? false) ||
        (u.email?.toLowerCase().includes(q) ?? false) ||
        (u.becenev?.toLowerCase().includes(q) ?? false)
    );
  }, [users, nevKereses]);

  const megjelenitettFelhasznalok = useMemo(() => {
    if (activeTab === "admins") return nevSzerintSzurt.filter((u) => u.isAdmin);
    if (activeTab === "premium") return nevSzerintSzurt.filter((u) => u.isPremium);
    if (activeTab === "bans") return nevSzerintSzurt.filter((u) => u.isBanned);
    return nevSzerintSzurt;
  }, [activeTab, nevSzerintSzurt]);

  const frissitsdListaban = (updated: UserData) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
  };

  if (status === "loading" || isAdmin === null) {
    return (
      <main className="min-h-screen bg-[#0a0c11] flex items-center justify-center text-gray-400">
        <div className="w-8 h-8 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin"></div>
      </main>
    );
  }

  const adminokSzama = users.filter((u) => u.isAdmin).length;
  const premiumSzama = users.filter((u) => u.isPremium).length;
  const tiltottakSzama = users.filter((u) => u.isBanned).length;

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

        {/* FÜLEK NAVIGÁCIÓ (ha nem a főmenüben vagyunk) */}
        {activeTab !== "dashboard" && (
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: "users", label: "👥 Felhasználók" },
                { key: "admins", label: "🛡️ Adminok" },
                { key: "premium", label: "💎 Prémium" },
                { key: "reports", label: "🚩 Reportok" },
                { key: "bans", label: "🔨 Kitiltások" },
              ] as { key: Tab; label: string }[]
            ).map((ful) => (
              <button
                key={ful.key}
                onClick={() => setActiveTab(ful.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                  activeTab === ful.key
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                }`}
              >
                {ful.label}
              </button>
            ))}
          </div>
        )}

        {/* FŐMENÜ KÁRTYÁK */}
        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            <div onClick={() => setActiveTab("users")} className="bg-[#12151c] p-6 rounded-3xl border border-white/5 hover:border-emerald-500/30 transition cursor-pointer group shadow-lg">
              <h2 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition flex items-center gap-2">👥 Felhasználók</h2>
              <p className="text-gray-400 text-sm">Tagok kezelése, admin jog adása, IP-keresés, napi limitek állítása.</p>
            </div>
            <div onClick={() => setActiveTab("admins")} className="bg-[#12151c] p-6 rounded-3xl border border-white/5 hover:border-cyan-500/30 transition cursor-pointer group shadow-lg">
              <h2 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition flex items-center gap-2">🛡️ Adminok</h2>
              <p className="text-gray-400 text-sm">A jelenlegi adminisztrátorok áttekintése és jogok kezelése.</p>
            </div>
            <div onClick={() => setActiveTab("premium")} className="bg-[#12151c] p-6 rounded-3xl border border-white/5 hover:border-pink-500/30 transition cursor-pointer group shadow-lg">
              <h2 className="text-xl font-bold text-white mb-2 group-hover:text-pink-400 transition flex items-center gap-2">💎 Prémium</h2>
              <p className="text-gray-400 text-sm">Prémium előfizetéssel rendelkező felhasználók listája.</p>
            </div>
            <div onClick={() => setActiveTab("reports")} className="bg-[#12151c] p-6 rounded-3xl border border-white/5 hover:border-orange-500/30 transition cursor-pointer group shadow-lg">
              <h2 className="text-xl font-bold text-white mb-2 group-hover:text-orange-400 transition flex items-center gap-2">🚩 Reportok</h2>
              <p className="text-gray-400 text-sm">Felhasználói panaszok és jelentett beszélgetések elbírálása.</p>
            </div>
            <div onClick={() => setActiveTab("bans")} className="bg-[#12151c] p-6 rounded-3xl border border-white/5 hover:border-red-500/30 transition cursor-pointer group shadow-lg">
              <h2 className="text-xl font-bold text-white mb-2 group-hover:text-red-400 transition flex items-center gap-2">🔨 Kitiltások</h2>
              <p className="text-gray-400 text-sm">Bannolt felhasználók listája, tiltások feloldása.</p>
            </div>
          </div>
        )}

        {/* FELHASZNÁLÓ-ALAPÚ NÉZETEK (users / admins / premium / bans) */}
        {(activeTab === "users" || activeTab === "admins" || activeTab === "premium" || activeTab === "bans") && (
          <div className="bg-[#12151c] rounded-3xl border border-white/10 shadow-lg overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-white/10 flex flex-col gap-4">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <h2 className="text-xl font-bold text-emerald-400">
                  {activeTab === "users" && "Regisztrált Tagok Listája"}
                  {activeTab === "admins" && "Adminisztrátorok"}
                  {activeTab === "premium" && "Prémium Felhasználók"}
                  {activeTab === "bans" && "Kitiltott Felhasználók"}
                </h2>
                <div className="flex gap-2 items-center">
                  {activeTab === "admins" && (
                    <span className="bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full text-xs font-semibold">{adminokSzama} admin</span>
                  )}
                  {activeTab === "premium" && (
                    <span className="bg-pink-500/10 text-pink-400 px-3 py-1 rounded-full text-xs font-semibold">{premiumSzama} prémium</span>
                  )}
                  {activeTab === "bans" && (
                    <span className="bg-red-500/10 text-red-400 px-3 py-1 rounded-full text-xs font-semibold">{tiltottakSzama} kitiltva</span>
                  )}
                  {activeTab === "users" && (
                    <span className="bg-white/5 text-gray-300 px-3 py-1 rounded-full text-xs font-semibold">Összesen: {users.length} fő</span>
                  )}
                  <button
                    onClick={() => betoltFelhasznalok(ipKereses.trim() || undefined)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs transition"
                  >
                    ⟳ Frissítés
                  </button>
                </div>
              </div>

              {/* KERESŐ SÁV */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={nevKereses}
                  onChange={(e) => setNevKereses(e.target.value)}
                  placeholder="Keresés név, becenév vagy email alapján..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-gray-500 focus:outline-none focus:border-emerald-500/40"
                />
                {activeTab === "users" && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={ipKereses}
                      onChange={(e) => setIpKereses(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleIpKereses()}
                      placeholder="Keresés IP cím alapján (pl. 123.45.67.89)"
                      className="w-64 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/40"
                    />
                    <button
                      onClick={handleIpKereses}
                      disabled={ipKeresesFolyamatban}
                      className="px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 text-sm font-medium transition disabled:opacity-50"
                    >
                      🔍 IP keresés
                    </button>
                    {ipKereses && (
                      <button
                        onClick={handleIpKeresesTorles}
                        className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm transition"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-white/5 text-gray-400 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Név / Becenév</th>
                    <th className="px-6 py-4 font-semibold">E-mail</th>
                    <th className="px-6 py-4 font-semibold">IP cím</th>
                    <th className="px-6 py-4 font-semibold text-center">Napi limit</th>
                    <th className="px-6 py-4 font-semibold text-center">Státusz</th>
                    {activeTab === "bans" && <th className="px-6 py-4 font-semibold">Tiltás</th>}
                    <th className="px-6 py-4 font-semibold text-right">Műveletek</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoadingUsers ? (
                    <tr><td colSpan={7} className="text-center py-8">Betöltés...</td></tr>
                  ) : megjelenitettFelhasznalok.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-500">Nincs a szűrésnek megfelelő felhasználó.</td></tr>
                  ) : (
                    megjelenitettFelhasznalok.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white">{u.name || "Névtelen"}</div>
                          <div className="text-xs text-gray-500">@{u.becenev || "nincs_beallitva"}</div>
                        </td>
                        <td className="px-6 py-4">{u.email}</td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-400">{u.lastIp || "—"}</td>
                        <td className="px-6 py-4 text-center">
                          {u.isPremium ? (
                            <span className="text-pink-400 font-semibold text-xs">💎 korlátlan</span>
                          ) : (
                            <>
                              <span className="text-gray-300">{u.maiHasznalat ?? 0}</span>
                              <span className="text-gray-600"> / </span>
                              <span className={u.napiLimitOverride != null ? "text-cyan-400 font-semibold" : "text-gray-500"}>
                                {u.napiLimitOverride != null ? u.napiLimitOverride : "alap"}
                              </span>
                            </>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center space-x-1">
                          {u.isAdmin && (
                            <span className="inline-block px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 text-xs font-bold">ADMIN</span>
                          )}
                          {u.isPremium && (
                            <span className="inline-block px-2 py-1 rounded bg-pink-500/10 text-pink-400 text-xs font-bold">💎 PRÉMIUM</span>
                          )}
                          {u.isBanned && (
                            <span className="inline-block px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs font-bold">🔨 TILTVA</span>
                          )}
                          {!u.isAdmin && !u.isPremium && !u.isBanned && (
                            <span className="inline-block px-2 py-1 rounded bg-gray-500/10 text-gray-400 text-xs font-bold">ALAP</span>
                          )}
                        </td>
                        {activeTab === "bans" && (
                          <td className="px-6 py-4 text-xs">
                            <div className="text-red-300">
                              {u.bannedUntil
                                ? `Eddig: ${new Date(u.bannedUntil).toLocaleString("hu-HU")}`
                                : "Végleges tiltás"}
                            </div>
                            {u.banReason && <div className="text-gray-500 mt-1">{u.banReason}</div>}
                          </td>
                        )}
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setManagingUser(u)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs transition"
                          >
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

        {/* Placeholder a reportoknak */}
        {activeTab === "reports" && (
          <div className="bg-[#12151c] p-10 rounded-3xl border border-white/10 text-center text-gray-400">
            Ez a modul még fejlesztés alatt áll.
          </div>
        )}

      </div>

      {managingUser && (
        <ManageUserModal
          user={managingUser}
          currentUserEmail={session?.user?.email ?? null}
          onClose={() => setManagingUser(null)}
          onSaved={(updated) => {
            frissitsdListaban(updated);
            setManagingUser(null);
          }}
        />
      )}
    </main>
  );
}

function ManageUserModal({
  user,
  currentUserEmail,
  onClose,
  onSaved,
}: {
  user: UserData;
  currentUserEmail: string | null;
  onClose: () => void;
  onSaved: (updated: UserData) => void;
}) {
  const [isAdminVal, setIsAdminVal] = useState(user.isAdmin);
  const [isPremiumVal, setIsPremiumVal] = useState(user.isPremium);
  const [isBannedVal, setIsBannedVal] = useState(user.isBanned);
  const [bannedUntilVal, setBannedUntilVal] = useState(
    user.bannedUntil ? user.bannedUntil.slice(0, 16) : ""
  );
  const [banReasonVal, setBanReasonVal] = useState(user.banReason || "");
  const [keretVal, setKeretVal] = useState(
    user.napiLimitOverride != null ? String(user.napiLimitOverride) : ""
  );
  const [napiLimitVal, setNapiLimitVal] = useState(String(user.maiHasznalat ?? 0));
  const [mentesFolyamatban, setMentesFolyamatban] = useState(false);
  const [hiba, setHiba] = useState<string | null>(null);

  const sajatMagad = currentUserEmail && user.email === currentUserEmail;

  const mentes = async (extra?: Record<string, unknown>) => {
    setMentesFolyamatban(true);
    setHiba(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isAdmin: isAdminVal,
          isPremium: isPremiumVal,
          isBanned: isBannedVal,
          bannedUntil: isBannedVal ? (bannedUntilVal || null) : null,
          banReason: isBannedVal ? (banReasonVal || null) : null,
          napiLimitOverride: keretVal.trim() === "" ? null : Number(keretVal),
          ...extra,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHiba(data.error || "Ismeretlen hiba történt.");
        setMentesFolyamatban(false);
        return;
      }
      onSaved(data);
    } catch (err) {
      console.error(err);
      setHiba("Szerver hiba történt mentés közben.");
      setMentesFolyamatban(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#12151c] border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-white">{user.name || "Névtelen"}</h3>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="p-6 space-y-6">

          {/* Admin / Prémium kapcsolók */}
          <div className="space-y-3">
            <label className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/10">
              <span className="text-sm font-medium">🛡️ Admin jog</span>
              <input
                type="checkbox"
                checked={isAdminVal}
                disabled={!!sajatMagad}
                onChange={(e) => setIsAdminVal(e.target.checked)}
                className="w-5 h-5 accent-cyan-500"
              />
            </label>
            {sajatMagad && (
              <p className="text-xs text-gray-500 -mt-2 px-1">Saját magadtól nem veheted el az admin jogot.</p>
            )}

            <label className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/10">
              <span className="text-sm font-medium">💎 Prémium előfizetés</span>
              <input
                type="checkbox"
                checked={isPremiumVal}
                onChange={(e) => setIsPremiumVal(e.target.checked)}
                className="w-5 h-5 accent-pink-500"
              />
            </label>
          </div>

          {/* Napi limit / Napi keret */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-300">Napi limit &amp; keret</h4>

            {isPremiumVal && (
              <p className="text-xs text-pink-400/80 bg-pink-500/5 border border-pink-500/20 rounded-xl px-3 py-2">
                💎 Prémium felhasználóknál a napi limit/keret nem érvényesül, ők korlátlanul párosíthatnak - ezért itt nem szerkeszthető.
              </p>
            )}

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Napi limit (mai felhasznált mennyiség, szerkeszthető)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  value={napiLimitVal}
                  onChange={(e) => setNapiLimitVal(e.target.value)}
                  disabled={isPremiumVal}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-emerald-500/40 disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() =>
                    mentes({ setTodayUsage: Number(napiLimitVal) || 0 })
                  }
                  disabled={mentesFolyamatban || isPremiumVal}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  Beállítás
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Napi keret (üresen: alapértelmezett)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  value={keretVal}
                  onChange={(e) => setKeretVal(e.target.value)}
                  placeholder="Alapértelmezett"
                  disabled={isPremiumVal}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/40 disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setKeretVal("")}
                  disabled={isPremiumVal}
                  className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  Alapértelmezettre
                </button>
              </div>
            </div>
          </div>

          {/* Kitiltás */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <label className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/10">
              <span className="text-sm font-medium">🔨 Kitiltva</span>
              <input
                type="checkbox"
                checked={isBannedVal}
                onChange={(e) => setIsBannedVal(e.target.checked)}
                className="w-5 h-5 accent-red-500"
              />
            </label>

            {isBannedVal && (
              <div className="space-y-3 pl-1">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Meddig tart a tiltás (üresen hagyva: végleges)</label>
                  <input
                    type="datetime-local"
                    value={bannedUntilVal}
                    onChange={(e) => setBannedUntilVal(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-red-500/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Indoklás</label>
                  <textarea
                    value={banReasonVal}
                    onChange={(e) => setBanReasonVal(e.target.value)}
                    placeholder="Pl. sértő üzenetek, visszaélés..."
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-gray-500 focus:outline-none focus:border-red-500/40 resize-none"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Megjegyzés: a tényleges kitiltás-érvényesítés (bejelentkezés blokkolása) még nincs kiépítve a rendszerben, ez a mező csak az admin nyilvántartást szolgálja.
                </p>
              </div>
            )}
          </div>

          {hiba && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
              {hiba}
            </div>
          )}

        </div>

        <div className="p-6 border-t border-white/10 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={mentesFolyamatban}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition disabled:opacity-50"
          >
            Mégse
          </button>
          <button
            onClick={() => mentes()}
            disabled={mentesFolyamatban}
            className="px-5 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-sm font-medium transition disabled:opacity-50"
          >
            {mentesFolyamatban ? "Mentés..." : "Mentés"}
          </button>
        </div>
      </div>
    </div>
  );
}
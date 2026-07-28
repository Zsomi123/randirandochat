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

type Tab = "dashboard" | "users" | "admins" | "premium" | "jelentesek";
type ReportStatus = "fuggo" | "folyamatban" | "megoldott" | "elutasitott";
type ReportFilter = "osszes" | ReportStatus;

// Valós jelentés-adat típusa, ahogy a /api/admin/reports route.ts visszaadja
interface JelentesAdat {
  id: string;
  datum: string;
  bejelentoNev: string;
  bejelentoEmail: string;
  bejelentoEloelet: { helyes: number; alaptalan: number };
  celpontNev: string;
  celpontEmail: string;
  ok: string;
  statusz: ReportStatus;
  chatLog: { felado: string; ido: string; szoveg: string; isTarget: boolean }[];
  celpontEloelet: {
    korabbiTiltasok: { datum: string; ok: string }[];
  };
}

export default function AdminVezerlokozpont() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [reportFilter, setReportFilter] = useState<ReportFilter>("fuggo");

  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [hasLoadedUsers, setHasLoadedUsers] = useState(false);

  const [nevKereses, setNevKereses] = useState("");
  const [ipKereses, setIpKereses] = useState("");
  const [ipKeresesFolyamatban, setIpKeresesFolyamatban] = useState(false);

  const [managingUser, setManagingUser] = useState<UserData | null>(null);

  const [reports, setReports] = useState<JelentesAdat[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [hasLoadedReports, setHasLoadedReports] = useState(false);

  const [selectedReport, setSelectedReport] = useState<JelentesAdat | null>(null);

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

  useEffect(() => {
    const felhasznaloAlapuFul =
      activeTab === "users" ||
      activeTab === "admins" ||
      activeTab === "premium";

    if (felhasznaloAlapuFul && isAdmin && !hasLoadedUsers) {
      betoltFelhasznalok();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAdmin, hasLoadedUsers]);

  const betoltJelentesek = () => {
    setIsLoadingReports(true);
    fetch("/api/admin/reports")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setReports(data);
          setHasLoadedReports(true);
        }
        setIsLoadingReports(false);
      })
      .catch((err) => {
        console.error("Hiba a jelentések lekérésekor", err);
        setIsLoadingReports(false);
      });
  };

  // A jelentéseket már akkor betöltjük, amint az admin-jogosultság megerősítést
  // nyer (nem csak a "Jelentések" fülre kattintva), hogy a főmenü kártyáján és
  // a fül címkéjén lévő "függőben lévő jelentések" jelvény azonnal pontos legyen.
  useEffect(() => {
    if (isAdmin && !hasLoadedReports) {
      betoltJelentesek();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, hasLoadedReports]);

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
    return nevSzerintSzurt;
  }, [activeTab, nevSzerintSzurt]);

  const frissitsdListaban = (updated: UserData) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
  };

  const filteredReports = useMemo(() => {
    if (reportFilter === "osszes") return reports;
    return reports.filter((r) => r.statusz === reportFilter);
  }, [reports, reportFilter]);

  if (status === "loading" || isAdmin === null) {
    return (
      <main className="min-h-screen bg-[#0a0c11] flex items-center justify-center text-gray-400">
        <div className="w-8 h-8 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin"></div>
      </main>
    );
  }

  const adminokSzama = users.filter((u) => u.isAdmin).length;
  const premiumSzama = users.filter((u) => u.isPremium).length;
  const fuggoJelentesekSzama = reports.filter((r) => r.statusz === "fuggo").length;

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

        {/* FÜLEK NAVIGÁCIÓ */}
        {activeTab !== "dashboard" && (
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: "users", label: "👥 Felhasználók" },
                { key: "admins", label: "🛡️ Adminok" },
                { key: "premium", label: "💎 Prémium" },
                { key: "jelentesek", label: `🚩 Jelentések ${fuggoJelentesekSzama > 0 ? `(${fuggoJelentesekSzama})` : ""}` },
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
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
            <div onClick={() => setActiveTab("jelentesek")} className="bg-[#12151c] p-6 rounded-3xl border border-white/5 hover:border-orange-500/30 transition cursor-pointer group shadow-lg relative">
              {fuggoJelentesekSzama > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse shadow-lg">
                  {fuggoJelentesekSzama} ÚJ
                </span>
              )}
              <h2 className="text-xl font-bold text-white mb-2 group-hover:text-orange-400 transition flex items-center gap-2">🚩 Jelentések</h2>
              <p className="text-gray-400 text-sm">Felhasználói panaszok és kitiltások együttes elbírálása.</p>
            </div>
          </div>
        )}

        {/* FELHASZNÁLÓ-ALAPÚ NÉZETEK */}
        {(activeTab === "users" || activeTab === "admins" || activeTab === "premium") && (
          <div className="bg-[#12151c] rounded-3xl border border-white/10 shadow-lg overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-white/10 flex flex-col gap-4">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <h2 className="text-xl font-bold text-emerald-400">
                  {activeTab === "users" && "Regisztrált Tagok Listája"}
                  {activeTab === "admins" && "Adminisztrátorok"}
                  {activeTab === "premium" && "Prémium Felhasználók"}
                </h2>
                <div className="flex gap-2 items-center">
                  {activeTab === "admins" && (
                    <span className="bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full text-xs font-semibold">{adminokSzama} admin</span>
                  )}
                  {activeTab === "premium" && (
                    <span className="bg-pink-500/10 text-pink-400 px-3 py-1 rounded-full text-xs font-semibold">{premiumSzama} prémium</span>
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
                    <th className="px-6 py-4 font-semibold text-right">Műveletek</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoadingUsers ? (
                    <tr><td colSpan={6} className="text-center py-8">Betöltés...</td></tr>
                  ) : megjelenitettFelhasznalok.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-500">Nincs a szűrésnek megfelelő felhasználó.</td></tr>
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

        {/* JELENTÉSEK FÜL */}
        {activeTab === "jelentesek" && (
          <div className="bg-[#12151c] rounded-3xl border border-white/10 shadow-lg overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-white/10 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-orange-400 mb-1">Jelentések Kezelése</h2>
                  <p className="text-sm text-gray-400">Tekintsd át a felhasználók által beküldött panaszokat és szabálysértéseket.</p>
                </div>
                <button
                  onClick={betoltJelentesek}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs transition shrink-0"
                >
                  ⟳ Frissítés
                </button>
              </div>

              {/* JELENTÉS AL-FÜLEK */}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setReportFilter("osszes")} className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${reportFilter === "osszes" ? "bg-white/10 border-white/30 text-white" : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`}>Összes</button>
                <button onClick={() => setReportFilter("fuggo")} className={`px-4 py-2 rounded-xl text-sm font-medium border transition flex items-center gap-2 ${reportFilter === "fuggo" ? "bg-orange-500/10 border-orange-500/30 text-orange-400" : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`}>
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span> Függőben lévő
                </button>
                <button onClick={() => setReportFilter("folyamatban")} className={`px-4 py-2 rounded-xl text-sm font-medium border transition flex items-center gap-2 ${reportFilter === "folyamatban" ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`}>
                  <span className="w-2 h-2 rounded-full bg-cyan-500"></span> Folyamatban
                </button>
                <button onClick={() => setReportFilter("megoldott")} className={`px-4 py-2 rounded-xl text-sm font-medium border transition flex items-center gap-2 ${reportFilter === "megoldott" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Megoldott
                </button>
                <button onClick={() => setReportFilter("elutasitott")} className={`px-4 py-2 rounded-xl text-sm font-medium border transition flex items-center gap-2 ${reportFilter === "elutasitott" ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`}>
                  <span className="w-2 h-2 rounded-full bg-red-500"></span> Elutasított
                </button>
              </div>
            </div>

            {/* JELENTÉS TÁBLÁZAT */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-white/5 text-gray-400 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Azonosító / Dátum</th>
                    <th className="px-6 py-4 font-semibold">Bejelentő</th>
                    <th className="px-6 py-4 font-semibold">Jelentett személy</th>
                    <th className="px-6 py-4 font-semibold">Ok / Kategória</th>
                    <th className="px-6 py-4 font-semibold text-center">Státusz</th>
                    <th className="px-6 py-4 font-semibold text-right">Műveletek</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoadingReports ? (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-500">Betöltés...</td></tr>
                  ) : filteredReports.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-500">Nincs a szűrésnek megfelelő jelentés.</td></tr>
                  ) : (
                    filteredReports.map((report) => (
                      <tr key={report.id} className="hover:bg-white/[0.02] transition">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white text-xs">{report.id}</div>
                          <div className="text-xs text-gray-500">{report.datum}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-white">{report.bejelentoNev}</div>
                          <div className="text-xs text-gray-500">{report.bejelentoEmail}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-white font-bold">{report.celpontNev}</div>
                          <div className="text-xs text-gray-500">{report.celpontEmail}</div>
                        </td>
                        <td className="px-6 py-4 text-orange-400">{report.ok}</td>
                        <td className="px-6 py-4 text-center">
                          {report.statusz === "fuggo" && <span className="bg-orange-500/10 text-orange-400 px-2 py-1 rounded text-xs font-bold">FÜGGŐBEN</span>}
                          {report.statusz === "folyamatban" && <span className="bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded text-xs font-bold">FOLYAMATBAN</span>}
                          {report.statusz === "megoldott" && <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-xs font-bold">MEGOLDVA</span>}
                          {report.statusz === "elutasitott" && <span className="bg-red-500/10 text-red-400 px-2 py-1 rounded text-xs font-bold">ELUTASÍTVA</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSelectedReport(report)}
                            className="px-4 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 text-xs font-medium transition"
                          >
                            Elbírálás
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

      {selectedReport && (
        <ReportDetailsModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onUpdated={(updated) => {
            setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            setSelectedReport(null);
          }}
        />
      )}
    </main>
  );
}

// --- KOMPONENS: JELENTÉSEK RÉSZLETES ELBÍRÁLÁSA ---

type BanDurationType = "1_nap" | "1_het" | "1_honap" | "vegleges" | "custom" | null;

interface BanState {
  duration: BanDurationType;
  customDate: string;
  reason: string;
}

const PRE_WRITTEN_REASONS = {
  celpont: [
    "Extrém káromkodás / Trágárság",
    "Zaklatás / Fenyegetés",
    "Kéretlen reklám (Spam)",
    "Inadekvát / Szexuális tartalom"
  ],
  bejelento: [
    "Visszaélés a jelentés funkcióval",
    "Alaptalan / Bosszúból történő jelentés",
    "Spam jelentés"
  ]
};

function ReportDetailsModal({
  report,
  onClose,
  onUpdated,
}: {
  report: JelentesAdat;
  onClose: () => void;
  onUpdated: (updated: JelentesAdat) => void;
}) {
  const [activeTab, setActiveTab] = useState<"celpont" | "bejelento">("celpont");

  const [banData, setBanData] = useState<Record<"celpont" | "bejelento", BanState>>({
    celpont: { duration: null, customDate: "", reason: "" },
    bejelento: { duration: null, customDate: "", reason: "" },
  });

  const [kuldesFolyamatban, setKuldesFolyamatban] = useState(false);
  const [hiba, setHiba] = useState<string | null>(null);

  const updateCurrentBan = (field: keyof BanState, value: string | null) => {
    setBanData(prev => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], [field]: value }
    }));
  };

  const handlePreWrittenClick = (text: string) => {
    const current = banData[activeTab].reason;
    const newVal = current.trim() ? `${current}, ${text}` : text;
    updateCurrentBan("reason", newVal);
  };

  const handleBanSubmit = async () => {
    setKuldesFolyamatban(true);
    setHiba(null);
    try {
      const res = await fetch(`/api/admin/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "szankcio",
          celpont: banData.celpont.duration
            ? {
                duration: banData.celpont.duration,
                customDate: banData.celpont.customDate || null,
                reason: banData.celpont.reason,
              }
            : undefined,
          bejelento: banData.bejelento.duration
            ? {
                duration: banData.bejelento.duration,
                customDate: banData.bejelento.customDate || null,
                reason: banData.bejelento.reason,
              }
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHiba(data.error || "Ismeretlen hiba történt.");
        setKuldesFolyamatban(false);
        return;
      }
      onUpdated(data);
    } catch (err) {
      console.error(err);
      setHiba("Szerver hiba történt a szankció végrehajtása közben.");
      setKuldesFolyamatban(false);
    }
  };

  const handleElutasitas = async () => {
    setKuldesFolyamatban(true);
    setHiba(null);
    try {
      const res = await fetch(`/api/admin/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "elutasit" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHiba(data.error || "Ismeretlen hiba történt.");
        setKuldesFolyamatban(false);
        return;
      }
      onUpdated(data);
    } catch (err) {
      console.error(err);
      setHiba("Szerver hiba történt az elutasítás közben.");
      setKuldesFolyamatban(false);
    }
  };

  const canSubmit = banData.celpont.duration !== null || banData.bejelento.duration !== null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-[#12151c] border border-white/10 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

        {/* Fejléc */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#0a0c11]/50 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              Ügyszám: {report.id}
              {report.statusz === "fuggo" && <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-xs uppercase">Új jelentés</span>}
            </h3>
            <p className="text-sm text-gray-400 mt-1">Dátum: {report.datum} | Kategória: <span className="text-orange-400">{report.ok}</span></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">✕</button>
        </div>

        {/* Split Screen Tartalom */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">

          {/* Bal oldal: Bejelentő (Fix) + Bizonyíték (Görgethető) */}
          <div className="flex-1 border-r border-white/10 p-6 flex flex-col gap-6 min-h-0">
            {/* Bejelentő adatai - Fix */}
            <div className="shrink-0">
              <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3">Bejelentő adatai</h4>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-white font-medium">{report.bejelentoNev} <span className="text-gray-500 text-sm">({report.bejelentoEmail})</span></p>
                <div className="text-xs mt-2 flex flex-wrap gap-4">
                  <span className="text-emerald-400 font-medium bg-emerald-500/10 px-2 py-1 rounded">
                    ✅ {report.bejelentoEloelet?.helyes ?? 0} helyes jelentés
                  </span>
                  <span className="text-red-400 font-medium bg-red-500/10 px-2 py-1 rounded">
                    ❌ {report.bejelentoEloelet?.alaptalan ?? 0} alaptalan jelentés
                  </span>
                </div>
              </div>
            </div>

            {/* Chat bizonyíték - Görgethető */}
            <div className="flex-1 flex flex-col min-h-0">
              <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2 shrink-0">
                📄 Csatolt Bizonyíték <span className="text-xs text-gray-500 font-normal">(Chat Napló Részlet)</span>
              </h4>
              <div className="bg-black/40 rounded-xl p-4 border border-white/10 flex-1 overflow-y-auto space-y-3">
                {report.chatLog.map((log, idx) => (
                  <div key={idx} className={`flex flex-col ${log.isTarget ? 'items-start' : 'items-end'}`}>
                    <span className="text-[10px] text-gray-500 mb-1">{log.felado} • {log.ido}</span>
                    <div className={`px-4 py-2 rounded-2xl text-sm max-w-[85%] ${log.isTarget ? 'bg-red-500/20 text-red-100 border border-red-500/30' : 'bg-white/10 text-gray-200'}`}>
                      {log.szoveg}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Jobb oldal: Célpont és Előélet */}
          <div className="w-full md:w-80 bg-black/20 p-6 overflow-y-auto flex flex-col gap-6 shrink-0">
            <div>
              <h4 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-3">Jelentett Személy</h4>
              <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/20">
                <p className="text-white font-bold text-lg">{report.celpontNev}</p>
                <p className="text-xs text-gray-500">{report.celpontEmail}</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3">Moderációs Előélet</h4>

              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <span className="text-sm text-gray-400 block mb-2">
                  Korábbi tiltások száma: <span className={`font-bold ${report.celpontEloelet.korabbiTiltasok.length > 0 ? "text-red-400" : "text-white"}`}>{report.celpontEloelet.korabbiTiltasok.length}</span>
                </span>

                {report.celpontEloelet.korabbiTiltasok.length > 0 ? (
                  <div className="space-y-2 mt-3">
                    {report.celpontEloelet.korabbiTiltasok.map((tiltas, idx) => (
                      <div key={idx} className="bg-black/30 p-3 rounded-lg border border-red-500/20">
                        <div className="text-xs text-gray-500 mb-1">{tiltas.datum}</div>
                        <div className="text-sm text-red-300">{tiltas.ok}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic mt-1">A felhasználó még nem volt kitiltva.</div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* --- AKCIÓK ÉS DÖNTÉS PANEL (KÉT FÜLES) --- */}
        <div className="p-6 border-t border-white/10 bg-[#0a0c11]/80 flex flex-col gap-4 shrink-0">

          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 mb-2">
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-3">
                ⚖️ Szankciók Kiosztása
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("celpont")}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
                    activeTab === "celpont" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${banData.celpont.duration ? 'bg-red-500' : 'bg-transparent'}`}></span>
                  Jelentett személy
                </button>
                <button
                  onClick={() => setActiveTab("bejelento")}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
                    activeTab === "bejelento" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" : "bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${banData.bejelento.duration ? 'bg-orange-500' : 'bg-transparent'}`}></span>
                  Bejelentő
                </button>
              </div>
            </div>

            <div className="text-xs text-gray-500 max-w-xs text-right">
              Válts a fülek között! Egyszerre akár mindkét felet is büntetheted különböző mértékben.
            </div>
          </div>

          {/* Aktuális fül tartalma */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-black/20 p-5 rounded-2xl border border-white/5">

            {/* Bal oszlop: Indoklás (Select menüvel) */}
            <div>
              <label className="text-xs text-gray-400 block mb-2 font-semibold">GYORS INDOKLÁS KIVÁLASZTÁSA</label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handlePreWrittenClick(e.target.value);
                    e.target.value = "";
                  }
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-gray-300 focus:outline-none focus:border-emerald-500/50 mb-3 cursor-pointer"
              >
                <option value="">-- Válassz egyet a beszúráshoz --</option>
                {PRE_WRITTEN_REASONS[activeTab].map((reasonText) => (
                  <option key={reasonText} value={reasonText}>
                    {reasonText}
                  </option>
                ))}
              </select>

              <label className="text-xs text-gray-400 block mb-2 font-semibold">PONTOS INDOKLÁS (A FELHASZNÁLÓ IS LÁTNI FOGJA)</label>
              <textarea
                value={banData[activeTab].reason}
                onChange={(e) => updateCurrentBan("reason", e.target.value)}
                placeholder="Írd ide vagy válaszd ki a fenti menüből..."
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 resize-none"
              />
            </div>

            {/* Jobb oszlop: Időtartam */}
            <div>
              <label className="text-xs text-gray-400 block mb-3 font-semibold">TILTÁS IDŐTARTAMA ({activeTab === 'celpont' ? report.celpontNev : report.bejelentoNev})</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "1_nap", label: "1 nap" },
                  { id: "1_het", label: "1 hét" },
                  { id: "1_honap", label: "1 hónap" },
                  { id: "vegleges", label: "Végleges (Ban)" },
                  { id: "custom", label: "Egyedi dátum..." },
                ].map((opt) => {
                  const isSelected = banData[activeTab].duration === opt.id;
                  const activeColorClass = activeTab === 'celpont'
                    ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-500/20"
                    : "bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-500/20";

                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        if (isSelected) {
                          updateCurrentBan("duration", null);
                        } else {
                          updateCurrentBan("duration", opt.id);
                        }
                      }}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition ${
                        isSelected ? activeColorClass : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {banData[activeTab].duration === "custom" && (
                <div className="mt-4 animate-in fade-in zoom-in-95 duration-200">
                  <label className="text-xs text-gray-400 block mb-2">Pontos lejárat dátuma:</label>
                  <input
                    type="datetime-local"
                    value={banData[activeTab].customDate}
                    onChange={(e) => updateCurrentBan("customDate", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              )}
            </div>
          </div>

          {hiba && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
              {hiba}
            </div>
          )}

          {/* Alsó gombsor */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-2 pt-4 border-t border-white/5">
            <button
              onClick={onClose}
              disabled={kuldesFolyamatban}
              className="text-gray-400 hover:text-white text-sm transition font-medium disabled:opacity-50"
            >
              Későbbre hagyom (Ablak bezárása)
            </button>

            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={handleElutasitas}
                disabled={kuldesFolyamatban}
                className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-gray-500/10 hover:bg-gray-500/20 border border-gray-500/30 text-gray-400 text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Jelentés Elutasítása (Alaptalan)
              </button>
              <button
                onClick={handleBanSubmit}
                disabled={!canSubmit || kuldesFolyamatban}
                className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {kuldesFolyamatban ? "Feldolgozás..." : "Szankciók Végrehajtása"}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
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
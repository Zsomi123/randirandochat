"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

const MENUPONTOK = [
  { href: "#hogyan-működik", label: "Hogyan működik?" },
  { href: "#biztonsag", label: "100% Anonimitás" },
  { href: "#gyik", label: "GY.I.K." },
];

export default function Navbar() {
  const [nyitva, setNyitva] = useState(false);
  const [profilNyitva, setProfilNyitva] = useState(false); // A legördülő menü állapota
  const { data: session, status } = useSession();
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // KATTINTÁS FIGYELŐ: Bezárja a menüt, ha máshova kattintasz a képernyőn
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfilNyitva(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="w-full bg-[#0a0c11]/85 backdrop-blur-md border-b border-white/[0.06] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* LOGÓ */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <span className="font-[family-name:var(--font-fraunces)] italic text-2xl font-medium bg-gradient-to-r from-pink-400 via-rose-400 to-red-400 bg-clip-text text-transparent group-hover:opacity-80 transition-opacity">
            Randirandochat
          </span>
          <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 font-semibold border border-pink-500/20">
            18+
          </span>
        </Link>

        {/* MENÜPONTOK - DESKTOP */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-300">
          {MENUPONTOK.map((m) => (
            <a key={m.href} href={m.href} className="hover:text-pink-400 transition-colors">
              {m.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {/* BEJELENTKEZÉS / PROFIL GOMB */}
          {status === "loading" ? (
            <div className="w-8 h-8 rounded-full border-2 border-pink-500/30 border-t-pink-500 animate-spin"></div>
          ) : session ? (
            <div className="relative" ref={dropdownRef}>
              {/* Profilkép, amire kattintani lehet */}
              <button
                onClick={() => setProfilNyitva(!profilNyitva)}
                className="flex items-center gap-2 focus:outline-none transition active:scale-95"
              >
                {session.user?.image ? (
                  <img 
                    src={session.user.image} 
                    alt="Profil" 
                    className={`w-9 h-9 rounded-full border-2 transition-colors ${profilNyitva ? "border-pink-500" : "border-white/20 hover:border-pink-500/50"}`} 
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-pink-500/20 border border-pink-500/50 flex items-center justify-center text-pink-300 font-bold">
                    {session.user?.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </button>

              {/* LEGÖRDÜLŐ MENÜ */}
              {profilNyitva && (
                <div className="absolute right-0 mt-3 w-56 bg-[#12151c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 transform transition-all origin-top-right">
                  {/* Felhasználó adatai */}
                  <div className="px-4 py-3 bg-white/[0.02] border-b border-white/10">
                    <p className="text-sm text-white font-medium truncate">{session.user?.name}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{session.user?.email}</p>
                  </div>
                  
                  {/* Menüpontok */}
                  <div className="p-1.5 flex flex-col gap-0.5">
                    <Link 
                      href="/profil" 
                      onClick={() => setProfilNyitva(false)} 
                      className="flex items-center px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/[0.04] rounded-xl transition"
                    >
                      ⚙️ Saját fiók
                    </Link>
                    
                    {/* Ide jön majd később a Fiók törlése gomb, ha elkészítjük a felületét */}
                    
                    <button 
                      onClick={() => signOut()} 
                      className="flex items-center w-full text-left px-3 py-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition mt-1"
                    >
                      🚪 Kijelentkezés
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-white text-gray-900 hover:bg-gray-100 shadow-md transition active:scale-95"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Belépés
            </button>
          )}

          {/* HAMBURGER - MOBIL */}
          <button
            type="button"
            onClick={() => setNyitva((v) => !v)}
            className="md:hidden p-2 -mr-2 text-gray-300 hover:text-pink-400 transition"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {nyitva ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
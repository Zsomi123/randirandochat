"use client";

import Link from "next/link";
import { useState } from "react";

const MENUPONTOK = [
  { href: "#hogyan-működik", label: "Hogyan működik?" },
  { href: "#biztonsag", label: "100% Anonimitás" },
  { href: "#gyik", label: "GY.I.K." },
];

export default function Navbar() {
  const [nyitva, setNyitva] = useState(false);

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

        <div className="flex items-center gap-2">
          {/* CALL TO ACTION GOMB */}
          <a
            href="#parositas"
            className="hidden sm:inline-flex px-4 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-md shadow-pink-500/20 transition active:scale-95"
          >
            Párosítás indítása
          </a>

          {/* HAMBURGER - MOBIL */}
          <button
            type="button"
            onClick={() => setNyitva((v) => !v)}
            aria-label={nyitva ? "Menü bezárása" : "Menü megnyitása"}
            aria-expanded={nyitva}
            className="md:hidden p-2 -mr-2 text-gray-300 hover:text-pink-400 transition"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {nyitva ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* MOBIL LENYÍLÓ MENÜ */}
      {nyitva && (
        <nav className="md:hidden border-t border-white/[0.06] bg-[#0a0c11] px-4 py-4 flex flex-col gap-1 text-sm">
          {MENUPONTOK.map((m) => (
            <a
              key={m.href}
              href={m.href}
              onClick={() => setNyitva(false)}
              className="px-2 py-2.5 rounded-lg text-gray-300 hover:text-pink-400 hover:bg-white/[0.03] transition"
            >
              {m.label}
            </a>
          ))}
          <a
            href="#parositas"
            onClick={() => setNyitva(false)}
            className="mt-2 px-4 py-2.5 text-center text-xs font-bold rounded-lg bg-gradient-to-r from-pink-500 to-rose-600 text-white"
          >
            Párosítás indítása
          </a>
        </nav>
      )}
    </header>
  );
}
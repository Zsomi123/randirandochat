import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import AuthProvider from "./components/AuthProvider";
import SiteChrome from "./components/SiteChrome";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Karakteres, meleg szerif a fejlécekhez – ellenpontozza a sötét, technikás
// felületet egy emberibb, "randi" hangulattal.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata: Metadata = {
  title: "Randirandochat - Anonim Vakrandi és Chat",
  description:
    "Találd meg a hozzád illő partnert vakrandin, 100%-ban anoniman! Párosítás megye és közös hobbik alapján, azonnali chattel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased bg-[#0a0c11] text-white min-h-screen flex flex-col justify-between`}
      >
        <AuthProvider>
          <SiteChrome>{children}</SiteChrome>
        </AuthProvider>
      </body>
    </html>
  );
}
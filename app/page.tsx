import ParositasForm from "./components/Parositasform";

const LEPESEK = [
  {
    szam: "01",
    cim: "Add meg magad",
    leiras: "Válassz egy becenevet, add meg a korod és kit szeretnél megismerni. Se fénykép, se valós név nem kell.",
  },
  {
    szam: "02",
    cim: "Szűkítsd a kört",
    leiras: "Jelöld ki a keresési megyéket a térképen, és pár kattintással add meg az érdeklődési köreidet.",
  },
  {
    szam: "03",
    cim: "Azonnali párosítás",
    leiras: "A rendszer másodperceken belül összeköt valakivel, aki illik a preferenciáidhoz és a közös hobbikhoz.",
  },
  {
    szam: "04",
    cim: "Chat, bármeddig",
    leiras: "Beszélgess szabadon. Nem alakul a beszélgetés? Egy kattintással új partnert kapsz.",
  },
];

const BIZTONSAGI_PONTOK = [
  {
    cim: "Teljes anonimitás",
    leiras: "Nincs fénykép, nincs valós név, nincs nyilvános profil. Csak egy becenév és egy beszélgetés.",
  },
  {
    cim: "18+ korellenőrzés",
    leiras: "A regisztráció megerősíti, hogy minden felhasználó betöltötte a 18. életévét.",
  },
  {
    cim: "Azonnali jelentés",
    leiras: "Ha valaki visszaél a felülettel, egy gombnyomással jelentheted, a beszélgetés pedig bármikor lezárható.",
  },
  {
    cim: "Nincs adatmegosztás",
    leiras: "A beszélgetéseid és preferenciáid nem kerülnek harmadik félhez, hirdetőkhöz.",
  },
];

const GYIK = [
  {
    kerdes: "Kell email címmel regisztrálnom?",
    valasz:
      "Nem. A Randirandochat nem kér email címet vagy jelszót – csak egy becenevet adsz meg, és már kereshetsz is partnert.",
  },
  {
    kerdes: "Láthatja bárki a beszélgetésemet?",
    valasz:
      "Nem, a chat csak a két beszélgetőpartner között zajlik. Amint bezárod az ablakot vagy továbblépsz, a beszélgetés nem érhető el újra.",
  },
  {
    kerdes: "Mi történik, ha a partnerem kilép?",
    valasz:
      "Erről azonnal értesítést kapsz a chatben, és a rendszer pár másodpercen belül automatikusan új partnert keres neked.",
  },
  {
    kerdes: "Ingyenes a szolgáltatás?",
    valasz: "Igen, a párosítás és a chat funkció jelenleg teljesen ingyenesen elérhető.",
  },
];

export default function Home() {
  return (
    <main className="bg-[#0a0c11]">
      {/* ---------- HERO ---------- */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center overflow-hidden">
        <div>
          <span className="inline-block text-[11px] font-[family-name:var(--font-geist-mono)] uppercase tracking-[0.2em] text-pink-400 bg-pink-500/10 border border-pink-500/20 rounded-full px-3 py-1 mb-6">
            100% anonim · 18+
          </span>
          <h1 className="font-[family-name:var(--font-fraunces)] text-4xl sm:text-6xl leading-[1.05] font-medium text-white">
            Egy kattintás.
            <br />
            <span className="italic bg-gradient-to-r from-pink-400 via-rose-400 to-red-400 bg-clip-text text-transparent">
              Egy idegen.
            </span>
            <br />
            Egy jó beszélgetés.
          </h1>
          <p className="mt-6 text-gray-400 text-base sm:text-lg leading-relaxed max-w-lg">
            Nincs profilkép, nincs végtelen swipe. Megadod, kit keresel és
            honnan – mi pedig másodperceken belül összekötünk valakivel, akivel
            tényleg van miről beszélgetni.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#parositas"
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-sm shadow-lg shadow-pink-500/20 transition active:scale-95"
            >
              Párosítás indítása
            </a>
            <a
              href="#hogyan-működik"
              className="text-sm font-medium text-gray-300 hover:text-pink-400 transition"
            >
              Hogyan működik? ↓
            </a>
          </div>
        </div>

        {/* Signature elem: "jelzőfény" – két pont egymásra talál, ahogy a
            párosítás megye + hobbi alapján összeköt két embert. */}
        <div className="relative flex items-center justify-center h-72 sm:h-96" aria-hidden="true">
          <svg viewBox="0 0 360 320" className="w-full h-full max-w-sm">
            <line x1="90" y1="220" x2="270" y2="100" stroke="#ec489966" strokeWidth="2" className="jelzofeny-vonal" />
            <circle cx="90" cy="220" r="34" fill="#ec489918" className="jelzofeny-gyuru" />
            <circle cx="90" cy="220" r="10" fill="#ec4899" className="jelzofeny-pont" />
            <circle cx="270" cy="100" r="34" fill="#f5b75918" className="jelzofeny-gyuru" style={{ animationDelay: "1.2s" }} />
            <circle cx="270" cy="100" r="10" fill="#f5b759" className="jelzofeny-pont" style={{ animationDelay: "1.2s" }} />
            <text x="60" y="260" fill="#9ca3af" fontSize="12" fontFamily="var(--font-geist-mono)">Te</text>
            <text x="248" y="80" fill="#9ca3af" fontSize="12" fontFamily="var(--font-geist-mono)">Valaki új</text>
          </svg>
        </div>
      </section>

      {/* ---------- HOGYAN MŰKÖDIK ---------- */}
      <section id="hogyan-működik" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 border-t border-white/[0.06]">
        <div className="max-w-xl mb-12">
          <span className="text-[11px] font-[family-name:var(--font-geist-mono)] uppercase tracking-[0.2em] text-pink-400">
            Hogyan működik
          </span>
          <h2 className="mt-3 font-[family-name:var(--font-fraunces)] text-3xl sm:text-4xl text-white">
            Négy lépés a beszélgetésig
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {LEPESEK.map((l) => (
            <div key={l.szam} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
              <div className="font-[family-name:var(--font-fraunces)] italic text-3xl text-pink-500/70 mb-4">
                {l.szam}
              </div>
              <h3 className="text-white font-semibold mb-2">{l.cim}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{l.leiras}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- BIZTONSÁG ---------- */}
      <section id="biztonsag" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 border-t border-white/[0.06]">
        <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-12">
          <div>
            <span className="text-[11px] font-[family-name:var(--font-geist-mono)] uppercase tracking-[0.2em] text-pink-400">
              Anonimitás & biztonság
            </span>
            <h2 className="mt-3 font-[family-name:var(--font-fraunces)] text-3xl sm:text-4xl text-white">
              A profilod te magad vagy – semmi több
            </h2>
            <p className="mt-4 text-gray-400 text-sm leading-relaxed max-w-md">
              Nincs kép, nincs életrajz, nincs végtelen görgetés. A
              beszélgetésen múlik minden, nem egy megkomponált profilon.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {BIZTONSAGI_PONTOK.map((b) => (
              <div key={b.cim} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                <h3 className="text-white font-semibold text-sm mb-1.5">{b.cim}</h3>
                <p className="text-gray-400 text-[13px] leading-relaxed">{b.leiras}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- PÁROSÍTÁS ŰRLAP ---------- */}
      <section id="parositas" className="max-w-3xl mx-auto px-4 sm:px-6 py-20 border-t border-white/[0.06]">
        <div className="text-center mb-10">
          <span className="text-[11px] font-[family-name:var(--font-geist-mono)] uppercase tracking-[0.2em] text-pink-400">
            Kezdjük el
          </span>
          <h2 className="mt-3 font-[family-name:var(--font-fraunces)] text-3xl sm:text-4xl text-white">
            Töltsd ki, és indul a keresés
          </h2>
        </div>
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
          <ParositasForm />
        </div>
      </section>

      {/* ---------- GYIK ---------- */}
      <section id="gyik" className="max-w-3xl mx-auto px-4 sm:px-6 py-20 border-t border-white/[0.06]">
        <div className="mb-10">
          <span className="text-[11px] font-[family-name:var(--font-geist-mono)] uppercase tracking-[0.2em] text-pink-400">
            GY.I.K.
          </span>
          <h2 className="mt-3 font-[family-name:var(--font-fraunces)] text-3xl sm:text-4xl text-white">
            Amit még jó tudni
          </h2>
        </div>
        <div className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
          {GYIK.map((g) => (
            <details key={g.kerdes} className="group py-5">
              <summary className="flex items-center justify-between cursor-pointer list-none text-white font-medium text-sm sm:text-base">
                {g.kerdes}
                <span className="ml-4 text-pink-400 transition-transform group-open:rotate-45 text-lg leading-none">+</span>
              </summary>
              <p className="mt-3 text-gray-400 text-sm leading-relaxed">{g.valasz}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
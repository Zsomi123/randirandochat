import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

const ALAPERTELMEZETT_NAPI_LIMIT = 20;

// Segédfüggvény a mai dátumhoz (magyar időzóna szerint)
function getMaiDatum() {
  return new Date().toLocaleDateString("hu-HU", { timeZone: "Europe/Budapest" });
}

// JAVÍTÁS: a server.js-ben már eddig is volt egy hasonló tisztítófüggvény
// (nyersIpTisztitasa), de itt hiányzott -> production-ben, ha az
// x-forwarded-for több IP-t is tartalmaz (proxy-lánc), a két hely más-más
// "ip_..." kulcsot számolt volna ki ugyanarra a felhasználóra, emiatt a
// megjelenített napiLimit eltérhetett a ténylegesen érvényesített limittől.
function nyersIpTisztitasa(ip: string | null) {
  if (!ip) return null;
  return ip.split(",")[0].trim();
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Nincs bejelentkezve" }, { status: 401 });
    }

    // 1. Felhasználó alapadatai (+ admin mezők, amik a limit- és ban-logikához kellenek)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        becenev: true,
        kor: true,
        nem: true,
        keresettNem: true,
        megyek: true,
        hobbik: true,
        isPremium: true,
        isAdmin: true,
        napiLimitOverride: true,
        isBanned: true,
        bannedUntil: true,
        banReason: true,
        lastIp: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Felhasználó nem található" }, { status: 404 });
    }

    // 2. IP CÍM KIKERESÉSE (megtisztítva, hogy a server.js-szel egyező
    // "ip_<ip>" kulcsot adjon ki)
    const nyersIp = req.headers.get("x-forwarded-for");
    const ip = nyersIpTisztitasa(nyersIp) || "ismeretlen_ip";
    const maiDatum = getMaiDatum();

    // Elmentjük a legutóbb látott IP-t a felhasználóhoz, hogy az admin
    // felületen IP alapján is kereshető legyen, és hogy az admin PATCH route
    // is tudja, melyik "ip_..." rekord a felhasználó ténylegesen érvényesített
    // limit-számlálója. Nem várjuk meg a választ, és nem szakítjuk meg a
    // kérést, ha ez esetleg nem sikerülne.
    if (ip !== "ismeretlen_ip" && ip !== user.lastIp) {
      prisma.user
        .update({ where: { email: session.user.email }, data: { lastIp: ip } })
        .catch((err) => console.error("Nem sikerült frissíteni az utolsó IP-t:", err));
    }

    // 3. LIMIT ELLENŐRZÉSE (E-mail ÉS IP cím alapján)
    const emailLimitDb = await prisma.napiLimit.findUnique({
      where: { azonosito: `email_${session.user.email}` }
    });

    const ipLimitDb = await prisma.napiLimit.findUnique({
      where: { azonosito: `ip_${ip}` }
    });

    // Azt a használatot vesszük alapul, amelyik a NAGYOBB (így ha váltogatja a fiókokat az IP-jén, akkor is a maximumot nézzük)
    const emailHasznalt = (emailLimitDb?.datum === maiDatum) ? emailLimitDb.hasznalt : 0;
    const ipHasznalt = (ipLimitDb?.datum === maiDatum) ? ipLimitDb.hasznalt : 0;

    // FONTOS: a server.js (a tényleges párosítás-blokkolás helye) KIZÁRÓLAG
    // az "ip_<ip>" rekordot növeli és nézi. Az "email_<email>" rekordot ma
    // csak az admin felület "Mai használat beállítása" művelete írja - ezért
    // itt is jelezzük/vesszük figyelembe, de az elsődleges, ténylegesen
    // számító érték az ipHasznalt.
    const tenylegesenHasznalt = Math.max(emailHasznalt, ipHasznalt);

    // Ha az admin egyedi napi limitet állított be erre a felhasználóra, azt vesszük figyelembe
    // az alapértelmezett helyett.
    const maxNapiLimit = user.napiLimitOverride ?? ALAPERTELMEZETT_NAPI_LIMIT;

    // JAVÍTÁS: prémium felhasználóknak nincs napi keretük - korlátlanul
    // párosíthatnak (lásd server.js: a "regisztracio_parositasra" handler
    // isPremium=true esetén teljesen kihagyja a limit-ellenőrzést). Emiatt
    // itt sem szabad egy véges "hátralévő limit" számot visszaadni neki,
    // mert azt bármelyik más felület (pl. profil, prémium oldal) tévesen
    // "lejárt a napi kereted" jelzésként jeleníthetné meg. Prémiumnál a
    // napiLimit mező null - ez jelenti a frontend felé, hogy korlátlan.
    const hatralevoLimit = user.isPremium ? null : Math.max(0, maxNapiLimit - tenylegesenHasznalt);

    return NextResponse.json({
      becenev: user.becenev,
      kor: user.kor,
      nem: user.nem,
      keresettNem: user.keresettNem,
      megyek: user.megyek,
      hobbik: user.hobbik,
      isPremium: user.isPremium,
      isAdmin: user.isAdmin,
      // A tényleges tiltás-érvényesítés (bejelentkezés/hozzáférés blokkolása) még nincs
      // kiépítve — ezek a mezők egyelőre csak informatívak, a frontend eldöntheti,
      // mit kezd velük, ha majd a banrendszer elkészül.
      isBanned: user.isBanned,
      bannedUntil: user.bannedUntil,
      banReason: user.banReason,
      // null = korlátlan (prémium), szám = hátralévő ingyenes párosítások mára
      napiLimit: hatralevoLimit
    });

  } catch (error) {
    console.error("Hiba a profil lekérésekor:", error);
    return NextResponse.json({ error: "Szerver hiba" }, { status: 500 });
  }
}
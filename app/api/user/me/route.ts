import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

const MAX_NAPI_LIMIT = 20;

// Segédfüggvény a mai dátumhoz (magyar időzóna szerint)
function getMaiDatum() {
  return new Date().toLocaleDateString("hu-HU", { timeZone: "Europe/Budapest" });
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Nincs bejelentkezve" }, { status: 401 });
    }

    // 1. Felhasználó alapadatai
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        becenev: true,
        kor: true,
        nem: true,
        keresettNem: true,
        megyek: true,
        hobbik: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Felhasználó nem található" }, { status: 404 });
    }

    // 2. IP CÍM KIKERESÉSE
    // Next.js-ben a fejlécekből tudjuk kiolvasni a felhasználó valós IP címét
    const ip = req.headers.get("x-forwarded-for") || "ismeretlen_ip";
    const maiDatum = getMaiDatum();

    // 3. LIMIT ELLENŐRZÉSE (E-mail ÉS IP cím alapján)
    // Megnézzük, van-e már bejegyzés a mai napra az IP címéhez vagy az E-mailjéhez
    // 44. sor:
    const emailLimitDb = await prisma.napiLimit.findUnique({
      where: { azonosito: `email_${session.user.email}` }
    });

    // 48. sor (ide is írd be az "i"-t, ha ott is hiányzik!):
    const ipLimitDb = await prisma.napiLimit.findUnique({
      where: { azonosito: `ip_${ip}` }
    });

    // Azt a használatot vesszük alapul, amelyik a NAGYOBB (így ha váltogatja a fiókokat az IP-jén, akkor is a maximumot nézzük)
    const emailHasznalt = (emailLimitDb?.datum === maiDatum) ? emailLimitDb.hasznalt : 0;
    const ipHasznalt = (ipLimitDb?.datum === maiDatum) ? ipLimitDb.hasznalt : 0;
    
    const tenylegesenHasznalt = Math.max(emailHasznalt, ipHasznalt);
    const hatralevoLimit = Math.max(0, MAX_NAPI_LIMIT - tenylegesenHasznalt);

    return NextResponse.json({
      ...user,
      napiLimit: hatralevoLimit
    });

  } catch (error) {
    console.error("Hiba a profil lekérésekor:", error);
    return NextResponse.json({ error: "Szerver hiba" }, { status: 500 });
  }
}
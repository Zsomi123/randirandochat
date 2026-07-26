import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Nincs bejelentkezve" }, { status: 401 });
    }

    // 1. Szigorú ellenőrzés: Tényleg Admin az illető?
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isAdmin: true },
    });

    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: "Nincs jogosultságod ehhez!" }, { status: 403 });
    }

    // 2. Opcionális IP-keresés a lekérdezésben (?ip=...)
    const { searchParams } = new URL(req.url);
    const ipKereses = searchParams.get("ip")?.trim();

    let emailekIpAlapjan: string[] = [];
    if (ipKereses) {
      // Megkeressük, mely NapiLimit rekordokhoz (IP-khez) tartozik ez a részlet,
      // és kigyűjtjük a hozzájuk tartozó email címeket is.
      const talalatok = await prisma.napiLimit.findMany({
        where: { azonosito: { contains: ipKereses } },
        select: { email: true },
      });
      emailekIpAlapjan = talalatok
        .map((t) => t.email)
        .filter((e): e is string => !!e);
    }

    // 3. Felhasználók lekérése (IP-szűréssel, ha van)
    const users = await prisma.user.findMany({
      where: ipKereses
        ? {
            OR: [
              { lastIp: { contains: ipKereses } },
              ...(emailekIpAlapjan.length > 0
                ? [{ email: { in: emailekIpAlapjan } }]
                : []),
            ],
          }
        : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        becenev: true,
        isPremium: true,
        isAdmin: true,
        isBanned: true,
        bannedUntil: true,
        banReason: true,
        napiLimitOverride: true,
        lastIp: true,
      },
      orderBy: { name: "asc" },
    });

    // A mai napi limit-használat hozzáfűzése minden felhasználóhoz.
    //
    // FONTOS: a "datum" mezőt eredetileg egy Intl locale-formázás (hu-HU) hozza létre,
    // ami eltérő Node/ICU build esetén LÁTHATATLANUL eltérő szóköz-karaktereket
    // eredményezhet (pl. sima szóköz vs. keskeny nem-törő szóköz), emiatt egy egzakt
    // SQL string-egyezés hibásan sosem találhat egyezést. Ezért itt nem az adatbázisra
    // bízzuk a dátum-szűrést, hanem lekérjük az összes releváns sort, és kódban,
    // a whitespace-t eltávolítva hasonlítjuk össze a mai nappal.
    const ma = new Date().toLocaleDateString("hu-HU", { timeZone: "Europe/Budapest" });
    const normalizalt = (s: string) => s.replace(/\s+/g, "");
    const maNormalizalt = normalizalt(ma);

    const emailek = users.map((u) => u.email).filter((e): e is string => !!e);

    // A NapiLimit rekordok "email" mezője alapján nézzük a mai használatot
    // (az azonosito kulcs valójában IP-alapú, pl. "ip_::1", az email csak kísérő infó rajta).
    const napiHasznalatokMind =
      emailek.length > 0
        ? await prisma.napiLimit.findMany({
            where: { email: { in: emailek } },
            select: { email: true, hasznalt: true, datum: true },
          })
        : [];

    const napiHasznalatok = napiHasznalatokMind.filter(
      (nh) => normalizalt(nh.datum) === maNormalizalt
    );

    // Math.max-ot használunk sum helyett, hogy ha egy felhasználóhoz több IP-s sor is
    // tartozna ugyanarra a napra, ne adódjanak össze hibásan, hanem a magasabb értéket lássuk.
    const hasznalatMap = new Map<string, number>();
    for (const nh of napiHasznalatok) {
      if (!nh.email) continue;
      const eddigi = hasznalatMap.get(nh.email) ?? 0;
      hasznalatMap.set(nh.email, Math.max(eddigi, nh.hasznalt));
    }

    const kiegeszitve = users.map((u) => ({
      ...u,
      maiHasznalat: u.email ? hasznalatMap.get(u.email) || 0 : 0,
    }));

    return NextResponse.json(kiegeszitve);
  } catch (error) {
    console.error("Hiba a felhasználók lekérésekor:", error);
    return NextResponse.json({ error: "Szerver hiba" }, { status: 500 });
  }
}
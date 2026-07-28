import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

// A server.js-ben használt IP-tisztító logika lemásolása
function tisztitottIp(ip: string | null | undefined) {
  if (!ip) return null;
  const tiszta = ip.split(",")[0].trim();
  if (!tiszta || tiszta === "ismeretlen_ip") return null;
  return `ip_${tiszta}`;
}

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

    // 4. A mai nap pontos meghatározása a szűréshez
    const ma = new Date().toLocaleDateString("hu-HU", { timeZone: "Europe/Budapest" });
    const normalizalt = (s: string) => s.replace(/\s+/g, "");
    const maNormalizalt = normalizalt(ma);

    // Kigyűjtjük az IP-azonosítókat és az emaileket is
    const emailList = users.map((u) => u.email).filter(Boolean) as string[];
    const ipAzonositok = users
      .map((u) => tisztitottIp(u.lastIp))
      .filter(Boolean) as string[];

    // 5. Lekérdezzük a limiteket mindkét (IP és email) szempont alapján
    const napiHasznalatokMind = await prisma.napiLimit.findMany({
      where: {
        OR: [
          { azonosito: { in: ipAzonositok } },
          { email: { in: emailList } }
        ]
      },
      select: { azonosito: true, email: true, hasznalt: true, datum: true },
    });

    const napiHasznalatokMai = napiHasznalatokMind.filter(
      (nh) => normalizalt(nh.datum) === maNormalizalt
    );

    // 6. Összesítjük az eredményeket a felhasználókhoz
    const kiegeszitve = users.map((u) => {
      let maxHasznalt = 0;
      const sajatIpAzonosito = tisztitottIp(u.lastIp);

      for (const nh of napiHasznalatokMai) {
        // Ha egyezik az IP, VAGY egyezik az email, akkor figyelembe vesszük
        const egyezikAzonosito = sajatIpAzonosito && nh.azonosito === sajatIpAzonosito;
        const egyezikEmail = u.email && nh.email && nh.email.toLowerCase() === u.email.toLowerCase();

        if (egyezikAzonosito || egyezikEmail) {
          maxHasznalt = Math.max(maxHasznalt, nh.hasznalt);
        }
      }

      return {
        ...u,
        maiHasznalat: maxHasznalt,
      };
    });

    return NextResponse.json(kiegeszitve);
  } catch (error) {
    console.error("Hiba a felhasználók lekérésekor:", error);
    return NextResponse.json({ error: "Szerver hiba" }, { status: 500 });
  }
}
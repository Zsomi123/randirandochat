import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

async function ellenorizAdmin() {
  const session = await getServerSession();
  if (!session || !session.user?.email) return null;

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, isAdmin: true },
  });

  if (!currentUser?.isAdmin) return null;
  return currentUser;
}

// JAVÍTÁS: a tényleges párosítás-blokkolást végző server.js KIZÁRÓLAG az
// "ip_<ip>" kulcsú NapiLimit rekordot növeli és olvassa (lásd server.js
// noveldLimitet / getLimitHasznalat). Az admin felület korábban a "mai
// használat" konkrét értékének beállításakor egy "email_<email>" kulcsú
// rekordba írt, amit a server.js soha nem olvas ki - ezért az admin által
// beállított érték a valódi limit-érvényesítésre nem volt hatással.
//
// Itt ugyanazt az IP-tisztítást használjuk, mint a server.js és a
// /api/user/me, hogy pontosan ugyanarra a kulcsra írjunk, amit a
// párosító szerver ténylegesen figyelembe vesz.
function tisztitottIp(ip: string | null | undefined) {
  if (!ip) return null;
  const tiszta = ip.split(",")[0].trim();
  if (!tiszta || tiszta === "ismeretlen_ip") return null;
  return tiszta;
}

// ÚJ: a User.isBanned mellett a hozzá tartozó (utolsó ismert) IP címet is
// szinkronban tartjuk a BannedIp táblával, hogy a tiltás ne csak a fiókra,
// hanem a hálózatra/gépre is érvényesüljön (lásd server.js ellenorizIpTiltas).
async function szinkronizaldIpTiltast(
  ip: string | null,
  isBanned: boolean,
  bannedUntil: Date | null,
  banReason: string | null,
  email: string | null
) {
  if (!ip) return;
  if (isBanned) {
    await prisma.bannedIp.upsert({
      where: { ip },
      update: { bannedUntil, reason: banReason, sourceEmail: email || undefined },
      create: { ip, bannedUntil, reason: banReason, sourceEmail: email || null },
    });
  } else {
    await prisma.bannedIp.deleteMany({ where: { ip } });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await ellenorizAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Nincs jogosultságod ehhez!" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};

    if (typeof body.isAdmin === "boolean") {
      // Ne tudja saját magától elvenni az admin jogát
      if (id === admin.id && body.isAdmin === false) {
        return NextResponse.json(
          { error: "Saját admin jogodat nem veheted el!" },
          { status: 400 }
        );
      }
      data.isAdmin = body.isAdmin;
    }

    if (typeof body.isPremium === "boolean") {
      data.isPremium = body.isPremium;
    }

    if (typeof body.isBanned === "boolean") {
      data.isBanned = body.isBanned;
      // Ha feloldjuk a tiltást, töröljük a hozzá tartozó adatokat is
      if (body.isBanned === false) {
        data.bannedUntil = null;
        data.banReason = null;
      }
    }

    if (body.bannedUntil !== undefined) {
      data.bannedUntil = body.bannedUntil ? new Date(body.bannedUntil) : null;
    }

    if (body.banReason !== undefined) {
      data.banReason = body.banReason || null;
    }

    if (body.napiLimitOverride !== undefined) {
      data.napiLimitOverride =
        body.napiLimitOverride === null || body.napiLimitOverride === ""
          ? null
          : Number(body.napiLimitOverride);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
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
    });

    // ÚJ: ha ebben a kérésben változott a tiltás állapota, az utolsó ismert
    // IP-címét is szinkronba hozzuk a BannedIp táblával.
    if (typeof body.isBanned === "boolean") {
      await szinkronizaldIpTiltast(
        tisztitottIp(updated.lastIp),
        updated.isBanned,
        updated.bannedUntil,
        updated.banReason,
        updated.email
      );
    }

    // A mai napi limit-használat kezelése: vagy nullázás (resetTodayUsage), vagy
    // egy konkrét, admin által megadott érték beállítása (setTodayUsage).
    //
    // Whitespace-független dátum-összehasonlítást használunk (lásd a GET route
    // megjegyzését), mert az Intl locale-formázás Node/ICU build-től függően eltérő
    // szóköz-karaktereket eredményezhet, amitől egy egzakt "datum" egyezés hibásan
    // sosem találna semmit.
    let maiHasznalatVisszaadva: number | null = null;

    if ((body.resetTodayUsage === true || body.setTodayUsage !== undefined) && updated.email) {
      const ma = new Date().toLocaleDateString("hu-HU", { timeZone: "Europe/Budapest" });
      const normalizalt = (s: string) => s.replace(/\s+/g, "");
      const maNormalizalt = normalizalt(ma);

      const kivantErtek =
        body.setTodayUsage !== undefined ? Math.max(0, Number(body.setTodayUsage)) : 0;

      // 1. Nullázzuk a mai napra vonatkozó összes meglévő sort ehhez az emailhez
      // (pl. az IP-alapú számlálót is - ezt írja/olvassa ténylegesen a
      // server.js -, valamint bármely régi "email_..." rekordot), hogy ne
      // torzítsa a max()-os limit-számítást, és a valódi számláló is nullázódjon.
      const erintettSorok = await prisma.napiLimit.findMany({
        where: { email: updated.email },
        select: { azonosito: true, datum: true },
      });
      const maiAzonositok = erintettSorok
        .filter((s) => normalizalt(s.datum) === maNormalizalt)
        .map((s) => s.azonosito);

      if (maiAzonositok.length > 0) {
        await prisma.napiLimit.updateMany({
          where: { azonosito: { in: maiAzonositok } },
          data: { hasznalt: 0 },
        });
      }

      // 2. Ha konkrét értéket kértek beállítani (nem csak nullázást), azt
      // ARRA a rekordra írjuk fel, amit a server.js TÉNYLEGESEN olvas és
      // növel párosításkor: az "ip_<lastIp>" kulcsra. Ha valamiért nincs
      // ismert IP-je a felhasználónak (pl. még sosem járt a /api/user/me
      // route-on, ami elmenti a lastIp-t), fallback-ként a régi
      // "email_<email>" kulcsra írunk, hogy legalább a kijelzett érték
      // helyes legyen - de ez esetben figyelmeztetünk is a válaszban.
      let celAzonosito: string;
      let vanValodiIpCel = false;

      const ip = tisztitottIp(updated.lastIp);
      if (ip) {
        celAzonosito = `ip_${ip}`;
        vanValodiIpCel = true;
      } else {
        celAzonosito = `email_${updated.email}`;
      }

      if (kivantErtek > 0) {
        await prisma.napiLimit.upsert({
          where: { azonosito: celAzonosito },
          update: { hasznalt: kivantErtek, datum: ma, email: updated.email },
          create: {
            azonosito: celAzonosito,
            hasznalt: kivantErtek,
            datum: ma,
            email: updated.email,
          },
        });
      }

      maiHasznalatVisszaadva = kivantErtek;

      if (!vanValodiIpCel && kivantErtek > 0) {
        console.warn(
          `⚠️ ${updated.email} felhasználónak nincs ismert lastIp-je, a mai használat csak az "email_" kulcson lett beállítva, ami a server.js-t nem befolyásolja.`
        );
      }
    }

    return NextResponse.json({
      ...updated,
      ...(maiHasznalatVisszaadva !== null ? { maiHasznalat: maiHasznalatVisszaadva } : {}),
    });
  } catch (error) {
    console.error("Hiba a felhasználó frissítésekor:", error);
    return NextResponse.json({ error: "Szerver hiba" }, { status: 500 });
  }
}
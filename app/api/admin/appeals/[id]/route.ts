import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

function datumFormazas(d: Date) {
  return d.toLocaleString("hu-HU", { timeZone: "Europe/Budapest" });
}

// Ugyanaz az IP-tisztító logika, mint a többi admin route-ban és a server.js-ben.
function tisztitottIp(ip: string | null | undefined) {
  if (!ip) return null;
  const tiszta = ip.split(",")[0].trim();
  if (!tiszta || tiszta === "ismeretlen_ip") return null;
  return tiszta;
}

async function ellenorizAdmin() {
  const session = await getServerSession();
  if (!session || !session.user?.email) return null;

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { email: true, isAdmin: true },
  });

  if (!currentUser?.isAdmin) return null;
  return currentUser;
}

// ÚJ: FELLEBBEZÉS ELBÍRÁLÁSA (elfogadás vagy elutasítás)
// Elfogadás esetén feloldjuk a felhasználó (email alapú) ÉS az utolsó ismert
// IP-címéhez tartozó (BannedIp) tiltását is - hiszen a tiltás mindkét helyen
// külön van eltárolva (lásd server.js ellenorizTiltas / ellenorizIpTiltas).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await ellenorizAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Nincs jogosultságod ehhez!" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    if (body.action !== "elfogad" && body.action !== "elutasit") {
      return NextResponse.json({ error: "Ismeretlen művelet." }, { status: 400 });
    }

    const fellebbezes = await prisma.fellebbezes.findUnique({ where: { id } });
    if (!fellebbezes) {
      return NextResponse.json({ error: "A fellebbezés nem található." }, { status: 404 });
    }

    const most = new Date();
    const valasz = typeof body.valasz === "string" ? body.valasz.trim() : null;

    if (body.action === "elfogad") {
      const erintettUser = await prisma.user.findUnique({
        where: { email: fellebbezes.userEmail },
        select: { lastIp: true },
      });

      // 1. A felhasználó (email alapú) tiltásának feloldása
      await prisma.user.updateMany({
        where: { email: fellebbezes.userEmail },
        data: { isBanned: false, bannedUntil: null, banReason: null },
      });

      // 2. Az utolsó ismert IP-címéhez tartozó BannedIp rekord törlése (ha van).
      // FONTOS: ha ugyanazt az IP-t esetleg más (jogosan kitiltott) felhasználó
      // is használta, ez a lépés az ő IP-tiltásukat is feloldja - ez a jelenlegi
      // adatmodell (egy rekord / IP) melletti elfogadott korlát.
      const ip = tisztitottIp(erintettUser?.lastIp);
      if (ip) {
        await prisma.bannedIp.deleteMany({ where: { ip } });
      }
    }

    const updated = await prisma.fellebbezes.update({
      where: { id },
      data: {
        statusz: body.action === "elfogad" ? "elfogadva" : "elutasitva",
        adminValasz: valasz || null,
        elbiraloEmail: admin.email,
        elbiraltIdo: most,
      },
    });

    return NextResponse.json({
      id: updated.id,
      datum: datumFormazas(updated.createdAt),
      userEmail: updated.userEmail,
      userNev: updated.userNev || updated.userEmail,
      uzenet: updated.uzenet,
      bannedUntil: updated.bannedUntil,
      banReason: updated.banReason,
      statusz: updated.statusz,
      adminValasz: updated.adminValasz,
      elbiraloEmail: updated.elbiraloEmail,
      elbiraltIdo: updated.elbiraltIdo ? datumFormazas(updated.elbiraltIdo) : null,
    });
  } catch (error) {
    console.error("Hiba a fellebbezés elbírálásakor:", error);
    return NextResponse.json({ error: "Szerver hiba" }, { status: 500 });
  }
}
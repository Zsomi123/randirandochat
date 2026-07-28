import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

function datumFormazas(d: Date) {
  return d.toLocaleString("hu-HU", { timeZone: "Europe/Budapest" });
}

async function ellenorizAdmin() {
  const session = await getServerSession();
  if (!session || !session.user?.email) return null;

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isAdmin: true },
  });

  if (!currentUser?.isAdmin) return null;
  return currentUser;
}

// ÚJ: FELLEBBEZÉSEK LISTÁJA (admin felület - "Fellebbezések" fül)
export async function GET() {
  try {
    const admin = await ellenorizAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Nincs jogosultságod ehhez!" }, { status: 403 });
    }

    const fellebbezesek = await prisma.fellebbezes.findMany({
      orderBy: { createdAt: "desc" },
    });

    const eredmeny = fellebbezesek.map((f) => ({
      id: f.id,
      datum: datumFormazas(f.createdAt),
      userEmail: f.userEmail,
      userNev: f.userNev || f.userEmail,
      uzenet: f.uzenet,
      bannedUntil: f.bannedUntil,
      banReason: f.banReason,
      statusz: f.statusz,
      adminValasz: f.adminValasz,
      elbiraloEmail: f.elbiraloEmail,
      elbiraltIdo: f.elbiraltIdo ? datumFormazas(f.elbiraltIdo) : null,
    }));

    return NextResponse.json(eredmeny);
  } catch (error) {
    console.error("Hiba a fellebbezések lekérésekor:", error);
    return NextResponse.json({ error: "Szerver hiba" }, { status: 500 });
  }
}
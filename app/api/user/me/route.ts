import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1. Lekérjük a jelenlegi Google munkamenetet
    const session = await getServerSession();
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Nincs bejelentkezve" }, { status: 401 });
    }

    // 2. Kikeresjük a felhasználót az e-mail címe alapján a Neon adatbázisból
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

    return NextResponse.json(user);
  } catch (error) {
    console.error("Hiba a profil lekérésekor:", error);
    return NextResponse.json({ error: "Szerver hiba" }, { status: 500 });
  }
}
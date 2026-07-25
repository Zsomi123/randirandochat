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
      select: { isAdmin: true }
    });

    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: "Nincs jogosultságod ehhez!" }, { status: 403 });
    }

    // 2. Ha admin, lekérjük az összes felhasználót
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        becenev: true,
        isPremium: true,
        isAdmin: true,
      }
    });

    return NextResponse.json(users);

  } catch (error) {
    console.error("Hiba a felhasználók lekérésekor:", error);
    return NextResponse.json({ error: "Szerver hiba" }, { status: 500 });
  }
}
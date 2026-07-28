import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

// ÚJ: FELLEBBEZÉS BEKÜLDÉSE egy aktív kitiltás ellen.
// Csak bejelentkezett, PRÉMIUM és ténylegesen kitiltott (isBanned=true)
// felhasználók nyújthatnak be fellebbezést, és egyszerre csak egy "fuggo"
// (elbírálás alatt álló) fellebbezésük lehet.
export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: "Nincs bejelentkezve" }, { status: 401 });
    }

    const body = await req.json();
    const uzenet = typeof body?.uzenet === "string" ? body.uzenet.trim() : "";

    if (!uzenet) {
      return NextResponse.json(
        { success: false, error: "Kérlek, írj néhány mondatot a fellebbezésedhez." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        email: true,
        becenev: true,
        name: true,
        isPremium: true,
        isBanned: true,
        bannedUntil: true,
        banReason: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "Felhasználó nem található" }, { status: 404 });
    }

    if (!user.isPremium) {
      return NextResponse.json(
        { success: false, error: "Fellebbezést csak Prémium tagok nyújthatnak be." },
        { status: 403 }
      );
    }

    if (!user.isBanned) {
      return NextResponse.json(
        { success: false, error: "A fiókod jelenleg nincs kitiltva, nincs mit fellebbezni." },
        { status: 400 }
      );
    }

    const meglevoFuggo = await prisma.fellebbezes.findFirst({
      where: { userEmail: user.email!, statusz: "fuggo" },
    });

    if (meglevoFuggo) {
      return NextResponse.json(
        { success: false, error: "Már van egy elbírálás alatt álló fellebbezésed." },
        { status: 400 }
      );
    }

    const fellebbezes = await prisma.fellebbezes.create({
      data: {
        userEmail: user.email!,
        userNev: user.becenev || user.name || null,
        uzenet,
        bannedUntil: user.bannedUntil,
        banReason: user.banReason,
      },
    });

    return NextResponse.json({ success: true, id: fellebbezes.id });
  } catch (error) {
    console.error("Hiba a fellebbezés beküldésekor:", error);
    return NextResponse.json({ success: false, error: "Szerver hiba történt" }, { status: 500 });
  }
}
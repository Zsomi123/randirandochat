import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nev, kor, nem, keresettNem, megyek, hobbik, email } = body;

    // 1. Biztonsági ellenőrzés: Csak bejelentkezett usereket engedünk tovább!
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Nincs bejelentkezve!" },
        { status: 401 }
      );
    }

    // 2. Kikeressük és FRISSÍTJÜK a Google-fiókkal rendelkező usert az adatbázisban
    const user = await prisma.user.update({
      where: { email: email },
      data: {
        becenev: nev,
        kor: Number(kor),
        nem,
        keresettNem,
        megyek,
        hobbik,
      },
    });

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error) {
    console.error("Hiba a mentésnél:", error);
    return NextResponse.json(
      { success: false, error: "Szerver hiba történt a mentés során." },
      { status: 500 }
    );
  }
}
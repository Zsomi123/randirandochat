import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nev, kor, nem, keresettNem, megyek, hobbik } = body;

    if (!nev || !kor) {
      return NextResponse.json(
        { error: "Név és kor megadása kötelező!" },
        { status: 400 }
      );
    }

    // Felhasználó létrehozása a PostgreSQL adatbázisban
    const ujUser = await prisma.user.create({
      data: {
        becenev: nev,
        kor: parseInt(kor, 10),
        nem: nem || "férfi",
        keresettNem: keresettNem || "nő",
        megyek: Array.isArray(megyek) ? megyek : [],
        hobbik: Array.isArray(hobbik) ? hobbik : [],
      },
    });

    console.log("💾 Új user elmentve az adatbázisba:", ujUser.id);

    return NextResponse.json({ success: true, userId: ujUser.id });
  } catch (error) {
    console.error("❌ Adatbázis mentési hiba:", error);
    return NextResponse.json(
      { error: "Hiba történt a mentés során." },
      { status: 500 }
    );
  }
}
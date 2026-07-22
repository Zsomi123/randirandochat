import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Nincs bejelentkezve" }, { status: 401 });
    }

    // Töröljük a felhasználót az e-mail címe alapján az adatbázisból.
    // Mivel a sémában beállítottuk az "onDelete: Cascade"-ot, ez automatikusan
    // viszi magával a hozzákapcsolt Google Accountot és a Sessionöket is!
    await prisma.user.delete({
      where: { email: session.user.email }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Hiba a törlésnél:", error);
    return NextResponse.json({ error: "Szerver hiba történt a törlés során" }, { status: 500 });
  }
}
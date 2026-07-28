import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

// Ugyanaz a beszélgetés-üzenet típus, amit a dashboard page.tsx használ
// (felado: "en" = a bejelentő, "partner" = a jelentett személy, "rendszer" = infó-üzenet).
type ChatUzenet = { felado: "en" | "partner" | "rendszer"; szoveg: string; ido: number };

function idoFormazas(ts: number) {
  return new Date(ts).toLocaleTimeString("hu-HU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Budapest",
  });
}

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

export async function GET() {
  try {
    const admin = await ellenorizAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Nincs jogosultságod ehhez!" }, { status: 403 });
    }

    const reports = await prisma.report.findMany({
      orderBy: { createdAt: "desc" },
    });

    // 1. Bejelentői előélet: hány korábbi jelentése lett "megoldott" (helyes), és hány "elutasitott" (alaptalan)
    const bejelentoEmailek = Array.from(new Set(reports.map((r) => r.reporterEmail)));
    const eloeletLista = bejelentoEmailek.length
      ? await prisma.report.findMany({
          where: { reporterEmail: { in: bejelentoEmailek } },
          select: { reporterEmail: true, statusz: true },
        })
      : [];

    const eloeletTerkep = new Map<string, { helyes: number; alaptalan: number }>();
    for (const r of eloeletLista) {
      const jelenlegi = eloeletTerkep.get(r.reporterEmail) || { helyes: 0, alaptalan: 0 };
      if (r.statusz === "megoldott") jelenlegi.helyes += 1;
      if (r.statusz === "elutasitott") jelenlegi.alaptalan += 1;
      eloeletTerkep.set(r.reporterEmail, jelenlegi);
    }

    // 2. Célpontok korábbi, ténylegesen alkalmazott szankciói (moderációs előélet)
    const celpontEmailek = Array.from(new Set(reports.map((r) => r.targetEmail)));
    const korabbiSzankciok = celpontEmailek.length
      ? await prisma.report.findMany({
          where: { targetEmail: { in: celpontEmailek }, celpontSzankcioAlkalmazva: true },
          select: { targetEmail: true, celpontSzankcioIndoklas: true, elbiraltIdo: true },
          orderBy: { elbiraltIdo: "desc" },
        })
      : [];

    const tiltasTerkep = new Map<string, { datum: string; ok: string }[]>();
    for (const s of korabbiSzankciok) {
      const lista = tiltasTerkep.get(s.targetEmail) || [];
      lista.push({
        datum: s.elbiraltIdo ? datumFormazas(s.elbiraltIdo) : "",
        ok: s.celpontSzankcioIndoklas || "Nincs megadva indoklás",
      });
      tiltasTerkep.set(s.targetEmail, lista);
    }

    const eredmeny = reports.map((r) => {
      const chatLog = Array.isArray(r.chatLog) ? (r.chatLog as unknown as ChatUzenet[]) : [];

      return {
        id: r.id,
        datum: datumFormazas(r.createdAt),
        bejelentoNev: r.reporterNev || r.reporterEmail,
        bejelentoEmail: r.reporterEmail,
        bejelentoEloelet: eloeletTerkep.get(r.reporterEmail) || { helyes: 0, alaptalan: 0 },
        celpontNev: r.targetNev || r.targetEmail,
        celpontEmail: r.targetEmail,
        ok: r.okok.length > 0 ? r.okok.join(", ") : "Nincs megadva",
        statusz: r.statusz,
        chatLog: chatLog
          .filter((u) => u.felado !== "rendszer")
          .map((u) => ({
            felado: u.felado === "en" ? r.reporterNev || r.reporterEmail : r.targetNev || r.targetEmail,
            ido: idoFormazas(u.ido),
            szoveg: u.szoveg,
            isTarget: u.felado === "partner",
          })),
        celpontEloelet: {
          korabbiTiltasok: tiltasTerkep.get(r.targetEmail) || [],
        },
      };
    });

    return NextResponse.json(eredmeny);
  } catch (error) {
    console.error("Hiba a jelentések lekérésekor:", error);
    return NextResponse.json({ error: "Szerver hiba" }, { status: 500 });
  }
}
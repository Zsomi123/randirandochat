import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

type ChatUzenet = { felado: "en" | "partner" | "rendszer"; szoveg: string; ido: number };

type SzankcioBemenet = {
  duration: "1_nap" | "1_het" | "1_honap" | "vegleges" | "custom";
  customDate?: string | null;
  reason?: string;
};

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
    select: { email: true, isAdmin: true },
  });

  if (!currentUser?.isAdmin) return null;
  return currentUser;
}

// A frontend (ReportDetailsModal) az admin által kiválasztott gyorsgombokból
// (1 nap / 1 hét / 1 hónap / végleges / egyedi dátum) csak az azonosítót küldi,
// a tényleges lejárati dátumot a szerveren számoljuk ki, hogy ne a kliens órájában
// bízzunk.
function szankcioLejaratSzamitasa(duration: string, customDate?: string | null): Date | null {
  const most = new Date();
  switch (duration) {
    case "1_nap": {
      const d = new Date(most);
      d.setDate(d.getDate() + 1);
      return d;
    }
    case "1_het": {
      const d = new Date(most);
      d.setDate(d.getDate() + 7);
      return d;
    }
    case "1_honap": {
      const d = new Date(most);
      d.setMonth(d.getMonth() + 1);
      return d;
    }
    case "vegleges":
      return null;
    case "custom":
      return customDate ? new Date(customDate) : null;
    default:
      return null;
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await ellenorizAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Nincs jogosultságod ehhez!" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return NextResponse.json({ error: "A jelentés nem található." }, { status: 404 });
    }

    const most = new Date();
    let updatedReport;

    if (body.action === "elutasit") {
      // Alaptalan jelentés – nincs szankció, csak lezárjuk a jelentést.
      updatedReport = await prisma.report.update({
        where: { id },
        data: {
          statusz: "elutasitott",
          elbiraloEmail: admin.email,
          elbiraltIdo: most,
        },
      });
    } else if (body.action === "szankcio") {
      const celpont = body.celpont as SzankcioBemenet | undefined;
      const bejelento = body.bejelento as SzankcioBemenet | undefined;

      if (!celpont?.duration && !bejelento?.duration) {
        return NextResponse.json(
          { error: "Legalább az egyik fél számára meg kell adni egy tiltás időtartamát." },
          { status: 400 }
        );
      }

      const reportUpdateData: Record<string, unknown> = {
        statusz: "megoldott",
        elbiraloEmail: admin.email,
        elbiraltIdo: most,
      };

      // A CÉLPONT (jelentett személy) kitiltása
      if (celpont?.duration) {
        const lejarat = szankcioLejaratSzamitasa(celpont.duration, celpont.customDate);
        await prisma.user.updateMany({
          where: { email: report.targetEmail },
          data: {
            isBanned: true,
            bannedUntil: lejarat,
            banReason: celpont.reason || null,
          },
        });
        reportUpdateData.celpontSzankcioIndoklas = celpont.reason || null;
        reportUpdateData.celpontSzankcioLejarat = lejarat;
        reportUpdateData.celpontSzankcioAlkalmazva = true;
      }

      // A BEJELENTŐ kitiltása (pl. visszaélés/alaptalan jelentés esetén)
      if (bejelento?.duration) {
        const lejarat = szankcioLejaratSzamitasa(bejelento.duration, bejelento.customDate);
        await prisma.user.updateMany({
          where: { email: report.reporterEmail },
          data: {
            isBanned: true,
            bannedUntil: lejarat,
            banReason: bejelento.reason || null,
          },
        });
        reportUpdateData.bejelentoSzankcioIndoklas = bejelento.reason || null;
        reportUpdateData.bejelentoSzankcioLejarat = lejarat;
        reportUpdateData.bejelentoSzankcioAlkalmazva = true;
      }

      updatedReport = await prisma.report.update({
        where: { id },
        data: reportUpdateData,
      });
    } else {
      return NextResponse.json({ error: "Ismeretlen művelet." }, { status: 400 });
    }

    // A válasz összeállítása pontosan abban a formában, amit az admin felület
    // (JelentesAdat típus) vár, hogy a lista helyben frissíthető legyen.
    const chatLog = Array.isArray(updatedReport.chatLog)
      ? (updatedReport.chatLog as unknown as ChatUzenet[])
      : [];

    const eloelet = await prisma.report.findMany({
      where: { reporterEmail: updatedReport.reporterEmail },
      select: { statusz: true },
    });
    const bejelentoEloelet = eloelet.reduce(
      (acc, r) => {
        if (r.statusz === "megoldott") acc.helyes += 1;
        if (r.statusz === "elutasitott") acc.alaptalan += 1;
        return acc;
      },
      { helyes: 0, alaptalan: 0 }
    );

    const korabbiSzankciok = await prisma.report.findMany({
      where: { targetEmail: updatedReport.targetEmail, celpontSzankcioAlkalmazva: true },
      select: { celpontSzankcioIndoklas: true, elbiraltIdo: true },
      orderBy: { elbiraltIdo: "desc" },
    });

    return NextResponse.json({
      id: updatedReport.id,
      datum: datumFormazas(updatedReport.createdAt),
      bejelentoNev: updatedReport.reporterNev || updatedReport.reporterEmail,
      bejelentoEmail: updatedReport.reporterEmail,
      bejelentoEloelet,
      celpontNev: updatedReport.targetNev || updatedReport.targetEmail,
      celpontEmail: updatedReport.targetEmail,
      ok: updatedReport.okok.length > 0 ? updatedReport.okok.join(", ") : "Nincs megadva",
      statusz: updatedReport.statusz,
      chatLog: chatLog
        .filter((u) => u.felado !== "rendszer")
        .map((u) => ({
          felado:
            u.felado === "en"
              ? updatedReport.reporterNev || updatedReport.reporterEmail
              : updatedReport.targetNev || updatedReport.targetEmail,
          ido: idoFormazas(u.ido),
          szoveg: u.szoveg,
          isTarget: u.felado === "partner",
        })),
      celpontEloelet: {
        korabbiTiltasok: korabbiSzankciok.map((s) => ({
          datum: s.elbiraltIdo ? datumFormazas(s.elbiraltIdo) : "",
          ok: s.celpontSzankcioIndoklas || "Nincs megadva indoklás",
        })),
      },
    });
  } catch (error) {
    console.error("Hiba a jelentés elbírálásakor:", error);
    return NextResponse.json({ error: "Szerver hiba" }, { status: 500 });
  }
}
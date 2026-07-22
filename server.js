require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: ".env.local" });

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

// PRISMA ÉS ADAPTER BEÁLLÍTÁS
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

console.log("Adatbázis link állapota:", process.env.DATABASE_URL ? "✅ Sikeresen betöltve!" : "❌ NINCS MEGTALÁLVA!");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();
app.use(cors());

// ⚠️ CSAK FEJLESZTÉSRE / DEBUGRA! Élesben vedd ki vagy védd jelszóval,
// mert bárki lekérdezheti vele mások IP-alapú limitjét.
// Használat: GET /debug/limit/ip_123.45.67.89  vagy  /debug/limit/email_pelda@email.com
app.get("/debug/limit/:azonosito", async (req, res) => {
  try {
    const rekord = await prisma.napiLimit.findUnique({
      where: { azonosito: req.params.azonosito },
    });
    if (!rekord) {
      return res.json({ azonosito: req.params.azonosito, hasznalt: 0, limit: NAPI_LIMIT, datum: null, letezik: false });
    }
    const maiDatum = getMaiDatum();
    const aktualisHasznalt = rekord.datum === maiDatum ? rekord.hasznalt : 0;
    res.json({ ...rekord, maradek: Math.max(0, NAPI_LIMIT - aktualisHasznalt), limit: NAPI_LIMIT, letezik: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Az összes mai bejegyzés egyben, gyors áttekintéshez
app.get("/debug/limit", async (req, res) => {
  try {
    const maiDatum = getMaiDatum();
    const osszes = await prisma.napiLimit.findMany({ where: { datum: maiDatum } });
    res.json(osszes.map((r) => ({ ...r, maradek: Math.max(0, NAPI_LIMIT - r.hasznalt) })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

let varolista = [];

// NAPI PÁROSÍTÁSI LIMIT
const NAPI_LIMIT = 20;

// NAPI LIMIT NÖVELŐ FÜGGVÉNY
function getMaiDatum() {
  return new Date().toLocaleDateString("hu-HU", { timeZone: "Europe/Budapest" });
}

// Hátralévő idő (ms) a mai nap végéig (Európa/Budapest szerint), erre resetelődik a limit
function ujraindulasMsAMaiNapVegeig() {
  const most = new Date();
  const budapestiMost = new Date(most.toLocaleString("en-US", { timeZone: "Europe/Budapest" }));
  const ejfel = new Date(budapestiMost);
  ejfel.setHours(24, 0, 0, 0);
  return Math.max(0, ejfel.getTime() - budapestiMost.getTime());
}

// Eldönti, hogy egy IP-t érdemes-e limit-azonosítóként kezelni
// (a localhost / ismeretlen címeket kihagyjuk, hogy dev közben ne egy közös sorba írjunk)
function ervenyesIpAzonosito(ip) {
  if (!ip || ip === "ismeretlen_ip" || ip === "::1" || ip === "127.0.0.1") return null;
  return `ip_${ip}`;
}

// A limit azonosítója: elsődlegesen a bejelentkezett fiók e-mail címe (ez fiókhoz köti a limitet,
// és localhoston is működik), ha valamiért nincs e-mail, visszaesünk az IP-re.
function limitAzonosito(adatok, ip) {
  const email = typeof adatok?.email === "string" ? adatok.email.trim().toLowerCase() : null;
  if (email) return `email_${email}`;
  return ervenyesIpAzonosito(ip);
}

// Lekérdezi, hogy az adott azonosító ma hányszor párosított már
async function lekerdezMaiHasznalat(azonosito) {
  if (!azonosito) return 0;
  try {
    const bejegyzes = await prisma.napiLimit.findUnique({ where: { azonosito } });
    if (!bejegyzes) return 0;
    const maiDatum = getMaiDatum();
    if (bejegyzes.datum !== maiDatum) return 0; // új nap, a limit magától nullázódik
    return bejegyzes.hasznalt;
  } catch (error) {
    console.error("Hiba a limit lekérdezésekor:", error);
    return 0; // hiba esetén ne blokkoljuk feleslegesen a usert
  }
}

async function noveldLimitet(azonosito) {
  if (!azonosito) {
    console.warn("⚠️ Nincs limit-azonosító (se e-mail, se érvényes IP), a mentés kimarad.");
    return;
  }

  const maiDatum = getMaiDatum();

  try {
    const letezik = await prisma.napiLimit.findUnique({ where: { azonosito } });
    let friss;

    if (letezik) {
      if (letezik.datum === maiDatum) {
        friss = await prisma.napiLimit.update({
          where: { azonosito },
          data: { hasznalt: { increment: 1 } },
        });
      } else {
        friss = await prisma.napiLimit.update({
          where: { azonosito },
          data: { hasznalt: 1, datum: maiDatum },
        });
      }
    } else {
      friss = await prisma.napiLimit.create({
        data: { azonosito, hasznalt: 1, datum: maiDatum },
      });
    }

    console.log(`💾 Limit mentve: ${azonosito} → ${friss.hasznalt}/${NAPI_LIMIT} (${friss.datum})`);
  } catch (error) {
    console.error("Hiba a limit mentésekor:", error);
  }
}

function osszeilleszthetoke(a, b) {
  const nemOk =
    (a.keresettNem === "bárki" || a.keresettNem === b.nem) &&
    (b.keresettNem === "bárki" || b.keresettNem === a.nem);
  if (!nemOk) return false;

  const aKorOk = b.kor >= a.korMin && b.kor <= a.korMax;
  const bKorOk = a.kor >= b.korMin && a.kor <= b.korMax;
  if (!aKorOk || !bKorOk) return false;

  const aBarhol = !a.megyek || a.megyek.length === 0;
  const bBarhol = !b.megyek || b.megyek.length === 0;
  if (!aBarhol && !bBarhol) {
    const vanKozosMegye = a.megyek.some((m) => b.megyek.includes(m));
    if (!vanKozosMegye) return false;
  }

  const aVanHobbi = a.hobbik && a.hobbik.length > 0;
  const bVanHobbi = b.hobbik && b.hobbik.length > 0;
  if (aVanHobbi && bVanHobbi) {
    const kozosHobbik = a.hobbik.filter((h) => b.hobbik.includes(h));
    if (kozosHobbik.length < 1) return false;
  }

  return true;
}

function normalizal(adatok) {
  const kor = parseInt(adatok.kor, 10) || 18;
  let korMin = parseInt(adatok.korMin, 10);
  let korMax = parseInt(adatok.korMax, 10);
  if (isNaN(korMin)) korMin = 18;
  if (isNaN(korMax)) korMax = 100;
  if (korMin > korMax) [korMin, korMax] = [korMax, korMin];

  const megyek = Array.isArray(adatok.megyek)
    ? adatok.megyek.filter((m) => m && m !== "Egész ország")
    : [];

  const hobbik = Array.isArray(adatok.hobbik)
    ? adatok.hobbik.map((h) => h.trim().toLowerCase()).filter(Boolean)
    : [];

  return {
    nev: (adatok.nev || "Ismeretlen").trim(),
    kor,
    nem: adatok.nem || "férfi",
    keresettNem: adatok.keresettNem || "bárki",
    korMin,
    korMax,
    megyek,
    hobbik,
  };
}

io.on("connection", (socket) => {
  console.log(`🔌 Új felhasználó csatlakozott: ${socket.id}`);

  socket.on("regisztracio_parositasra", async (adatok) => {
    const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;

    // NAPI LIMIT ELLENŐRZÉSE, MIELŐTT BÁRMI MÁS TÖRTÉNNE
    const sajatLimitAzonosito = limitAzonosito(adatok, clientIp);
    const maiHasznalat = await lekerdezMaiHasznalat(sajatLimitAzonosito);
    console.log(`🔎 Limit-ellenőrzés: ${sajatLimitAzonosito || "(nincs érvényes azonosító)"} → ${maiHasznalat}/${NAPI_LIMIT}`);

    if (maiHasznalat >= NAPI_LIMIT) {
      console.log(`🚫 ${socket.id} elérte a napi limitet (${maiHasznalat}/${NAPI_LIMIT}).`);
      socket.emit("napi_limit_elerve", {
        limit: NAPI_LIMIT,
        hasznalt: maiHasznalat,
        ujraindulasMs: ujraindulasMsAMaiNapVegeig(),
      });
      return;
    }

    const ujUser = { 
      socketId: socket.id, 
      ip: clientIp, 
      limitAzonosito: sajatLimitAzonosito,
      ...normalizal(adatok) 
    };
    
    socket.sajatAdatok = ujUser;

    console.log(
      `📝 ${ujUser.nev} sorba állt. (kor:${ujUser.kor}, keres:${ujUser.keresettNem} ${ujUser.korMin}-${ujUser.korMax}, megyék:${ujUser.megyek.join("/") || "bárhol"}, hobbik:${ujUser.hobbik.join("/") || "nincs megadva"})`
    );

    const talalatIndex = varolista.findIndex((varo) =>
      osszeilleszthetoke(ujUser, varo)
    );

    if (talalatIndex !== -1) {
      const partner = varolista.splice(talalatIndex, 1)[0];
      const szobaNev = `szoba_${socket.id}_${partner.socketId}`;

      socket.join(szobaNev);
      const partnerSocket = io.sockets.sockets.get(partner.socketId);
      if (partnerSocket) {
        partnerSocket.join(szobaNev);
      }

      socket.aktualisSzoba = szobaNev;
      if (partnerSocket) partnerSocket.aktualisSzoba = szobaNev;

      noveldLimitet(ujUser.limitAzonosito);
      noveldLimitet(partner.limitAzonosito);

      const kozosHobbik = ujUser.hobbik.filter((h) => partner.hobbik.includes(h));

      socket.emit("parositas_sikeres", {
        szoba: szobaNev,
        partner: {
          becenev: partner.nev,
          kor: partner.kor,
          nem: partner.nem,
          hobbik: partner.hobbik,
        },
        kozosHobbik,
      });

      if (partnerSocket) {
        partnerSocket.emit("parositas_sikeres", {
          szoba: szobaNev,
          partner: {
            becenev: ujUser.nev,
            kor: ujUser.kor,
            nem: ujUser.nem,
            hobbik: ujUser.hobbik,
          },
          kozosHobbik,
        });
      }

      console.log(`✨ Párosítva: ${ujUser.nev} 🤝 ${partner.nev}`);
    } else {
      varolista = varolista.filter((u) => u.socketId !== socket.id);
      varolista.push(ujUser);
      socket.emit("statusz_frissites", "Várakozás megfelelő partnerre...");
    }
  });

  socket.on("chat_uzenet", (adat) => {
    if (!adat || !adat.szoba || !adat.szoveg) return;

    if (!socket.rooms.has(adat.szoba)) {
      console.log(`⚠️ ${socket.id} nem tagja a(z) ${adat.szoba} szobának, üzenet elutasítva.`);
      return;
    }

    socket.to(adat.szoba).emit("chat_uzenet_erkezett", {
      szoveg: adat.szoveg,
    });
  });

  socket.on("partner_eldobasa", () => {
    const szobaNev = socket.aktualisSzoba;
    if (szobaNev) {
      socket.to(szobaNev).emit("partner_tovabbnyomta");

      const masikSocketek = io.sockets.adapter.rooms.get(szobaNev);
      if (masikSocketek) {
        masikSocketek.forEach((sid) => {
          if (sid !== socket.id) {
            const masik = io.sockets.sockets.get(sid);
            if (masik) masik.aktualisSzoba = null;
          }
        });
      }

      socket.leave(szobaNev);
      socket.aktualisSzoba = null;
      console.log(`👋 ${socket.id} elhagyta a szobát: ${szobaNev}`);
    }
    varolista = varolista.filter((u) => u.socketId !== socket.id);
  });

  socket.on("disconnect", () => {
    console.log(`❌ Felhasználó lecsatlakozott: ${socket.id}`);
    varolista = varolista.filter((user) => user.socketId !== socket.id);

    if (socket.aktualisSzoba) {
      socket.to(socket.aktualisSzoba).emit("partner_tovabbnyomta");
    }
  });
});

const PORT = 5001;
server.listen(PORT, () => {
  console.log(`🚀 Randi-Backend fut a http://localhost:${PORT} címen`);
});
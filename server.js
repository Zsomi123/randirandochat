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

const NAPI_LIMIT = 20;

function getMaiDatum() {
  return new Date().toLocaleDateString("hu-HU", { timeZone: "Europe/Budapest" });
}

function ujraindulasMsAMaiNapVegeig() {
  const most = new Date();
  const budapestiMost = new Date(most.toLocaleString("en-US", { timeZone: "Europe/Budapest" }));
  const ejfel = new Date(budapestiMost);
  ejfel.setHours(24, 0, 0, 0);
  return Math.max(0, ejfel.getTime() - budapestiMost.getTime());
}

// Az x-forwarded-for fejléc néha több IP-t is tartalmazhat vesszővel elválasztva
// (proxy-k láncolata esetén) – nekünk mindig az első, azaz a kliens tényleges
// IP-je kell, ellenkező esetben a tiltás/limit megkerülhető lenne.
function nyersIpTisztitasa(ip) {
  if (!ip) return null;
  return String(ip).split(",")[0].trim();
}

function ervenyesIpAzonosito(nyersIp) {
  const ip = nyersIpTisztitasa(nyersIp);
  if (!ip || ip === "ismeretlen_ip") return null;
  return `ip_${ip}`;
}

// FONTOS: mostantól a limit és a tiltás ALAPJA KIZÁRÓLAG AZ IP CÍM.
// Ennek oka, hogy bejelentkezés most már kötelező, tehát az email cím
// mindig rendelkezésre áll, viszont ha valakit ki akarunk tiltani, azt
// nem szabad, hogy egy új Google-fiók regisztrálásával meg tudja kerülni –
// az IP-alapú azonosítás ezt akadályozza meg. Az email címet emellett
// külön mezőben eltároljuk minden rekordon (lásd noveldLimitet), hogy
// nyomon lehessen követni, melyik fiók használta az adott IP-t.
function sajatAzonosito(ip) {
  return ervenyesIpAzonosito(ip);
}

async function lekerdezMaiHasznalat(azonosito) {
  if (!azonosito) return 0;
  try {
    const bejegyzes = await prisma.napiLimit.findUnique({ where: { azonosito } });
    if (!bejegyzes) return 0;
    const maiDatum = getMaiDatum();
    if (bejegyzes.datum !== maiDatum) return 0;
    return bejegyzes.hasznalt;
  } catch (error) {
    console.error("Hiba a limit lekérdezésekor:", error);
    return 0;
  }
}

// --- 1. FÜGGVÉNY: LIMIT NÖVELÉSE (EGYETLEN, IP ALAPÚ REKORDON, UPSERT-TEL) ---
// Az email címet is elmentjük/frissítjük a rekordon (nem ez az azonosító kulcs,
// csak kiegészítő infó, hogy lássuk ki áll a tiltás mögött).
async function noveldLimitet(email, ip) {
  const maiDatum = getMaiDatum();
  const azonosito = sajatAzonosito(ip);

  if (!azonosito) return;

  try {
    const friss = await prisma.napiLimit.upsert({
      where: { azonosito },
      update: {
        hasznalt: {
          increment: 1,
        },
        email: email || undefined,
      },
      create: {
        azonosito,
        hasznalt: 1,
        datum: maiDatum,
        email: email || null,
      },
    });

    // Ha esetleg új nap van, de létezett a rekord, biztosítjuk a dátum frissítését és nullázását
    if (friss.datum !== maiDatum) {
      await prisma.napiLimit.update({
        where: { azonosito },
        data: { hasznalt: 1, datum: maiDatum, email: email || undefined },
      });
    }

    console.log(`💾 Limit mentve (IP alapján): ${azonosito} [${email || "nincs email"}] → ${friss.hasznalt}/${NAPI_LIMIT}`);
  } catch (error) {
    console.error("Hiba a limit mentésekor:", error);
  }
}

// --- 2. FÜGGVÉNY: LIMIT LEKÉRDEZÉSE (EGYETLEN, IP ALAPÚ REKORDRÓL) ---
async function getLimitHasznalat(ip) {
  const maiDatum = getMaiDatum();
  const azonosito = sajatAzonosito(ip);

  if (!azonosito) return 0;

  try {
    const rekord = await prisma.napiLimit.findUnique({ where: { azonosito } });
    if (rekord && rekord.datum === maiDatum) {
      return rekord.hasznalt;
    }
  } catch (error) {
    console.error("Hiba a limit lekérésekor:", error);
  }
  return 0;
}


function masikFelErtesitese(szobaNev, sajatSocketId) {
  const szobaTagok = io.sockets.adapter.rooms.get(szobaNev);
  if (!szobaTagok) return;

  szobaTagok.forEach((sid) => {
    if (sid === sajatSocketId) return;
    const masik = io.sockets.sockets.get(sid);
    if (!masik) return;

    masik.emit("partner_tovabbnyomta");
    masik.aktualisSzoba = null;
    masik.leave(szobaNev);
  });
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
    email: adatok.email || null,
    nev: (adatok.nev || "Ismeretlen").trim(),
    kor,
    nem: adatok.nem || "férfi",
    keresettNem: (adatok.keresettNem === "mindegy" ? "bárki" : adatok.keresettNem) || "bárki",
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

    // KÖTELEZŐ BEJELENTKEZÉS: vendég mód megszűnt, email nélkül nem
    // engedjük be a párosítási rendszerbe a felhasználót.
    const email = typeof adatok?.email === "string" ? adatok.email.trim().toLowerCase() : null;
    if (!email) {
      socket.emit("bejelentkezes_szukseges", {
        uzenet: "A partnerkereséshez be kell jelentkezned Google-fiókkal.",
      });
      console.log(`🚫 ${socket.id} bejelentkezés nélkül próbált párosítani – elutasítva.`);
      return;
    }

    const ujUser = {
      socketId: socket.id,
      ip: clientIp,
      ...normalizal(adatok),
      email,
    };

    // A limit és a tiltás mostantól kizárólag az IP cím alapján történik –
    // ha valakit kitiltunk, azt az IP-je alapján tesszük, így új Google-fiókkal
    // sem tud visszatérni ugyanarról a gépről/hálózatról.
    const JELENLEGI_HASZNALAT = await getLimitHasznalat(ujUser.ip);

    if (JELENLEGI_HASZNALAT >= NAPI_LIMIT) {
      const ujraindulasMs = ujraindulasMsAMaiNapVegeig();

      socket.emit("napi_limit_elerve", {
        limit: NAPI_LIMIT,
        hasznalt: JELENLEGI_HASZNALAT,
        ujraindulasMs,
        tipus: "fiokos",
      });
      console.log(`🚫 ${ujUser.nev} (${ujUser.email}) elszállt a limittel (${JELENLEGI_HASZNALAT}/${NAPI_LIMIT}).`);
      return;
    }

    if (socket.disconnected) {
      return;
    }

    varolista = varolista.filter(u => !(u.ip === ujUser.ip && u.email === ujUser.email));

    socket.sajatAdatok = ujUser;

    console.log(
      `📝 ${ujUser.nev} (${ujUser.email}) sorba állt. (kor:${ujUser.kor}, keres:${ujUser.keresettNem} ${ujUser.korMin}-${ujUser.korMax})`
    );

    let partner = null;
    let partnerSocket = null;
    let talalatIndex = -1;

    for (let i = 0; i < varolista.length; i++) {
      const vizsgaltPartner = varolista[i];

      if (osszeilleszthetoke(ujUser, vizsgaltPartner)) {
        const tempSocket = io.sockets.sockets.get(vizsgaltPartner.socketId);

        if (tempSocket && tempSocket.connected && !tempSocket.aktualisSzoba) {
          talalatIndex = i;
          partner = vizsgaltPartner;
          partnerSocket = tempSocket;
          break;
        } else {
          varolista.splice(i, 1);
          i--;
        }
      }
    }

    if (partner && partnerSocket) {
      varolista.splice(talalatIndex, 1);

      const szobaNev = `szoba_${socket.id}_${partner.socketId}`;

      socket.join(szobaNev);
      partnerSocket.join(szobaNev);

      socket.aktualisSzoba = szobaNev;
      partnerSocket.aktualisSzoba = szobaNev;

      noveldLimitet(ujUser.email, ujUser.ip);
      noveldLimitet(partner.email, partner.ip);

      const kozosHobbik = ujUser.hobbik.filter((h) => partner.hobbik.includes(h));

      socket.emit("parositas_sikeres", {
        szoba: szobaNev,
        partner: { becenev: partner.nev, kor: partner.kor, nem: partner.nem, hobbik: partner.hobbik },
        kozosHobbik,
      });

      partnerSocket.emit("parositas_sikeres", {
        szoba: szobaNev,
        partner: { becenev: ujUser.nev, kor: ujUser.kor, nem: ujUser.nem, hobbik: ujUser.hobbik },
        kozosHobbik,
      });

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
      masikFelErtesitese(szobaNev, socket.id);

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
      masikFelErtesitese(socket.aktualisSzoba, socket.id);
      socket.aktualisSzoba = null;
    }
  });
});

const PORT = 5001;
server.listen(PORT, () => {
  console.log(`🚀 Randi-Backend fut a http://localhost:${PORT} címen`);
});
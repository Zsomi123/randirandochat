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

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

let varolista = [];

// NAPI LIMIT NÖVELŐ FÜGGVÉNY
function getMaiDatum() {
  return new Date().toLocaleDateString("hu-HU", { timeZone: "Europe/Budapest" });
}

async function noveldLimitet(email, ip) {
  const maiDatum = getMaiDatum();
  const azonositok = [];

  if (email) azonositok.push(`email_${email}`);
  if (ip && ip !== "ismeretlen_ip" && ip !== "::1" && ip !== "127.0.0.1") {
    azonositok.push(`ip_${ip}`);
  }

  for (const azonosito of azonositok) {
    try {
      const letezik = await prisma.napiLimit.findUnique({ where: { azonosito } });

      if (letezik) {
        if (letezik.datum === maiDatum) {
          await prisma.napiLimit.update({
            where: { azonosito },
            data: { hasznalt: { increment: 1 } },
          });
        } else {
          await prisma.napiLimit.update({
            where: { azonosito },
            data: { hasznalt: 1, datum: maiDatum },
          });
        }
      } else {
        await prisma.napiLimit.create({
          data: { azonosito, hasznalt: 1, datum: maiDatum },
        });
      }
    } catch (error) {
      console.error("Hiba a limit mentésekor:", error);
    }
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

  socket.on("regisztracio_parositasra", (adatok) => {
    const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;

    const ujUser = { 
      socketId: socket.id, 
      ip: clientIp, 
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

      noveldLimitet(null, ujUser.ip);
      noveldLimitet(null, partner.ip);

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
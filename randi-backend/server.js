const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// A várólistán lévő felhasználók: { socketId, nev, kor, nem, keresettNem, korMin, korMax, megyek, hobbik }
let varolista = [];

/**
 * Megmondja, hogy két felhasználó összeilleszthető-e egymással.
 * - Nem egyezés: a "bárki" mindig jó, egyébként a keresett nemnek egyeznie kell.
 * - Korhatár: mindkét fél korának bele kell esnie a másik által megadott [korMin, korMax] tartományba.
 * - Megye: ha valamelyik fél "Egész ország"-ot (üres listát) választott, az mindenkivel jó.
 *          Egyébként legalább egy közös megyének kell lennie a két lista között.
 * - Hobbi: ha valamelyik félnek nincs hobbija megadva, nem szűrünk erre.
 *          Ha mindkettőnek van, legalább 1 közös hobbinak/érdeklődési körnek kell lennie.
 */
function osszeilleszthetoke(a, b) {
  // --- Nem / keresett nem ---
  const nemOk =
    (a.keresettNem === "bárki" || a.keresettNem === b.nem) &&
    (b.keresettNem === "bárki" || b.keresettNem === a.nem);
  if (!nemOk) return false;

  // --- Korhatár (kölcsönösen bele kell esni egymás tartományába) ---
  const aKorOk = b.kor >= a.korMin && b.kor <= a.korMax;
  const bKorOk = a.kor >= b.korMin && a.kor <= b.korMax;
  if (!aKorOk || !bKorOk) return false;

  // --- Megye / zóna ---
  const aBarhol = !a.megyek || a.megyek.length === 0;
  const bBarhol = !b.megyek || b.megyek.length === 0;
  if (!aBarhol && !bBarhol) {
    const vanKozosMegye = a.megyek.some((m) => b.megyek.includes(m));
    if (!vanKozosMegye) return false;
  }

  // --- Hobbik / érdeklődési körök ---
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
    const ujUser = { socketId: socket.id, ...normalizal(adatok) };
    socket.sajatAdatok = ujUser;

    console.log(
      `📝 ${ujUser.nev} sorba állt. (kor:${ujUser.kor}, keres:${ujUser.keresettNem} ${ujUser.korMin}-${ujUser.korMax}, megyék:${ujUser.megyek.join("/") || "bárhol"}, hobbik:${ujUser.hobbik.join("/") || "nincs megadva"})`
    );

    // Megkeressük az ELSŐ olyan várakozó felhasználót, aki illik hozzánk
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
      // Nincs megfelelő partner a várólistán -> beállunk sorba
      varolista = varolista.filter((u) => u.socketId !== socket.id);
      varolista.push(ujUser);
      socket.emit("statusz_frissites", "Várakozás megfelelő partnerre...");
    }
  });

  // ESEMÉNY: Üzenet érkezése a frontendről
  socket.on("chat_uzenet", (adat) => {
    if (!adat || !adat.szoba || !adat.szoveg) return;

    // Csak akkor küldjük tovább, ha a küldő valóban tagja a szobának
    if (!socket.rooms.has(adat.szoba)) {
      console.log(`⚠️ ${socket.id} nem tagja a(z) ${adat.szoba} szobának, üzenet elutasítva.`);
      return;
    }

    socket.to(adat.szoba).emit("chat_uzenet_erkezett", {
      szoveg: adat.szoveg,
    });
  });

  // ESEMÉNY: Következő partner kérése (Kapcsolat megszakítása)
  socket.on("partner_eldobasa", () => {
    const szobaNev = socket.aktualisSzoba;
    if (szobaNev) {
      socket.to(szobaNev).emit("partner_tovabbnyomta");

      // A szobában lévő másik fél aktuális szoba-adatát is töröljük
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
    // Kivesszük a várólistáról is, ha esetleg ott lenne
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
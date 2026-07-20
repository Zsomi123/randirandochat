const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors()); // Engedélyezzük a Next.js frontend csatlakozását

// Létrehozzuk a HTTP szervert az Express-ből
const server = http.createServer(app);

// Rákötjük a Socket.io-t a szerverre, engedélyezve a frontend portját
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // A te Next.js appod címe
    methods: ["GET", "POST"]
  }
});

// A VÁRÓLISTA (Ideiglenes memória a párosításig, később ezt váltja fel a Redis)
let varolista = [];

// A Socket.io figyelni kezdi a bejövő kapcsolatokat
io.on("connection", (socket) => {
  console.log(`🔌 Új felhasználó csatlakozott: ${socket.id}`);

  // Esemény: Amikor a frontend küld egy 'regisztracio_parositasra' jelet az adatokkal
  socket.on("regisztracio_parositasra", (adatok) => {
    const ujUser = {
      socketId: socket.id,
      nev: adatok.nev,
      kor: adatok.kor,
      nem: adatok.nem,
      keresettNem: adatok.keresettNem,
      megyek: adatok.megyek // Ez egy lista lesz, amit a térképen jelölt ki
    };

    console.log(`📝 ${ujUser.nev} sorba állt a párosításhoz.`);

    // MEGY A MOCK PÁROSÍTÓ LOGIKA: Megnézzük, van-e már valaki a listán
    if (varolista.length > 0) {
      // Egyszerűség kedvéért kikapjuk az első embert a várólistából (FIFO elv)
      const partner = varolista.shift();

      // Létrehozunk egy egyedi szoba nevet a két socket ID-ból
      const szobaNev = `szoba_${socket.id}_${partner.socketId}`;

      // Mindkét felhasználót berakjuk ebbe a virtuális szobába
      socket.join(szobaNev);
      const partnerSocket = io.sockets.sockets.get(partner.socketId);
      if (partnerSocket) {
        partnerSocket.join(szobaNev);
      }

      // Értesítjük MINDKÉT felet a sikeres párosításról és átadjuk a másik adatait
      io.to(szobaNev).emit("parositas_sikeres", {
        szoba: szobaNev,
        uzenet: "Rendszer: Sikeres párosítás!"
      });

      console.log(`✨ Párosítva: ${ujUser.nev} 🤝 ${partner.nev} a ${szobaNev} szobában.`);
    } else {
      // Ha nincs senki, berakjuk a jelenlegi usert a várólistára
      varolista.push(ujUser);
      socket.emit("statusz_frissites", "Várakozás partnerre...");
    }
  });

  // Esemény: Amikor valaki lecsatlakozik (bezárja a böngészőt vagy kilép)
  socket.on("disconnect", () => {
    console.log(`❌ Felhasználó lecsatlakozott: ${socket.id}`);
    // Töröljük a várólistából, ha még benne volt
    varolista = varolista.filter(user => user.socketId !== socket.id);
  });
});

// A szerver az 5000-es porton fog figyelni
const PORT = 5001;
server.listen(PORT, () => {
  console.log(`🚀 Randi-Backend fut a http://localhost:${PORT} címen`);
});
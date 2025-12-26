// ===================== ENV =====================
require("dotenv").config();
const path = require("path");

// ===================== MODULE =====================
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const session = require("express-session");
const cors = require("cors");

// ===================== APP =====================
const app = express();
const server = http.createServer(app);

// ===================== SOCKET.IO =====================
const io = new Server(server, {
  cors: {
    origin: "https://bier-scoreboard.vercel.app",
    methods: ["GET", "POST"]
  }
});

// ===================== SESSION =====================
app.use(session({
  name: "service.sid",
  secret: process.env.SERVICE_SECRET, // in .env festlegen
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: true,        // HTTPS notwendig
    maxAge: 1000 * 60 * 60 * 8 // 8 Stunden
  }
}));

// ===================== MIDDLEWARE =====================
app.use(express.json());

// CORS für API
app.use(cors({
  origin: "https://bier-scoreboard.vercel.app",
  methods: ["GET", "POST"]
}));

// ===================== LOGIN =====================
app.get("/service", (req, res) => {
  if (req.session.loggedIn) {
    // Schon eingeloggt → direkt zum Service-Menü
    return res.redirect("/service/panel");
  }
  res.sendFile(path.join(__dirname, "../public/service/index.html"));
});

// Login prüfen
// Login prüfen (für index.html)
app.post("/service", (req, res) => {
  const { password } = req.body;
  if (password === process.env.SERVICE_PASS) {
    req.session.loggedIn = true;
    return res.json({ ok: true });
  } else {
    return res.status(401).json({ error: "Falsches Passwort" });
  }
});


// Middleware für Service-Schutz
function requireLogin(req, res, next) {
  if (req.session.loggedIn) return next();
  res.redirect("/service");
}

// Service-Menü nur für eingeloggte User
app.get("/service/panel", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/service/panel.html"));
});

// Statische Dateien für Service-Menü (CSS, JS, Bilder)
app.use("/service/assets", requireLogin, express.static(path.join(__dirname, "../public/service")));

// ===================== MONGODB =====================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB verbunden"))
  .catch(err => console.error("❌ MongoDB Fehler", err));

// ===================== TEAM SCHEMA =====================
const TeamSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  points: { type: Number, default: 0 },
  drinks: {
    Bier: { type: Number, default: 0 },
    Radler: { type: Number, default: 0 },
    Weizen: { type: Number, default: 0 },
    Colaweizen: { type: Number, default: 0 },
    CocktailLongdrink: { type: Number, default: 0 },
    Shot: { type: Number, default: 0 },
    Wein: { type: Number, default: 0 },
    Sekt: { type: Number, default: 0 },
    WeinFlasche: { type: Number, default: 0 },
    SektFlasche: { type: Number, default: 0 }
  }
});

const Team = mongoose.model("Team", TeamSchema);

// ===================== DRINK MAP =====================
const DRINK_FIELD_MAP = {
  "Bier": "Bier",
  "Radler": "Radler",
  "Weizen": "Weizen",
  "Colaweizen": "Colaweizen",
  "Cocktail-Longdrink": "CocktailLongdrink",
  "Shot": "Shot",
  "Wein": "Wein",
  "Sekt": "Sekt",
  "Wein-Flasche": "WeinFlasche",
  "Sekt-Flasche": "SektFlasche"
};

// ===================== API =====================
app.get("/api/teams", async (_, res) => {
  const teams = await Team.find().sort({ points: -1 });
  res.json(teams);
});

app.post("/api/addTeam", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name fehlt" });

  await Team.create({ name });

  const teams = await Team.find().sort({ points: -1 });
  io.emit("updateScores", teams);

  res.json({ ok: true });
});

// RESET
app.post("/api/admin/reset", async (req, res) => {
  const { password } = req.body;

  if (password !== process.env.ADMIN_PASS) {
    return res.status(401).json({ error: "Falsches Passwort" });
  }

  await Team.deleteMany({});
  io.emit("updateScores", []);

  res.json({ ok: true });
});

// ===================== SOCKET.IO EVENTS =====================
io.on("connection", async socket => {
  console.log("🔌 SOCKET CONNECTED", socket.id);

  const teams = await Team.find().sort({ points: -1 });
  socket.emit("updateScores", teams);

  socket.onAny((event, data) => {
    console.log("📡 SOCKET EVENT:", event, JSON.stringify(data));
  });

  socket.on("serviceOrder", async payload => {
    const { team, total, items } = payload;
    const inc = { points: total };
    for (const [label, qty] of Object.entries(items || {})) {
      const field = DRINK_FIELD_MAP[label];
      if (field) inc[`drinks.${field}`] = qty;
    }

    await Team.updateOne({ name: team }, { $inc: inc });

    const teams = await Team.find().sort({ points: -1 });
    io.emit("updateScores", teams);

    io.emit("centerSpot", { team, total, items });
  });

  socket.on("serviceStorno", async payload => {
    const { team, total, items } = payload;
    const inc = { points: total };
    for (const [label, qty] of Object.entries(items || {})) {
      const field = DRINK_FIELD_MAP[label];
      if (field) inc[`drinks.${field}`] = qty;
    }

    await Team.updateOne({ name: team }, { $inc: inc });

    const teams = await Team.find().sort({ points: -1 });
    io.emit("updateScores", teams);
  });
});

// ===================== TEAM DELETE =====================
app.post("/api/deleteTeam", async (req, res) => {
  const { name, password } = req.body;

  if (password !== process.env.ADMIN_PASS) return res.status(403).json({ error: "Falsches Passwort" });
  if (!name) return res.status(400).json({ error: "Kein Team angegeben" });

  await Team.deleteOne({ name });
  const teams = await Team.find().sort({ points: -1 });
  io.emit("updateScores", teams);

  res.json({ ok: true });
});

// ===================== TEAM RENAME =====================
app.post("/api/renameTeam", async (req, res) => {
  const { oldName, newName } = req.body;
  if (!oldName || !newName) return res.status(400).json({ error: "Ungültige Daten" });

  const exists = await Team.findOne({ name: newName });
  if (exists) return res.status(409).json({ error: "Team existiert bereits" });

  const result = await Team.updateOne(
    { name: oldName },
    { $set: { name: newName } }
  );

  if (result.matchedCount === 0) return res.status(404).json({ error: "Team nicht gefunden" });

  const teams = await Team.find().sort({ points: -1 });
  io.emit("updateScores", teams);

  res.json({ ok: true });
});

// ===================== SERVER START =====================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server läuft auf http://localhost:${PORT}`));

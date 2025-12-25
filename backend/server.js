// ===================== ENV =====================
require("dotenv").config();

// ===================== MODULE =====================
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

// ===================== APP =====================
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

app.get("/service", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "service", "index.html"))
);

// ===================== MONGODB =====================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB verbunden"))
  .catch(err => console.error("❌ MongoDB Fehler", err));

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

// ===================== RESET =====================
app.post("/api/admin/reset", async (req, res) => {
  const { password } = req.body;

  if (password !== process.env.ADMIN_PASS) {
    return res.status(401).json({ error: "Falsches Passwort" });
  }

  await Team.deleteMany({}); // 💣 ALLES löschen

  io.emit("updateScores", []);

  res.json({ ok: true });
});

// ===================== SOCKET =====================
io.on("connection", socket => {
  console.log("🔌 SOCKET CONNECTED", socket.id);

  socket.onAny((event, data) => {
    console.log("📡 SOCKET EVENT:", event, JSON.stringify(data));
  });

  // ✅ BESTELLUNG
  socket.on("serviceOrder", async payload => {
    console.log("🛒 SERVICE ORDER", payload);

    const { team, total, items } = payload;
    const inc = { points: total };

    for (const [label, qty] of Object.entries(items || {})) {
      const field = DRINK_FIELD_MAP[label];
      if (field) inc[`drinks.${field}`] = qty;
    }

    await Team.updateOne({ name: team }, { $inc: inc });

    const teams = await Team.find().sort({ points: -1 });

    io.emit("updateScores", teams);

    // 🔥 CENTER SPOT – NUR HIER
    io.emit("centerSpot", { team, total, items });
  });

  // ❌ STORNO (OHNE CENTER SPOT)
  socket.on("serviceStorno", async payload => {
    console.log("↩️ SERVICE STORNO", payload);

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


// ===================== TEAM LÖSCHEN =====================
app.post("/api/deleteTeam", async (req, res) => {
  const { name, password } = req.body;

  if (password !== process.env.ADMIN_PASS) {
    return res.status(403).json({ error: "Falsches Passwort" });
  }

  if (!name) {
    return res.status(400).json({ error: "Kein Team angegeben" });
  }

  await Team.deleteOne({ name });

  const teams = await Team.find().sort({ points: -1 });
  io.emit("updateScores", teams);

  res.json({ ok: true });
});


// ===================== TEAM UMBENENNEN =====================
app.post("/api/renameTeam", async (req, res) => {
  const { oldName, newName } = req.body;

  if (!oldName || !newName) {
    return res.status(400).json({ error: "Ungültige Daten" });
  }

  // Prüfen ob neuer Name schon existiert
  const exists = await Team.findOne({ name: newName });
  if (exists) {
    return res.status(409).json({ error: "Team existiert bereits" });
  }

  // Umbenennen
  const result = await Team.updateOne(
    { name: oldName },
    { $set: { name: newName } }
  );

  // Falls kein Team gefunden wurde
  if (result.matchedCount === 0) {
    return res.status(404).json({ error: "Team nicht gefunden" });
  }

  // Neue Teamliste senden
  const teams = await Team.find().sort({ points: -1 });
  io.emit("updateScores", teams);

  res.json({ ok: true });
});



// ===================== START =====================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("🚀 Server läuft auf http://localhost:" + PORT);
});
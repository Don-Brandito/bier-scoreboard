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

// ===================== MIDDLEWARE =====================
app.use(express.json());

// CORS für Frontend
app.use(cors({
  origin: "https://bier-scoreboard.vercel.app",
  credentials: true
}));

// OPTIONS Preflight
app.options("*", cors({
  origin: "https://bier-scoreboard.vercel.app",
  credentials: true
}));

// Session Middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    maxAge: 1000 * 60 * 60 * 8
  }
}));

// ===================== SOCKET.IO =====================
const io = new Server(server, {
  cors: { origin: "https://bier-scoreboard.vercel.app", methods: ["GET","POST"], credentials: true }
});

// ===================== LOGIN =====================
app.get("/service", (req, res) => {
  if (req.session.loggedIn) {
    res.sendFile(path.join(__dirname, "service/panel.html"));
  } else {
    res.sendFile(path.join(__dirname, "service/index.html"));
  }
});

app.post("/service/login", (req, res) => {
  const { password } = req.body;

  if (password === process.env.SERVICE_PASS) {
    req.session.loggedIn = true;
    req.session.save(err => {
      if (err) console.error("Session Save Fehler", err);
      return res.json({ ok: true });
    });
  } else {
    return res.status(401).json({ error: "Falsches Passwort" });
  }
});

app.post("/service/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// Middleware zum Schutz
function requireLogin(req, res, next) {
  if (req.session.loggedIn) return next();
  res.redirect("/service");
}

// Panel geschützt
app.get("/service/panel", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "service/panel.html"));
});

// Assets geschützt
app.use("/service/assets", requireLogin, express.static(path.join(__dirname, "service")));

// ===================== MONGODB =====================
mongoose.connect(process.env.MONGO_URI)
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

app.post("/api/admin/reset", async (req, res) => {
  const { password } = req.body;
  if (password !== process.env.ADMIN_PASS) return res.status(401).json({ error: "Falsches Passwort" });

  await Team.deleteMany({});
  io.emit("updateScores", []);
  res.json({ ok: true });
});

// ===================== SOCKET.IO EVENTS =====================
io.on("connection", async socket => {
  console.log("🔌 SOCKET CONNECTED", socket.id);
  const teams = await Team.find().sort({ points: -1 });
  socket.emit("updateScores", teams);

  socket.onAny((event, data) => console.log("📡 SOCKET EVENT:", event, data));

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

// ===================== SERVER START =====================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server läuft auf http://localhost:${PORT}`));

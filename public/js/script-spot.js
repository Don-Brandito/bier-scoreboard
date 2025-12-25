/* global confetti */

/* =====================================================
   CONFIG
===================================================== */
const SPOT_VISIBLE_MS = 6000;
const POINT_COUNTUP_MS = 4000;

const socket = window.socket;

socket.on("centerSpot", data => {
  console.log("🎯 CENTER SPOT RECEIVED", data);
  showCenterSpot(data);
});




/* =====================================================
   ICON MAPS
===================================================== */
const medalIcons = {
  1: "images/1-Platz.svg",
  2: "images/2-Platz.svg",
  3: "images/3-Platz.svg"
};

const DRINK_DISPLAY = {
  Bier:             { icon: "images/Bier.svg", label: "Bier" },
  Radler:           { icon: "images/Radler.svg", label: "Radler" },
  Weizen:           { icon: "images/Weizen.svg", label: "Weizen" },
  Colaweizen:       { icon: "images/Colaweizen.svg", label: "Colaweizen" },

  CocktailLongdrink:{ icon: "images/Cocktail-Longdrink.svg", label: "Cocktail" },

  Shot:             { icon: "images/Shot.svg", label: "Shot" },
  Wein:             { icon: "images/Wein.svg", label: "Wein" },
  Sekt:             { icon: "images/Sekt.svg", label: "Sekt" },

  WeinFlasche:      { icon: "images/Flasche-Wein.svg", label: "Flasche Wein" },
  SektFlasche:      { icon: "images/Flasche-Sekt.svg", label: "Flasche Sekt" }
};

const SERVICE_TO_DB = {
  Bier: "Bier",
  Radler: "Radler",
  Weizen: "Weizen",
  Colaweizen: "Colaweizen",

  "Cocktail-Longdrink": "CocktailLongdrink",
  CocktailLongdrink: "CocktailLongdrink",

  Shot: "Shot",
  Wein: "Wein",
  Sekt: "Sekt",

  // 🍾 Wein-Flasche (ALLE Varianten)
  "Flasche-Wein": "WeinFlasche",
  "Wein-Flasche": "WeinFlasche",
  WeinFlasche: "WeinFlasche",

  // 🍾 Sekt-Flasche (ALLE Varianten)
  "Flasche-Sekt": "SektFlasche",
  "Sekt-Flasche": "SektFlasche",
  SektFlasche: "SektFlasche"
};




/* =====================================================
   DOM REFS
===================================================== */
let centerSpot,
    spotCard,
    spotName,
    spotPlatz,
    spotPoints,
    spotDrinks,
    orderItemsEl,
    orderPointsValueEl;

let hideTimer = null;

/* =====================================================
   INIT
===================================================== */
function initCenterSpot() {
  centerSpot = document.getElementById("centerSpot");
  spotCard = document.getElementById("spotCard");
  spotName = document.getElementById("spot-name");
  spotPlatz = document.getElementById("spot-platz");
  spotPoints = document.getElementById("spot-points");
  spotDrinks = document.getElementById("spot-total-drinks");
  orderItemsEl = document.getElementById("orderItems");
  orderPointsValueEl = document.getElementById("orderPointsValue");

  centerSpot.classList.remove("show");
}

/* =====================================================
   MAIN ENTRY
===================================================== */
function showCenterSpot({ team, total, items }) {
  if (!window.TEAMS || !centerSpot) {
    console.warn("❌ CenterSpot noch nicht initialisiert");
    return;
  }

  if (typeof stopMarquee === "function") {
  stopMarquee();
  }


  // Teamdaten
  const teamData = TEAMS.find(t => t.name === team);
  if (!teamData) return;

  // Name
  spotName.textContent = teamData.name;

  // Platz
  if (teamData.platz <= 3 && medalIcons[teamData.platz]) {
    spotPlatz.innerHTML = `<img class="platz-icon" src="${medalIcons[teamData.platz]}">`;
  } else {
    spotPlatz.textContent = teamData.platz + ".";
  }

  // Drinks
  renderDrinks(teamData.drinks);

  // Punkte
  const from = teamData.punkte - total;
  const to = teamData.punkte;
  spotPoints.innerHTML = `${from} <small>PKT</small>`;
  animatePoints(from, to);

  // Bestellung
  renderOrder(items);
  orderPointsValueEl.textContent = total;

  // Anzeigen
  centerSpot.classList.add("show");
  launchConfetti();

  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(hideCenterSpot, SPOT_VISIBLE_MS);
}

function hideCenterSpot() {
  if (!centerSpot) return;

  centerSpot.classList.remove("show");

  // Marquee wieder starten
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      startMarqueeIfNeeded();
    });
  });
}


/* =====================================================
   RENDER HELPERS
===================================================== */
function renderDrinks(drinks = {}) {
  spotDrinks.innerHTML = "";
  const nodes = [];

  for (const [key, count] of Object.entries(drinks)) {
    if (!count) continue;

    const d = DRINK_DISPLAY[key];
    if (!d) continue;

    nodes.push(`
      <span class="drink-item">
        <img src="${d.icon}">
        <span>${count}</span>
      </span>
    `);
  }

  spotDrinks.innerHTML = nodes.join('<span class="mid-dot">·</span>');
}

function renderOrder(order) {
  orderItemsEl.innerHTML = "";

  const keys = Object.keys(order || {});
  if (!keys.length) {
    orderItemsEl.innerHTML = `<div class="order-item">Keine Bestellung</div>`;
    return;
  }

  keys.forEach(name => {
    const cnt = order[name];
    const dbKey = SERVICE_TO_DB[name];
    const d = DRINK_DISPLAY[dbKey];
    if (!d) {
    console.warn("❌ Kein DRINK_DISPLAY für", name, "→", dbKey);
    }

    const icon = d ? `<img src="${d.icon}">` : "";


    const el = document.createElement("div");
    el.className = "order-item";
    el.innerHTML = `
      <div class="order-icon">${icon}</div>
        <div class="delta-count">+<span>${cnt}</span></div>
      </div>
    `;
    orderItemsEl.appendChild(el);
  });
}

/* =====================================================
   POINT ANIMATION
===================================================== */
function animatePoints(from, to) {
  const start = performance.now();

  function frame(now) {
    const t = Math.min((now - start) / POINT_COUNTUP_MS, 1);
    const value = Math.round(from + (to - from) * t);
    spotPoints.innerHTML = `${value} <small>PKT</small>`;

    if (t < 1) requestAnimationFrame(frame);
    else impactBlink();
  }

  requestAnimationFrame(frame);
}

function impactBlink() {
  spotPoints.classList.remove("point-impact");
  void spotPoints.offsetWidth;
  spotPoints.classList.add("point-impact");
}

/* =====================================================
   CONFETTI
===================================================== */
function launchConfetti() {
  const rect = spotCard.getBoundingClientRect();
  const canvas = document.getElementById("confettiCanvas");
  if (!canvas) return;

  const conf = confetti.create(canvas, { resize: true });

  conf({
    particleCount: 500,
    spread: 90,
    startVelocity: 65,
    gravity: 0.95,
    origin: {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight
    },
    colors: ["#ff0000", "#8b0000", "#000000"]
  });
}


document.addEventListener("DOMContentLoaded", () => {
  initCenterSpot();
});

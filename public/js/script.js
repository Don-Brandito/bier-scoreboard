// --- TEST-DATEN (wird durch client.js überschrieben wenn vorhanden) ---
//let TEAMS = [
//  { platz:1, name:"Die Feuerklingen von Avalor", punkte:32, drinks:{ Bier:3, Radler:2, Weizen:1 }},
//  { platz:2, name:"Team Feuerhex", punkte:21, drinks:{ Bier:5, Weizen:1 }},
//  { platz:3, name:"Team Wilder Wald", punkte:18, drinks:{ "Cocktail-Longdrink":2, Bier:1 }},
//  { platz:4, name:"Team Frostklaue", punkte:16, drinks:{ Wein:2, Bier:2 }},
//  { platz:5, name:"Team Nebelwölfe", punkte:15, drinks:{ Radler:3 }},
//  { platz:6, name:"Team Schattenrufer", punkte:14, drinks:{ Shot:4 }},
//  { platz:7, name:"Team Donnerfaust", punkte:13, drinks:{ Sekt:2 }},
//  { platz:8, name:"Team Goldhirsche", punkte:12, drinks:{ Weizen:2 }},
//  { platz:9, name:"Team Eulenblick", punkte:11, drinks:{ Radler:1, Bier:2 }},
//  { platz:10, name:"Team Sturmkrähen", punkte:10, drinks:{ "Cocktail-Longdrink":1 }}
//];


const ICON_MAP = {
  Bier: "bier.svg",
  Radler: "Radler.svg",
  Weizen: "Weizen.svg",
  Colaweizen: "Colaweizen.svg",
  CocktailLongdrink: "Cocktail-Longdrink.svg",
  Shot: "Shot.svg",
  Wein: "Wein.svg",
  Sekt: "Sekt.svg",
  WeinFlasche: "Flasche-Wein.svg",
  SektFlasche: "Flasche-Sekt.svg"
};


// Getränkepunkte
const GETRAENKE_PUNKTE = [
  { icon: "images/bier.svg", points: 3, alt: "Bier" },
  { icon: "images/Radler.svg", points: 2, alt: "Radler" },
  { icon: "images/Weizen.svg", points: 3, alt: "Weizen" },
  { icon: "images/Colaweizen.svg", points: 2, alt: "ColaWeizen" },
  { icon: "images/Cocktail-Longdrink.svg", points: 5, alt: "Cocktail-Longdrink" },
  { icon: "images/Shot.svg", points: 1, alt: "Shot" },
  { icon: "images/Flasche-Wein.svg", points: 8, alt: "Flasche-Wein" },
  { icon: "images/Wein.svg", points: 2, alt: "Wein" },
  { icon: "images/Flasche-Sekt.svg", points: 8, alt: "Flasche-Sekt" },
  { icon: "images/Sekt.svg", points: 2, alt: "Sekt" },
];


// helper
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function $id(id){ return document.getElementById(id); }
document.getElementById('header').offsetHeight

// -----------------------------------------------------
// Punkteanzeige
// -----------------------------------------------------
function initPunkteMarquee() {
  const wrap = document.getElementById("punktevergabe-inner");
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="punkte-marquee">
      <div class="punkte-marquee-track"></div>
    </div>
  `;

  const track = wrap.querySelector(".punkte-marquee-track");

  const items = GETRAENKE_PUNKTE.map(item => `
    <span class="punkte-item">
      <img class="punkte-icon" src="${item.icon}" alt="${item.alt}">
    <span class="punkte-text">${item.alt} | </span>
  <span class="punkte-value">${item.points}</span>
  <span class="punkte-unit">PKT</span>
</span>
    </span>
  `).join(`<span class="punkte-separator">•</span>`);

  // doppeln für sauberen Endloslauf
  track.innerHTML =
    items +
    `<span class="punkte-separator">•</span>` +
    items;
}

document.addEventListener("DOMContentLoaded", initPunkteMarquee);


// -----------------------------------------------------
// row builder (UNVERÄNDERT)
// -----------------------------------------------------
function createRow(team, isTop=false){
  const row = document.createElement('div');
  row.className = isTop ? 'row top' : 'row small';
  row.dataset.position = team.platz;

  const left = document.createElement('div');
  left.className = 'left';

  let platzEl;
  if(team.platz <= 3){
    platzEl = document.createElement('img');
    platzEl.className = 'platz-icon';
    platzEl.src = team.platz === 1 ? 'images/1-Platz.svg' :
                 team.platz === 2 ? 'images/2-Platz.svg' : 'images/3-Platz.svg';
    platzEl.alt = 'Platz ' + team.platz;
  } else {
    platzEl = document.createElement('div');
    platzEl.className = 'platz-text';
    platzEl.textContent = team.platz + '.';
  }

  const nameWrap = document.createElement('div');
  nameWrap.className = 'name-wrap';

  const nameEl = document.createElement('div');
  nameEl.className = 'team-name';
  nameEl.textContent = team.name;

const drinksEl = document.createElement('div');
drinksEl.className = 'drinks';

const parts = [];

for (const [d, c] of Object.entries(team.drinks || {})) {
  if (!c) continue;

  const file = ICON_MAP[d];
  if (!file) continue;

  parts.push(`
    <span class="drink-item">
      <img src="images/${file}">
      <span>${c}</span>
    </span>
  `);
}

drinksEl.innerHTML = parts.join('<span class="mid-dot">·</span>');


  nameWrap.appendChild(nameEl);
  nameWrap.appendChild(drinksEl);
  left.appendChild(platzEl);
  left.appendChild(nameWrap);

  const right = document.createElement('div');
  right.className = 'right';
  const pts = document.createElement('div');
  pts.className = 'points';
  pts.innerHTML = `${team.punkte} <small>PKT</small>`;
  right.appendChild(pts);

  row.appendChild(left);
  row.appendChild(right);
  return row;
}

// -----------------------------------------------------
// render scoreboard (UNVERÄNDERT)
// -----------------------------------------------------
function renderStatic(){
  TEAMS.sort((a,b) => (b.punkte||0) - (a.punkte||0));
  TEAMS.forEach((t,i) => t.platz = i+1);

  const top3El = $id('top3');
  const marqueeTrack = $id('marqueeTrack');

  top3El.innerHTML = '';
  TEAMS.slice(0,3).forEach(t => top3El.appendChild(createRow(t,true)));

  marqueeTrack.innerHTML = '';
  TEAMS.slice(3).forEach(t => marqueeTrack.appendChild(createRow(t,false)));

  startMarqueeIfNeeded();
}

// -----------------------------------------------------
// scoreboard bounds between masks
// -----------------------------------------------------
function updateScoreboardBounds(){
  const leftMask  = document.querySelector('.mask-left');
  const rightMask = document.querySelector('.mask-right');
  const board = document.getElementById('scoreboard');
  if(!board) return;

  // Fallback falls Masken fehlen
  if(!leftMask || !rightMask){
    board.style.left = '50%';
    board.style.transform = 'translateX(-50%)';
    board.style.width = '90vw';
    return;
  }

  const leftW  = leftMask.offsetWidth;
  const rightW = rightMask.offsetWidth;

  const freeWidth = window.innerWidth - leftW - rightW;

  board.style.left = leftW + 'px';
  board.style.width = freeWidth + 'px';
  board.style.transform = 'none';
}


// =========================
// MARQUEE – SPRUNGFREI (FINAL & KORREKT)
// =========================

const MARQUEE_SPEED_PX_S = 30;
const MARQUEE_PAUSE_MS = 3000;
const FADE_MS = 400;

// 🔒 persistenter Zustand (WICHTIG)
let marqueeY = 0;
let marqueeState = "PAUSE_TOP";
let marqueeStateUntil = 0;
let marqueeLastTime = null;

let marqueeRAF = null;
window.marqueeActive = false;

function startMarqueeIfNeeded() {
  if (window.marqueeActive) return;

  const viewport = document.getElementById("marqueeViewport");
  const track = document.getElementById("marqueeTrack");
  if (!viewport || !track) return;

  const viewportH = viewport.clientHeight;
  const contentH = track.scrollHeight;

  // kein Overflow → kein Marquee
  if (contentH <= viewportH + 2) {
    resetMarqueeVisual(track);
    return;
  }

  window.marqueeActive = true;

  const maxOffset = contentH - viewportH;

  let y = marqueeY;
  let lastTime = marqueeLastTime;
  let state = marqueeState || "PAUSE_TOP";
  let stateUntil = marqueeStateUntil || (performance.now() + MARQUEE_PAUSE_MS);

  function raf(ts) {
    if (!window.marqueeActive) return;

    if (!lastTime) lastTime = ts;
    const dt = (ts - lastTime) / 1000;
    lastTime = ts;

    // ───── PAUSE ─────
    if (state === "PAUSE_TOP" || state === "PAUSE_BOTTOM") {
      if (ts >= stateUntil) {
        state = state === "PAUSE_TOP" ? "SCROLL" : "FADE_OUT";
      }
      persist();
      marqueeRAF = requestAnimationFrame(raf);
      return;
    }

    // ───── SCROLL ─────
    if (state === "SCROLL") {
      y += MARQUEE_SPEED_PX_S * dt;

      if (y >= maxOffset) {
        y = maxOffset;
        state = "PAUSE_BOTTOM";
        stateUntil = ts + MARQUEE_PAUSE_MS;
      }

      track.style.transform = `translateY(${-y}px)`;
      persist();
      marqueeRAF = requestAnimationFrame(raf);
      return;
    }

    // ───── FADE / RESET (NUR HIER!) ─────
    if (state === "FADE_OUT") {
      state = "LOCKED";
      persist();

      track.classList.add("fade-out");

      setTimeout(() => {
        track.classList.add("marquee-hidden");

        // 🔥 RESET nur beim Loop-Ende
        y = 0;
        track.style.transform = "translateY(0)";

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            track.classList.remove("fade-out");
            track.classList.remove("marquee-hidden");
            track.classList.add("fade-in");

            setTimeout(() => {
              track.classList.remove("fade-in");
              lastTime = null;
              state = "PAUSE_TOP";
              stateUntil = performance.now() + MARQUEE_PAUSE_MS;
              persist();
              marqueeRAF = requestAnimationFrame(raf);
            }, FADE_MS);
          });
        });
      }, FADE_MS);

      return;
    }
  }

  function persist() {
    marqueeY = y;
    marqueeState = state;
    marqueeStateUntil = stateUntil;
    marqueeLastTime = lastTime;
  }

  marqueeRAF = requestAnimationFrame(raf);
}

function stopMarquee() {
  // ❗ KEIN RESET → nur pausieren
  window.marqueeActive = false;
  if (marqueeRAF) cancelAnimationFrame(marqueeRAF);
  marqueeRAF = null;
}

function resetMarqueeVisual(track) {
  marqueeY = 0;
  marqueeState = "PAUSE_TOP";
  marqueeStateUntil = performance.now() + MARQUEE_PAUSE_MS;
  marqueeLastTime = null;

  if (track) {
    track.style.transform = "translateY(0)";
    track.classList.remove("fade-out", "fade-in", "marquee-hidden");
  }
}



/* ===================================================== */

window.addEventListener("load", renderStatic);
window.addEventListener("resize", startMarqueeIfNeeded);

window.addEventListener('load', () => {
  renderStatic();
  updateScoreboardBounds();
});

window.addEventListener('resize', () => {
  updateScoreboardBounds();
  startMarqueeIfNeeded();
});

window.socket = io();

socket.on("updateScores", teamsFromDB => {
  // DB → Scoreboard-Format umwandeln
  TEAMS = teamsFromDB.map(t => ({
    name: t.name,
    punkte: t.points,
    drinks: t.drinks || {}
  }));

  renderStatic();
});

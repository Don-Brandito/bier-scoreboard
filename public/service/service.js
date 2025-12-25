// ===================================================================
// service.js - Storno (Variante A) + stabile Kachel-UI
// ===================================================================

// Socket global verwenden
if (typeof io !== "undefined") {
  window.socket = io("https://bier-scoreboard-backend.onrender.com");
}
const socket = window.socket; // lokale Referenz darauf

if (!socket) {
  console.warn("⚠️ Socket.IO nicht gefunden – Service läuft im Demo-Modus.");
}


// ----------------- Konfiguration -----------------------------------
const drinkOrder = [
  "Bier","Radler","Cocktail-Longdrink","Wein",
  "Wein-Flasche","Weizen","Colaweizen","Shot",
  "Sekt","Sekt-Flasche"
];

const drinkIcons = {
  "Bier":"../images/Bier.svg",
  "Radler":"../images/Radler.svg",
  "Weizen":"../images/Weizen.svg",
  "Colaweizen":"../images/Colaweizen.svg",
  "Cocktail-Longdrink":"../images/Cocktail-Longdrink.svg",
  "Shot":"../images/Shot.svg",
  "Wein":"../images/Wein.svg",
  "Sekt":"../images/Sekt.svg",
  "Wein-Flasche":"../images/Flasche-Wein.svg",
  "Sekt-Flasche":"../images/Flasche-Sekt.svg"
};

const pointsMeta = {
  "Bier":3, "Radler":2, "Weizen":3,
  "Colaweizen":2, "Cocktail-Longdrink":5,
  "Shot":1, "Wein":2, "Sekt":2,
  "Wein-Flasche":8, "Sekt-Flasche":8
};

// ----------------- State -------------------------------------------
const counts = {};         // normale Buchungen (positive)
const stornoCounts = {};   // im Storno-Modus gesammelte Abzüge (positive numbers; werden als minus gesendet)
drinkOrder.forEach(d => { counts[d]=0; stornoCounts[d]=0; });

let selectedTeam = "";
let stornoMode = false;

document.addEventListener("DOMContentLoaded", () => {

// ----------------- DOM Refs ---------------------------------------
const drinkContainer = document.getElementById("drinkContainer");
const totalPointsEl = document.getElementById("totalPoints");
const sendOrderBtn = document.getElementById("sendOrder");
const resetOrderBtn = document.getElementById("resetOrder");
const stornoBtn = document.getElementById("toggleStorno");
const stornoIndicator = document.getElementById("stornoIndicator");
const teamNameInput = document.getElementById("teamNameInput");
const drinksGrid = document.getElementById("drinksGrid");
const teamPopup = document.getElementById("teamPopup");
const cancelTeam = document.getElementById("cancelTeam");
const saveTeam = document.getElementById("saveTeam");
const addTeamBtn = document.getElementById("addTeamBtn");

const editTeamBtn = document.getElementById("editTeamBtn");
const teamEditPopup = document.getElementById("teamEditPopup");
const currentTeamName = document.getElementById("currentTeamName");
const editTeamName = document.getElementById("editTeamName");
const deleteTeamPassword = document.getElementById("deleteTeamPassword");
const cancelEditTeam = document.getElementById("cancelEditTeam");
const renameTeamBtn = document.getElementById("renameTeamBtn");
const deleteTeamBtn = document.getElementById("deleteTeamBtn");
const resetAllBtn = document.getElementById("resetAllBtn");
const eventResetPopup = document.getElementById("eventResetPopup");
const cancelEventReset = document.getElementById("cancelEventReset");
const confirmEventReset = document.getElementById("confirmEventReset");
const eventResetPassword = document.getElementById("eventResetPassword");

document.getElementById("cancelTeam").addEventListener("click", () => {
  document.getElementById("teamPopup").classList.add("hidden");
});

document.getElementById("addTeamBtn").addEventListener("click", () => {
  const popup = document.getElementById("teamPopup");
  const input = document.getElementById("teamNameInput");

  input.value = "";              // ← DAS fehlte
  popup.classList.remove("hidden");
});


// ================================
// Info-Popup (ein OK-Button)
// ================================
// Info-Popup (OK-Button, kein Passwort)
function showOrderConfirm({ title, text, onOk, danger = false }) {
  const overlay = document.getElementById("orderInfoOverlay");
  const popupContent = overlay.querySelector(".popup-content");
  popupContent.classList.toggle("danger", danger);

  document.getElementById("orderInfoTitle").textContent = title;
  document.getElementById("orderInfoText").textContent = text;

  const btnContainer = popupContent.querySelector(".popup-buttons");
  btnContainer.innerHTML = `<button id="orderInfoOk" class="btn primary">OK</button>`;

  overlay.classList.remove("hidden");

  document.getElementById("orderInfoOk").onclick = () => {
    overlay.classList.add("hidden");
    onOk?.();
  };
}

// Passwort-Popup (Confirm + Cancel)
function showPasswordPopup({ title, text, onConfirm, onCancel, confirmText = "OK", cancelText = "Abbrechen" }) {
  const overlay = document.getElementById("passwordOverlay");
  document.getElementById("passwordOverlayTitle").textContent = title;
  document.getElementById("passwordOverlayText").textContent = text;
  const input = document.getElementById("passwordOverlayInput");
  input.value = "";

  const btnConfirm = document.getElementById("passwordOverlayConfirm");
  const btnCancel = document.getElementById("passwordOverlayCancel");
  btnConfirm.textContent = confirmText;
  btnCancel.textContent = cancelText;

  overlay.classList.remove("hidden");

  btnConfirm.onclick = () => {
    const password = input.value.trim();
    overlay.classList.add("hidden");
    onConfirm?.(password);
  };

  btnCancel.onclick = () => {
    overlay.classList.add("hidden");
    onCancel?.();
  };
}


// ================================
// Confirm-Popup (Bestätigen + Abbrechen)
// ================================
function showConfirmPopup({ title, text, onConfirm, onCancel, confirmText = "OK", cancelText = "Abbrechen", danger = false }) {
  const overlay = document.getElementById("orderInfoOverlay");
  const popupContent = overlay.querySelector(".popup-content");
  popupContent.classList.toggle("danger", danger);

  document.getElementById("orderInfoTitle").textContent = title;
  document.getElementById("orderInfoText").textContent = text;

  const btnContainer = popupContent.querySelector(".popup-buttons");
  btnContainer.innerHTML = `
    <button id="confirmBtn" class="btn primary">${confirmText}</button>
    <button id="cancelBtn" class="btn secondary">${cancelText}</button>
  `;

  overlay.classList.remove("hidden");

  document.getElementById("confirmBtn").onclick = () => {
    overlay.classList.add("hidden");
    onConfirm?.();
  };
  document.getElementById("cancelBtn").onclick = () => {
    overlay.classList.add("hidden");
    onCancel?.();
  };
}




// ================================
// Event Reset
// ================================
resetAllBtn.addEventListener("click", () => {
  eventResetPassword.value = ""; // Passwortfeld leeren
  eventResetPopup.classList.remove("hidden");
});

cancelEventReset.addEventListener("click", () => {
  eventResetPopup.classList.add("hidden");
});

confirmEventReset.addEventListener("click", async () => {
  const password = eventResetPassword.value.trim();
  if (!password) {
    showOrderConfirm({ title: "Fehler", text: "Bitte Passwort eingeben", danger: true });
    return;
  }

  try {
   const res = await fetch(`${API_BASE}/api/admin/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    if (res.ok) {
      eventResetPopup.classList.add("hidden");
      showOrderConfirm({
        title: "Erfolg",
        text: "✅ Alle Teams wurden zurückgesetzt",
        onOk: () => { /* nur schließen */ }
      });
    } else {
      showOrderConfirm({
        title: "Fehler",
        text: "❌ Falsches Passwort",
        danger: true,
        onOk: () => {
          eventResetPassword.value = "";
          eventResetPopup.classList.remove("hidden");
        }
      });
    }
  } catch (err) {
    console.error(err);
    showOrderConfirm({ title: "Fehler", text: "❌ Fehler beim Reset", danger: true });
  }
});


// -----------------------------------------------------
// Team bearbeiten Popup (Vereinfachte Variante)
// -----------------------------------------------------
 // ----------------- Team hinzufügen -----------------
addTeamBtn.addEventListener("click", () => {
  teamPopup.classList.remove("hidden"); // bleibt unverändert
});

cancelEditTeam.addEventListener("click", () => {
  teamEditPopup.classList.add("hidden");
});


saveTeam.addEventListener("click", async () => {
  const name = teamNameInput.value.trim();
  if (!name) return;

  await fetch(`${API_BASE}/api/addTeam`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });

  teamPopup.classList.add("hidden");
});


  // ----------------- Team bearbeiten Popup -----------------
editTeamBtn.addEventListener("click", () => {
  if (!selectedTeam) {
    showOrderConfirm({
      title: "Fehler",
      text: "Bitte zuerst ein Team auswählen.",
      danger: true
    });
    return;
  }

  teamEditPopup.dataset.team = selectedTeam;
  currentTeamName.textContent = selectedTeam;
  editTeamName.value = selectedTeam;

  teamEditPopup.classList.remove("hidden");
});

renameTeamBtn.addEventListener("click", async () => {
  const oldName = teamEditPopup.dataset.team;
  const newName = editTeamName.value.trim();
  if (!oldName || !newName || oldName === newName) return;

  const res = await fetch(`${API_BASE}/api/renameTeam`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ oldName, newName })
  });

  if (!res.ok) {
    showOrderConfirm({ title: "Fehler", text: "Fehler beim Umbennen", danger: true });
    return;
  }

  teamEditPopup.classList.add("hidden");
});



// ================================
// Team löschen
// ================================
deleteTeamBtn.addEventListener("click", async () => {
  const team = teamEditPopup.dataset.team;
  const password = deleteTeamPassword.value.trim();

  if (!team) {
    showOrderConfirm({ title: "Fehler", text: "Bitte zuerst ein Team auswählen.", danger: true });
    return;
  }

  if (!password) {
    showOrderConfirm({ title: "Fehler", text: "Bitte Passwort eingeben", danger: true });
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/deleteTeam`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: team, password })
    });

    if (res.ok) {
      teamEditPopup.classList.add("hidden");
      selectedTeam = "";
      deleteTeamPassword.value = "";

      showOrderConfirm({
        title: "Erfolg",
        text: `✅ Team "${team}" wurde gelöscht`,
        onOk: () => { /* nur schließen */ }
      });
    } else {
      showOrderConfirm({
        title: "Fehler",
        text: "❌ Falsches Passwort",
        danger: true,
        onOk: () => {
          // Passwortfeld wieder im selben Popup nutzen
          deleteTeamPassword.value = "";
          teamEditPopup.classList.remove("hidden");
        }
      });
    }
  } catch (err) {
    console.error(err);
    showOrderConfirm({ title: "Fehler", text: "❌ Fehler beim Löschen", danger: true });
  }
});



// ================================
// Passwörter
// ================================
function showPasswordConfirmPopup({ title, text, danger = false, confirmText = "OK", cancelText = "Abbrechen", onConfirm }) {
  const overlay = document.getElementById("orderInfoOverlay");
  const popupContent = overlay.querySelector(".popup-content");

  popupContent.classList.toggle("danger", danger);

  // Setze Titel und Text
  document.getElementById("orderInfoTitle").textContent = title;
  document.getElementById("orderInfoText").textContent = text;

  // Passwortfeld nur einmal erzeugen
  let pwInput = popupContent.querySelector("#popupPasswordInput");
  if (!pwInput) {
    pwInput = document.createElement("input");
    pwInput.type = "password";
    pwInput.id = "popupPasswordInput";
    pwInput.placeholder = "Admin-Passwort eingeben";
    pwInput.style.width = "100%";
    pwInput.style.margin = "10px 0";
    popupContent.insertBefore(pwInput, popupContent.querySelector(".popup-buttons"));
  }
  pwInput.value = "";

  // Buttons: Confirm + Cancel
  const btnContainer = popupContent.querySelector(".popup-buttons");
  btnContainer.innerHTML = `
    <button id="confirmBtn" class="btn primary">${confirmText}</button>
    <button id="cancelBtn" class="btn secondary">${cancelText}</button>
  `;

  overlay.classList.remove("hidden");

  document.getElementById("confirmBtn").onclick = async () => {
    const password = pwInput.value.trim();
    const ok = await onConfirm(password); // onConfirm liefert true wenn erfolgreich
    if (ok) {
      // Passwort korrekt → Input entfernen
      pwInput.value = "";
      pwInput.style.display = "none";
    }
  };

  document.getElementById("cancelBtn").onclick = () => {
    overlay.classList.add("hidden");
    pwInput.value = "";
  };
}



// === TEAMLISTE LINKS ===

function updateTeamList(teams) {
  const ul = document.getElementById("teamList");
  ul.innerHTML = "";

  teams.forEach(teamObj => {
    const li = document.createElement("li");

    // Annahme: teamObj = { id: "...", name: "..." }
    li.textContent = teamObj.name;

    li.addEventListener("click", () => {
      selectedTeam = teamObj.name;
      document.querySelectorAll("#teamList li").forEach(x => x.classList.remove("active"));
      li.classList.add("active");
    });

    ul.appendChild(li);
  });
}


function renderTeams(list) {
  if (!Array.isArray(list)) return;

  list.sort((a, b) =>
  a.name.localeCompare(b.name, "de", { sensitivity: "base" })
  );

  updateTeamList(list);
}

// safe id for element ids
function safeId(name){ return name.replace(/\W+/g,"_"); }

// ----------------- Helpers ----------------------------------------
function getPoints(drink){
  return pointsMeta[drink] ?? 0;
}

function computeNormalTotal(){
  let sum = 0;
  for (const d of drinkOrder) sum += (counts[d]||0) * getPoints(d);
  return sum;
}
function computeStornoTotal(){
  let sum = 0;
  for (const d of drinkOrder) sum += (stornoCounts[d]||0) * getPoints(d);
  return sum;
}
function computeDisplayedTotal(){
  return computeNormalTotal() - computeStornoTotal();
}

// ----------------- Render Tiles ----------------------------------
function createDrinkTiles(){
  drinksGrid.innerHTML = "";
  drinkOrder.forEach(drink => {
    const tile = document.createElement("article");
    tile.className = "drink-tile";
    tile.dataset.drink = drink;

    // icon
    const iconWrap = document.createElement("div");
    iconWrap.className = "icon";
    const img = document.createElement("img");
    img.src = drinkIcons[drink] ?? "../images/default.svg";
    img.alt = drink;
    iconWrap.appendChild(img);

    // name
    const nameEl = document.createElement("div");
    nameEl.className = "name";
    nameEl.textContent = drink;

    // points label
    const pts = document.createElement("div");
    pts.className = "points";
    pts.textContent = `${getPoints(drink)} PKT`;

    // counter visual
    const counter = document.createElement("div");
    counter.className = "counter-visual";
    counter.id = `counter-${safeId(drink)}`;
    counter.textContent = "0";

    // click
    tile.addEventListener("click", () => {
      if (!stornoMode) counts[drink] += 1;
      else stornoCounts[drink] += 1;

      updateTile(drink);
      updateTotal();
    });

    // assemble (controls entfernt)
    tile.append(iconWrap, nameEl, pts, counter);

    // ❗ KORREKT
    drinksGrid.appendChild(tile);
  });

  // storno style
  document.querySelectorAll(".drink-tile").forEach(t => {
    t.classList.toggle("storno-active", stornoMode);
  });

  // init update
  drinkOrder.forEach(d => updateTile(d));
}


// Update one tile's counter text
function updateTile(drink){
  const el = document.getElementById(`counter-${safeId(drink)}`);
  if (!el) return;
  if (!stornoMode) {
    el.textContent = `${counts[drink] || 0}`;
    el.style.color = "#222";
  } else {
    // show storno counts (as positive number) but style as negative
    const v = stornoCounts[drink] || 0;
    el.textContent = `-${v}`;
    el.style.color = "#ffdddd";
  }
}

// Update total display
function updateTotal(){
  const displayed = computeDisplayedTotal();
  totalPointsEl.textContent = displayed;
  // colorize if negative
  if (computeStornoTotal() > 0) {
    totalPointsEl.style.color = "#ffaaaa";
  } else {
    totalPointsEl.style.color = "";
  }
}


// optional: receive teams from server
if (socket) {
  socket.emit("requestTeams");
socket.on("updateScores", teams => {
  renderTeams(teams);
});
}

// ----------------- Storno toggle -------------------------------------
stornoBtn.addEventListener("click", () => {
  stornoMode = !stornoMode;
  stornoIndicator.classList.toggle("hidden", !stornoMode);

  // 🔥 IMMER resetten – egal in welche Richtung
  drinkOrder.forEach(d => {
    counts[d] = 0;
    stornoCounts[d] = 0;
  });

  document.querySelectorAll(".drink-tile").forEach(t =>
    t.classList.toggle("storno-active", stornoMode)
  );

  updateAllTiles();
  updateTotal();
});



// ----------------- Reset ----------------------------------------------
resetOrderBtn.addEventListener("click", () => {
  // Clear both normal and storno selections
  drinkOrder.forEach(d => { counts[d]=0; stornoCounts[d]=0; });
  // exit storno mode to avoid confusion
  stornoMode = false;
  stornoIndicator.classList.add("hidden");
  document.querySelectorAll(".drink-tile").forEach(t => t.classList.remove("storno-active"));
  updateAllTiles();
  updateTotal();
});

// ----------------- Send order -----------------------------------------
sendOrderBtn.addEventListener("click", () => {
if (!selectedTeam) {
  showOrderConfirm({
    title: "Fehler",
    text: "Bitte zuerst ein Team wählen.",
    danger: true
  });
  return;
}


  // Build items and total according to mode:
  if (!stornoMode) {
    // normal order: send positive counts only (non-zero)
    const items = {};
    let total = 0;
    for (const d of drinkOrder) {
      const q = counts[d] || 0;
      if (q) {
        items[d] = q;
        total += q * getPoints(d);
      }
    }
    if (Object.keys(items).length === 0) { alert("Keine Auswahl."); return; }

    const payload = {
      team: selectedTeam,
      items,
      total,
      when: new Date().toISOString()
    };

    console.log("SENDE serviceOrder:", payload);
    if (socket) socket.emit("serviceOrder", payload);
    else console.log("SEND (no socket):", payload);

    // reset local after send
    drinkOrder.forEach(d => counts[d]=0);
    updateAllTiles();
    updateTotal();
showOrderConfirm({
  title: "Punkte gebucht",
  text: `${total} Punkte für Team ${selectedTeam}`,
  okText: "OK",
  danger: false
});


  } else {
    // storno mode: send negative items/negative total (Variante A)
    const items = {};
    let total = 0;
    for (const d of drinkOrder) {
      const q = stornoCounts[d] || 0;
      if (q) {
        items[d] = -q; // negative quantities
        total -= q * getPoints(d); // become negative
      }
    }
    if (Object.keys(items).length === 0) { alert("Keine Storno-Auswahl."); return; }

    const payload = {
      team: selectedTeam,
      items,
      total,                // already negative
      storno: true,
      when: new Date().toISOString()
    };

    console.log("SENDE serviceStorno:", payload);
    if (socket) socket.emit("serviceStorno", payload);
    else console.log("STORNO (no socket):", payload);

    // reset storno state after sending
showOrderConfirm({
  title: "Storno gesendet",
  text: `-${Math.abs(total)} Punkte für Team ${selectedTeam}`,
  onOk: () => {
    // reset storno state AFTER popup
    drinkOrder.forEach(d => stornoCounts[d] = 0);
    stornoMode = false;
    stornoIndicator.classList.add("hidden");
    document.querySelectorAll(".drink-tile")
      .forEach(t => t.classList.remove("storno-active"));

    updateAllTiles();
    updateTotal();
  }
});



  }
});


// ----------------- UI helpers ----------------------------------------
function updateAllTiles(){
  drinkOrder.forEach(d => updateTile(d));
}

// ----------------- Init ----------------------------------------------
createDrinkTiles();
updateTotal();

// Lokale Testteams (optional)
//const arrayOfTeams = [
//  { id: "t01", name: "Durstkönige" },
//  { id: "t02", name: "Hopfenhelden" },
//  { id: "t03", name: "Bierathleten" },
//  { id: "t04", name: "Die Schaumkrieger" },
//  { id: "t05", name: "Zapfsturm" },
//  { id: "t06", name: "Pils-Piraten" },
//  { id: "t07", name: "Weizenwölfe" },
//  { id: "t08", name: "Colaweizen-Commandos" },
//  { id: "t09", name: "Shot-Soldiers" },
//  { id: "t10", name: "Wein-Wanderer" },
//  { id: "t11", name: "Sekt-Sprinter" },
//  { id: "t12", name: "Flaschenflitzer" },
//  { id: "t13", name: "Bar-Berserker" },
//  { id: "t14", name: "DieUnschlagbarenXXL" },
//  { id: "t15", name: "DieLegendärenBierfreunde" }
//];



// Optional: expose for debugging in console
window._service_debug = { counts, stornoCounts, computeNormalTotal, computeStornoTotal, computeDisplayedTotal };

const input = document.getElementById("teamNameInput");
input.addEventListener("input", () => {
    if (input.value.length > 20) {
        input.value = input.value.substring(0, 20);
    }
});

const API_BASE = "https://bier-scoreboard-backend.onrender.com";

fetch(`${API_BASE}/api/teams`)
  .then(res => res.json())
  .then(teams => {
    renderTeams(teams);
    updateTeamList(teams);
  })
  .catch(err => console.error("Teams laden fehlgeschlagen", err));


})
